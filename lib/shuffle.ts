import crypto from "crypto";

/**
 * Cryptographically secure Fisher-Yates shuffle using Node.js crypto.
 * Produces an unbiased permutation of the input array.
 */
export function secureShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomBytes = crypto.randomBytes(4);
    const randomIndex = randomBytes.readUInt32BE(0) % (i + 1);
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }
  return shuffled;
}
