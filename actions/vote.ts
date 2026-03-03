"use server";

import { auth } from "@/auth";
import { hasVoterVotedOnChain } from "@/lib/blockchain";
import { pushVote, getBufferLength, hasVoterInBuffer } from "@/lib/redis";
import { processBatch } from "@/actions/batch";
import { z } from "zod";

const submitVoteSchema = z.object({
  candidateId: z.number().int().positive(),
});

export interface VoteResult {
  success: boolean;
  message: string;
  batchTriggered?: boolean;
}

/**
 * Submit a vote to the anonymity buffer.
 * The vote is NOT immediately recorded on-chain — it waits in the buffer
 * until the batch threshold is reached, then gets shuffled and submitted.
 */
export async function submitVote(candidateId: number): Promise<VoteResult> {
  // 1. Validate session
  const session = await auth();
  if (!session?.user?.voterHash) {
    return { success: false, message: "Not authenticated. Please log in." };
  }

  // 2. Validate input
  const parsed = submitVoteSchema.safeParse({ candidateId });
  if (!parsed.success) {
    return { success: false, message: "Invalid candidate ID." };
  }

  const { voterHash, constituency } = session.user;

  // 3. Check on-chain if already voted
  try {
    const alreadyVoted = await hasVoterVotedOnChain(voterHash);
    if (alreadyVoted) {
      return {
        success: false,
        message: "You have already cast your vote.",
      };
    }
  } catch (error) {
    console.error("Blockchain check failed:", error);
    return {
      success: false,
      message:
        "Unable to verify voting status. Is the Hardhat node running?",
    };
  }

  // 4. Check if already in buffer (between on-chain batches)
  const inBuffer = await hasVoterInBuffer(constituency, voterHash);
  if (inBuffer) {
    return {
      success: false,
      message: "Your vote is already pending in the anonymity pool. Please wait for batch processing.",
    };
  }

  // 5. Push to buffer
  let bufferLength: number;
  try {
    bufferLength = await pushVote(constituency, {
      voterHash,
      candidateId: parsed.data.candidateId,
      timestamp: Date.now(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("DUPLICATE_VOTE")) {
      return {
        success: false,
        message: "Your vote is already pending. Please wait for batch processing.",
      };
    }
    throw error;
  }

  // 5. Check if batch threshold reached
  const threshold = parseInt(process.env.BATCH_THRESHOLD || "5", 10);
  let batchTriggered = false;

  if (bufferLength >= threshold) {
    // Trigger batch processing asynchronously
    processBatch(constituency).catch((err) =>
      console.error("Batch processing failed:", err)
    );
    batchTriggered = true;
  }

  return {
    success: true,
    message: batchTriggered
      ? "Vote submitted! Batch is being processed for maximum anonymity."
      : `Vote submitted to anonymity pool. Waiting for more votes (${bufferLength}/${threshold}) before batch processing.`,
    batchTriggered,
  };
}
