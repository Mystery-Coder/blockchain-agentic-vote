import { NextResponse } from "next/server";
import { getWritableContract } from "@/lib/blockchain";

export async function POST() {
  try {
    const contract = getWritableContract();
    const tx = await contract.advanceElectionState();
    await tx.wait();
    
    return NextResponse.json({ success: true, txHash: tx.hash });
  } catch (error: any) {
    console.error("Error advancing election state:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
