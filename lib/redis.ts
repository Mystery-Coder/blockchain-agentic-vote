/**
 * In-memory vote buffer that replaces Redis for local-only development.
 * Implements the same LPUSH / LRANGE / DEL semantics used by the batcher.
 */

export interface BufferedVote {
  voterHash: string;
  candidateId: number;
  timestamp: number;
}

// Global in-memory store (persists across hot reloads in dev via globalThis)
const globalForRedis = globalThis as unknown as {
  voteBuffers: Map<string, BufferedVote[]>;
};

if (!globalForRedis.voteBuffers) {
  globalForRedis.voteBuffers = new Map();
}

const buffers = globalForRedis.voteBuffers;

function getKey(constituencyId: string): string {
  return `vote-buffer:${constituencyId}`;
}

/**
 * Check whether a voter hash is already pending in the buffer
 */
export async function hasVoterInBuffer(
  constituencyId: string,
  voterHash: string
): Promise<boolean> {
  const key = getKey(constituencyId);
  const buffer = buffers.get(key) || [];
  return buffer.some((v) => v.voterHash === voterHash);
}

/**
 * Push a vote into the constituency buffer (equivalent to LPUSH).
 * Rejects duplicates — a voterHash can only appear once per buffer.
 */
export async function pushVote(
  constituencyId: string,
  vote: BufferedVote
): Promise<number> {
  const key = getKey(constituencyId);
  if (!buffers.has(key)) {
    buffers.set(key, []);
  }
  const buffer = buffers.get(key)!;

  // Prevent duplicate voter hashes in the same buffer
  if (buffer.some((v) => v.voterHash === vote.voterHash)) {
    throw new Error("DUPLICATE_VOTE: voter already has a pending vote in the buffer");
  }

  buffer.push(vote);
  return buffer.length;
}

/**
 * Get all votes from a constituency buffer (equivalent to LRANGE 0 -1)
 */
export async function getVotes(
  constituencyId: string
): Promise<BufferedVote[]> {
  const key = getKey(constituencyId);
  return buffers.get(key) || [];
}

/**
 * Atomically read and clear the buffer (equivalent to LRANGE + DEL)
 */
export async function flushVotes(
  constituencyId: string
): Promise<BufferedVote[]> {
  const key = getKey(constituencyId);
  const votes = buffers.get(key) || [];
  buffers.set(key, []);
  return [...votes];
}

/**
 * Get the current buffer length
 */
export async function getBufferLength(
  constituencyId: string
): Promise<number> {
  const key = getKey(constituencyId);
  return (buffers.get(key) || []).length;
}

/**
 * Get all constituency IDs that have pending votes
 */
export async function getActiveConstituencies(): Promise<string[]> {
  const active: string[] = [];
  for (const [key, votes] of buffers.entries()) {
    if (votes.length > 0) {
      active.push(key.replace("vote-buffer:", ""));
    }
  }
  return active;
}
