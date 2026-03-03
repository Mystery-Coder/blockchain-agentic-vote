import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Candidate {
  id: number;
  name: string;
  party: string;
  symbol: string;
  constituency: string;
  manifesto_summary: string;
}

export async function GET() {
  try {
    // Load candidates
    const candidatesPath = path.join(process.cwd(), "data", "candidates.json");
    const candidates: Candidate[] = JSON.parse(
      fs.readFileSync(candidatesPath, "utf-8")
    );

    // Try to get blockchain data
    let totalVotes = 0;
    let electionState = 0;
    const candidateResults = candidates.map((c) => ({
      id: c.id,
      name: c.name,
      party: c.party,
      symbol: c.symbol,
      constituency: c.constituency,
      votes: 0,
    }));

    try {
      // Dynamic import to avoid issues when hardhat isn't running
      const { getReadOnlyContract, getTotalVotesCast, getElectionState } =
        await import("@/lib/blockchain");

      const contract = getReadOnlyContract();
      electionState = await getElectionState();
      totalVotes = Number(await getTotalVotesCast());

      // Fetch individual candidate vote counts
      for (const candidate of candidateResults) {
        try {
          const count = await contract.getVoteCount(candidate.id);
          candidate.votes = Number(count);
        } catch {
          // Candidate might not have been registered
          candidate.votes = 0;
        }
      }
    } catch (error) {
      // Blockchain not available — return zero counts
      console.log("Blockchain not available for results:", error instanceof Error ? error.message : "Unknown error");
    }

    return NextResponse.json({
      candidates: candidateResults,
      totalVotes,
      electionState,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}
