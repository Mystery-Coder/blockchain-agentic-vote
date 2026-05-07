import { NextRequest, NextResponse } from "next/server"
import { hashAadhaar, validateAadhaarFormat } from "@/lib/hash"
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

const votersPath = path.join(process.cwd(), "data", "voters.json")

export async function POST(req: NextRequest) {
  try {
    const { aadhaar, voterHash } = await req.json()

    if (!aadhaar || !validateAadhaarFormat(aadhaar)) {
      return NextResponse.json(
        { error: "Invalid Aadhaar." },
        { status: 400 }
      )
    }

    if (!voterHash || !/^[0-9a-f]{64}$/.test(voterHash)) {
      return NextResponse.json(
        { error: "Invalid voter hash." },
        { status: 400 }
      )
    }

    const voters: VoterRecord[] = JSON.parse(
      fs.readFileSync(votersPath, "utf-8")
    )
    const index = voters.findIndex((v) => v.aadhaar === aadhaar)

    if (index === -1) {
      return NextResponse.json(
        { error: "Voter not found." },
        { status: 404 }
      )
    }

    // Double check hash matches what server would compute
    const expectedHash = hashAadhaar(aadhaar).replace(/^0x/, "")
    if (expectedHash !== voterHash) {
      return NextResponse.json(
        { error: "Hash mismatch. Possible tampering." },
        { status: 403 }
      )
    }

    // Already enrolled check
    if (voters[index].voterHash !== "") {
      return NextResponse.json(
        { error: "Already enrolled." },
        { status: 409 }
      )
    }

    // Only now — card write succeeded — save to file
    voters[index].voterHash = voterHash
    fs.writeFileSync(votersPath, JSON.stringify(voters, null, 2), "utf-8")

    return NextResponse.json({ success: true })

  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    )
  }
}