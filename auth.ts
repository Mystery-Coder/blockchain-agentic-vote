import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { hashAadhaar, validateAadhaarFormat } from "@/lib/hash";
import fs from "fs";
import path from "path";

interface VoterRecord {
	voterHash: string;
	aadhaar: string;
	name: string;
	constituency: string;
	is_verified_pwd: boolean;
	pwd_category?: "visual" | "hearing" | "locomotor" | "cognitive";
}

function lookupVoter(voterHash: string): VoterRecord | undefined {
	const votersPath = path.join(process.cwd(), "data", "voters.json");
	const voters: VoterRecord[] = JSON.parse(
		fs.readFileSync(votersPath, "utf-8"),
	);
	const normalizedInput = normalizeVoterHash(voterHash);

	// Compute hashes for all voters and find match
	for (const voter of voters) {
		const computed = normalizeVoterHash(hashAadhaar(voter.aadhaar));
		const stored = normalizeVoterHash(voter.voterHash);
		if (computed === normalizedInput || stored === normalizedInput) {
			return { ...voter, voterHash: computed };
		}
	}
	return undefined;
}

function normalizeVoterHash(value: string): string {
	const trimmed = value.trim().toLowerCase();
	return trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		Credentials({
			name: "Aadhaar",
			credentials: {
				aadhaar: { label: "Aadhaar Number", type: "text" },
				otp: { label: "OTP", type: "text" },
				rfidHash: { label: "RFID Hash", type: "text" },
			},
			async authorize(credentials) {
				const aadhaar = credentials?.aadhaar as string;
				const otp = credentials?.otp as string;
				const rfidHash = credentials?.rfidHash as string;

				if (rfidHash) {
					if (!/^(0x)?[0-9a-f]{64}$/.test(rfidHash)) {
						throw new Error("Invalid RFID token.");
					}
					const normalizedHash = normalizeVoterHash(rfidHash);
					const voter = lookupVoter(normalizedHash);
					if (!voter) {
						throw new Error(
							"Card not registered. Please sign up first.",
						);
					}
					return {
						id: normalizedHash,
						name: voter.name,
						email: voter.constituency,
						image: voter.pwd_category || null,
					};
				}

				// Validate format
				if (!aadhaar || !validateAadhaarFormat(aadhaar)) {
					throw new Error(
						"Invalid Aadhaar number format. Must be 12 digits.",
					);
				}

				// Validate OTP (mock — fixed OTP)
				if (otp !== "123456") {
					throw new Error("Invalid OTP. Use 123456 for demo.");
				}

				// Hash immediately — raw Aadhaar never stored
				const voterHash = normalizeVoterHash(hashAadhaar(aadhaar));

				// Look up in registry
				const voter = lookupVoter(voterHash);
				if (!voter) {
					throw new Error("Voter not found in registry.");
				}

				// Return user object — NO raw Aadhaar
				return {
					id: voterHash,
					name: voter.name,
					email: voter.constituency, // abusing email field for constituency
					image: voter.pwd_category || null,
				};
			},
		}),
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.voterHash = user.id;
				token.constituency = user.email;
				token.voterName = user.name;

				// Look up PWD info
				const voter = lookupVoter(user.id as string);
				token.isPWD = voter?.is_verified_pwd || false;
				token.pwdCategory = voter?.pwd_category || null;
				token.agenticMode = false;
				token.hasVotedLocally = false;
			}
			return token;
		},
		async session({ session, token }) {
			return {
				...session,
				user: {
					...session.user,
					voterHash: token.voterHash as string,
					constituency: token.constituency as string,
					voterName: token.voterName as string,
					isPWD: token.isPWD as boolean,
					pwdCategory: token.pwdCategory as string | null,
					agenticMode: token.agenticMode as boolean,
					hasVotedLocally: token.hasVotedLocally as boolean,
				},
			};
		},
	},
	pages: {
		signIn: "/auth/login",
	},
	session: {
		strategy: "jwt",
	},
	secret: process.env.NEXTAUTH_SECRET,
});
