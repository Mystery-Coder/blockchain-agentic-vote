import { auth } from "@/auth";
import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});
import { z } from "zod";
import fs from "fs";
import path from "path";
import { hasVoterVotedOnChain } from "@/lib/blockchain";
import { pushVote, hasVoterInBuffer } from "@/lib/redis";
import { processBatch } from "@/actions/batch";

interface CandidateRecord {
  id: number;
  name: string;
  party: string;
  symbol: string;
  constituency: string;
  manifesto_summary: string;
}

function loadCandidates(): CandidateRecord[] {
  const candidatesPath = path.join(process.cwd(), "data", "candidates.json");
  return JSON.parse(fs.readFileSync(candidatesPath, "utf-8"));
}

const AGENT_SYSTEM_PROMPT = `You are a neutral, non-partisan voting assistant for the Blockchain Agentic Vote platform. Your role is to help voters navigate the ballot and cast their vote. You MUST follow these rules absolutely:

1. NEUTRALITY: Never express preference for any candidate or party. Never use persuasive, positive, or negative language about any candidate. Present all candidates with equal tone and detail.

2. ACCESSIBILITY: Speak clearly and concisely. Use simple language. When reading the ballot, number each candidate clearly. Pause between candidates. Ask if the voter wants any information repeated.

3. STRICT CONFIRMATION PROTOCOL:
   a. When the voter indicates a choice, call prepare_vote with the candidate ID.
   b. Read back: "You have selected [Candidate Name] from [Party Name], candidate number [X]. Please say 'CONFIRM' to cast your vote, or 'CANCEL' to go back to the ballot."
   c. ONLY call confirm_and_submit if the voter explicitly says "Confirm."
   d. If the voter says anything other than "Confirm," return to the ballot.
   e. Never auto-confirm. Never assume intent.

4. PRIVACY: Never ask the voter to reveal who they are voting for to anyone else. Never store or repeat the voter's choice after submission.

5. SCOPE: You can ONLY use the provided tools. You cannot access the internet, make calculations, or provide information beyond what the tools return. If asked about anything outside voting, respond: "I can only assist with the voting process."

6. ERROR HANDLING: If a tool call fails, explain the error simply and offer to retry.`;

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.voterHash) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages: uiMessages } = await req.json();
  const { voterHash, constituency } = session.user;

  // Convert UIMessages (parts-based) to ModelMessages (content-based) for streamText
  const messages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: openrouter.chat(process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001"),
    system: AGENT_SYSTEM_PROMPT,
    messages,
    stopWhen: stepCountIs(10),
    tools: {
      read_ballot: {
        description:
          "Retrieves the complete list of candidates for the voter's constituency. Call this at the start of the voting process or when the voter asks to hear the ballot.",
        inputSchema: z.object({
          constituencyId: z
            .string()
            .describe("The constituency ID from the voter's session"),
        }),
        execute: async ({ constituencyId }: { constituencyId: string }) => {
          const allCandidates = loadCandidates();
          const candidates = allCandidates
            .filter((c) => c.constituency === (constituencyId || constituency))
            .map((c) => ({
              id: c.id,
              name: c.name,
              party: c.party,
              symbol: c.symbol,
            }));

          return {
            candidates,
            totalCandidates: candidates.length,
            constituency: constituencyId || constituency,
          };
        },
      },

      get_candidate_info: {
        description:
          "Retrieves detailed information about a specific candidate including name, party, symbol, and a neutral manifesto summary.",
        inputSchema: z.object({
          candidateId: z
            .number()
            .int()
            .positive()
            .describe("The numeric ID of the candidate"),
        }),
        execute: async ({ candidateId }: { candidateId: number }) => {
          const allCandidates = loadCandidates();
          const candidate = allCandidates.find((c) => c.id === candidateId);

          if (!candidate) {
            return { error: `Candidate with ID ${candidateId} not found.` };
          }

          return {
            id: candidate.id,
            name: candidate.name,
            party: candidate.party,
            symbol: candidate.symbol,
            manifesto_summary: candidate.manifesto_summary,
            constituency: candidate.constituency,
          };
        },
      },

      prepare_vote: {
        description:
          "Stages a vote for the specified candidate. This does NOT submit the vote. Returns a confirmation prompt that MUST be read to the voter verbatim.",
        inputSchema: z.object({
          candidateId: z
            .number()
            .int()
            .positive()
            .describe("The numeric ID of the chosen candidate"),
        }),
        execute: async ({ candidateId }: { candidateId: number }) => {
          const allCandidates = loadCandidates();
          const candidate = allCandidates.find((c) => c.id === candidateId);

          if (!candidate) {
            return {
              staged: false,
              error: `Candidate ${candidateId} not found.`,
            };
          }

          try {
            const alreadyVoted = await hasVoterVotedOnChain(voterHash);
            if (alreadyVoted) {
              return {
                staged: false,
                error: "You have already cast your vote.",
              };
            }
          } catch {
            return {
              staged: false,
              error: "Unable to verify voting status. Please try again.",
            };
          }

          return {
            staged: true,
            candidateId: candidate.id,
            candidateName: candidate.name,
            partyName: candidate.party,
            confirmation_text: `You have selected ${candidate.name} from ${candidate.party}, candidate number ${candidate.id}. Please say 'CONFIRM' to cast your vote, or 'CANCEL' to go back to the ballot.`,
          };
        },
      },

      confirm_and_submit: {
        description:
          "Submits the staged vote to the batching queue. ONLY call this tool after the voter has explicitly said the word 'Confirm'.",
        inputSchema: z.object({
          candidateId: z
            .number()
            .int()
            .positive()
            .describe("The candidate ID that was staged"),
          voterConfirmation: z
            .literal("CONFIRMED")
            .describe(
              "Must be 'CONFIRMED' — set this only if the voter explicitly said Confirm"
            ),
        }),
        execute: async ({ candidateId }: { candidateId: number; voterConfirmation: "CONFIRMED" }) => {
          try {
            const alreadyVoted = await hasVoterVotedOnChain(voterHash);
            if (alreadyVoted) {
              return {
                success: false,
                message: "You have already cast your vote.",
              };
            }
          } catch {
            return {
              success: false,
              message: "Unable to verify voting status. Please try again.",
            };
          }

          // Check buffer for pending vote
          const inBuffer = await hasVoterInBuffer(constituency, voterHash);
          if (inBuffer) {
            return {
              success: false,
              message: "Your vote is already pending in the anonymity pool.",
            };
          }

          let bufferLength: number;
          try {
            bufferLength = await pushVote(constituency, {
              voterHash,
              candidateId,
              timestamp: Date.now(),
            });
          } catch (error) {
            if (error instanceof Error && error.message.includes("DUPLICATE_VOTE")) {
              return {
                success: false,
                message: "Your vote is already pending. Please wait for batch processing.",
              };
            }
            return {
              success: false,
              message: "Failed to submit vote. Please try again.",
            };
          }

          const threshold = parseInt(
            process.env.BATCH_THRESHOLD || "5",
            10
          );

          if (bufferLength >= threshold) {
            processBatch(constituency).catch((err: unknown) =>
              console.error("Batch processing failed:", err)
            );
          }

          return {
            success: true,
            message:
              "Your vote has been securely submitted to the anonymity pool. Thank you for voting.",
          };
        },
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
