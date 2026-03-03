import { ethers } from "ethers";
import fs from "fs";
import path from "path";

// ABI for AnonymousBallot — only the functions we need
const BALLOT_ABI = [
  "function hasVoted(bytes32) view returns (bool)",
  "function hasVoterVoted(bytes32 voterHash) view returns (bool)",
  "function getVoteCount(uint256 candidateId) view returns (uint256)",
  "function getTotalVotes() view returns (uint256)",
  "function getElectionState() view returns (uint8)",
  "function getCandidateIds() view returns (uint256[])",
  "function markVoters(bytes32[] calldata voterHashes)",
  "function recordVotes(uint256[] calldata candidateIds)",
  "function advanceElectionState()",
  "event VotersMarked(uint256 count)",
  "event VotesRecorded(uint256 count)",
  "event ElectionStateChanged(uint8 newState)",
];

interface DeploymentInfo {
  contractAddress: string;
  relayerAddress: string;
  chainId: number;
  deployedAt: string;
}

function getDeploymentInfo(): DeploymentInfo {
  const deploymentPath = path.join(
    process.cwd(),
    "data",
    "deployment.json"
  );

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      "Contract not deployed. Run: npx hardhat run scripts/deploy.ts --network localhost"
    );
  }

  return JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
}

/**
 * Get a JSON-RPC provider for the local Hardhat network
 */
export function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Get a signer (relayer wallet) that can send transactions
 */
export function getRelayerSigner(): ethers.Wallet {
  const privateKey = process.env.RELAYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("RELAYER_PRIVATE_KEY environment variable is not set");
  }
  return new ethers.Wallet(privateKey, getProvider());
}

/**
 * Get a read-only contract instance
 */
export function getReadOnlyContract(): ethers.Contract {
  const { contractAddress } = getDeploymentInfo();
  return new ethers.Contract(contractAddress, BALLOT_ABI, getProvider());
}

/**
 * Get a writable contract instance (connected to relayer signer)
 */
export function getWritableContract(): ethers.Contract {
  const { contractAddress } = getDeploymentInfo();
  return new ethers.Contract(
    contractAddress,
    BALLOT_ABI,
    getRelayerSigner()
  );
}

/**
 * Check if a voter has already voted on-chain
 */
export async function hasVoterVotedOnChain(
  voterHash: string
): Promise<boolean> {
  const contract = getReadOnlyContract();
  return await contract.hasVoterVoted(voterHash);
}

/**
 * Get vote count for a specific candidate
 */
export async function getVoteCountForCandidate(
  candidateId: number
): Promise<bigint> {
  const contract = getReadOnlyContract();
  return await contract.getVoteCount(candidateId);
}

/**
 * Get total votes cast
 */
export async function getTotalVotesCast(): Promise<bigint> {
  const contract = getReadOnlyContract();
  return await contract.getTotalVotes();
}

/**
 * Get current election state (0=NotStarted, 1=Active, 2=Ended)
 */
export async function getElectionState(): Promise<number> {
  const contract = getReadOnlyContract();
  const state = await contract.getElectionState();
  return Number(state);
}

/**
 * Get the deployed contract address
 */
export function getContractAddress(): string {
  const { contractAddress } = getDeploymentInfo();
  return contractAddress;
}
