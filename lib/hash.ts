import { ethers } from "ethers";

/**
 * Compute a one-way keccak256 hash of an Aadhaar number + salt.
 * This is the ONLY identifier that touches the blockchain.
 * The raw Aadhaar number is NEVER stored anywhere.
 */
export function hashAadhaar(aadhaarNumber: string): string {
  const salt = process.env.AADHAAR_HASH_SALT;
  if (!salt) {
    throw new Error("AADHAAR_HASH_SALT environment variable is not set");
  }

  return ethers.solidityPackedKeccak256(
    ["string", "string"],
    [aadhaarNumber, salt]
  );
}

/**
 * Validate that an Aadhaar number is in the correct format (12 digits).
 */
export function validateAadhaarFormat(aadhaarNumber: string): boolean {
  return /^\d{12}$/.test(aadhaarNumber);
}
