"use server";

import { flushVotes } from "@/lib/redis";
import { getWritableContract, normalizeBytes32 } from "@/lib/blockchain";
import { secureShuffle } from "@/lib/shuffle";

export interface BatchResult {
	success: boolean;
	message: string;
	voterCount?: number;
}

// Simple mutex to prevent concurrent batch transactions (nonce collisions)
const globalForBatch = globalThis as unknown as {
	batchLock: Promise<void>;
};
if (!globalForBatch.batchLock) {
	globalForBatch.batchLock = Promise.resolve();
}

/**
 * Process a batch of votes from the buffer:
 * 1. Atomically read + clear the buffer
 * 2. Deduplicate by voterHash
 * 3. Separate voterHashes[] and candidateIds[]
 * 4. Fisher-Yates shuffle candidateIds[] (breaking the link)
 * 5. Submit markVoters(voterHashes[]) to chain
 * 6. Submit recordVotes(shuffledCandidateIds[]) to chain
 *
 * Uses a mutex to prevent concurrent batch processing (nonce collisions).
 */
export async function processBatch(
	constituencyId: string,
): Promise<BatchResult> {
	// Acquire mutex — wait for any in-flight batch to finish
	let releaseLock: () => void;
	const prevLock = globalForBatch.batchLock;
	globalForBatch.batchLock = new Promise<void>((resolve) => {
		releaseLock = resolve;
	});
	await prevLock;

	try {
		return await _processBatchInner(constituencyId);
	} finally {
		releaseLock!();
	}
}

async function _processBatchInner(
	constituencyId: string,
): Promise<BatchResult> {
	// 1. Atomically read + clear buffer
	const votes = await flushVotes(constituencyId);

	if (votes.length === 0) {
		return { success: true, message: "No votes in buffer.", voterCount: 0 };
	}

	// 2. Deduplicate by voterHash (safety net — keep first vote per voter)
	const seenHashes = new Set<string>();
	const uniqueVotes = votes.filter((v) => {
		const normalizedHash = normalizeBytes32(v.voterHash);
		if (seenHashes.has(normalizedHash)) {
			console.warn(
				`[Batcher] Duplicate voterHash detected and removed: ${v.voterHash.slice(
					0,
					10,
				)}...`,
			);
			return false;
		}
		seenHashes.add(normalizedHash);
		return true;
	});

	if (uniqueVotes.length === 0) {
		return {
			success: true,
			message: "No unique votes in buffer.",
			voterCount: 0,
		};
	}

	// 3. Separate arrays
	const voterHashes = uniqueVotes.map((v) => normalizeBytes32(v.voterHash));
	const candidateIds = uniqueVotes.map((v) => v.candidateId);

	// 4. Shuffle candidateIds independently — this is the anonymity mechanism
	const shuffledCandidateIds = secureShuffle(candidateIds);

	console.log(
		`[Batcher] Processing batch of ${uniqueVotes.length} votes for ${constituencyId}`,
	);

	try {
		const contract = getWritableContract();

		// 5. Mark voters as having voted (uses original voterHashes order)
		const markTx = await contract.markVoters(voterHashes);
		await markTx.wait();
		console.log(`[Batcher] markVoters tx confirmed: ${markTx.hash}`);

		// 6. Record votes with SHUFFLED candidateIds (no link to voterHashes)
		const voteTx = await contract.recordVotes(shuffledCandidateIds);
		await voteTx.wait();
		console.log(`[Batcher] recordVotes tx confirmed: ${voteTx.hash}`);

		return {
			success: true,
			message: `Batch of ${votes.length} votes processed and recorded on-chain.`,
			voterCount: votes.length,
		};
	} catch (error) {
		console.error("[Batcher] Transaction failed:", error);

		// Note: In production, failed votes would need to be re-queued.
		// For local dev, we log the error and move on.
		return {
			success: false,
			message: `Batch processing failed: ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		};
	}
}

/**
 * Force-flush all pending votes for a constituency.
 * Used for the MAX_WAIT_SECONDS fallback and admin controls.
 */
export async function forceFlush(constituencyId: string): Promise<BatchResult> {
	return processBatch(constituencyId);
}
