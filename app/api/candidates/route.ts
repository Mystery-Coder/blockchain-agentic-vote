import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  const constituency = request.nextUrl.searchParams.get("constituency");

  const candidatesPath = path.join(process.cwd(), "data", "candidates.json");
  const allCandidates: Candidate[] = JSON.parse(
    fs.readFileSync(candidatesPath, "utf-8")
  );

  const filtered = constituency
    ? allCandidates.filter((c) => c.constituency === constituency)
    : allCandidates;

  return NextResponse.json(filtered);
}
