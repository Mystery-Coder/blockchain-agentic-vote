import { NextResponse } from "next/server";
import {
  getRecentTransactions,
  getTotalVotesCast,
  getElectionState,
  getCandidateIds,
  getVoteCountForCandidate,
  getContractAddress,
} from "@/lib/blockchain";

// Allow dynamic rendering for fresh blockchain data
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const transactions = await getRecentTransactions(100);
    const totalVotes = await getTotalVotesCast();
    const electionState = await getElectionState();
    const contractAddress = getContractAddress();
    
    // Get all candidates and their votes
    const candidateIds = await getCandidateIds();
    const candidateVotes = await Promise.all(
      candidateIds.map(async (id) => {
        const votes = await getVoteCountForCandidate(id);
        return {
          id,
          votes: Number(votes)
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        totalVotes: Number(totalVotes),
        electionState,
        contractAddress,
        candidateVotes
      }
    });
  } catch (error: any) {
    console.error("Error fetching blockchain data:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
