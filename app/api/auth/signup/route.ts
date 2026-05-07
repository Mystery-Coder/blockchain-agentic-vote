import { NextRequest, NextResponse } from "next/server";
import { hashAadhaar, validateAadhaarFormat } from "@/lib/hash";
import fs from "fs";
import path from "path";

// ── Types ─────────────────────────────────────────────────────

interface VoterRecord {
  voterHash: string;
  aadhaar: string;
  name: string;
  constituency: string;
  is_verified_pwd: boolean;
  pwd_category?: "visual" | "hearing" | "locomotor" | "cognitive";
}

// ── Helpers ───────────────────────────────────────────────────

const votersPath = path.join(process.cwd(), "data", "voters.json");

function readVoters(): VoterRecord[] {
  return JSON.parse(fs.readFileSync(votersPath, "utf-8"));
}

function writeVoters(voters: VoterRecord[]) {
  fs.writeFileSync(votersPath, JSON.stringify(voters, null, 2), "utf-8");
}

// ── POST /api/auth/signup ─────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { aadhaar, otp } = await req.json();

    // ── Validate inputs ──────────────────────────────────────

    if (!aadhaar || !validateAadhaarFormat(aadhaar)) {
      return NextResponse.json(
        { error: "Invalid Aadhaar format. Must be 12 digits." },
        { status: 400 }
      );
    }

    if (otp !== "123456") {
      return NextResponse.json(
        { error: "Invalid OTP. Use 123456 for demo." },
        { status: 400 }
      );
    }

    // ── Check electoral roll ──────────────────────────────────

    const voters = readVoters();
    const index  = voters.findIndex((v) => v.aadhaar === aadhaar);

    if (index === -1) {
      return NextResponse.json(
        { error: "Aadhaar not found in electoral roll. Contact your election office." },
        { status: 404 }
      );
    }

    // ── Check not already enrolled ────────────────────────────

    if (voters[index].voterHash !== "") {
      return NextResponse.json(
        { error: "This Aadhaar is already enrolled. Please use your RFID card to login." },
        { status: 409 }
      );
    }

    // ── Hash Aadhaar + save ───────────────────────────────────

    const voterHash = hashAadhaar(aadhaar).replace(/^0x/, "");
    voters[index].voterHash = voterHash;
    writeVoters(voters);

    // Return hash to browser so it can write to RFID card
    // Raw Aadhaar never leaves server after this point
    return NextResponse.json({
      success: true,
      voterHash,
      name: voters[index].name,
      constituency: voters[index].constituency,
    });

  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}