import { NextRequest, NextResponse } from "next/server"
import { validateAadhaarFormat } from "@/lib/hash"
import fs from "fs"
import path from "path"

interface VoterRecord {
  voterHash: string
  aadhaar: string
  name: string
  constituency: string
  is_verified_pwd: boolean
  pwd_category?: string
}

export async function POST(req: NextRequest) {
  try {
    const { aadhaar } = await req.json()

    if (!aadhaar || !validateAadhaarFormat(aadhaar)) {
      return NextResponse.json(
        { error: "Invalid Aadhaar format. Must be 12 digits." },
        { status: 400 }
      )
    }

    const votersPath = path.join(process.cwd(), "data", "voters.json")
    const voters: VoterRecord[] = JSON.parse(fs.readFileSync(votersPath, "utf-8"))
    const voter = voters.find((v) => v.aadhaar === aadhaar)

    if (!voter) {
      return NextResponse.json(
        { error: "Aadhaar not found in electoral roll. Contact your election office." },
        { status: 404 }
      )
    }

    if (voter.voterHash !== "") {
      return NextResponse.json(
        { error: "This Aadhaar is already enrolled. Please use your RFID card to login." },
        { status: 409 }
      )
    }

    // Aadhaar valid and not yet enrolled
    return NextResponse.json({
      success: true,
      name: voter.name,
      constituency: voter.constituency,
    })

  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}