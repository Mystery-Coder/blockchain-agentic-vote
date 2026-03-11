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

// Singleton instances (persist across hot reloads via globalThis)
const globalForBlockchain = globalThis as unknown as {
  bcProvider: ethers.JsonRpcProvider | undefined;
  bcSigner: ethers.Wallet | undefined;
};

/**
 * Get a JSON-RPC provider for the local Hardhat network (singleton)
 */
export function getProvider(): ethers.JsonRpcProvider {
  if (!globalForBlockchain.bcProvider) {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
    globalForBlockchain.bcProvider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return globalForBlockchain.bcProvider;
}

/**
 * Get a signer (relayer wallet) that can send transactions (singleton)
 */
export function getRelayerSigner(): ethers.Wallet {
  if (!globalForBlockchain.bcSigner) {
    const privateKey = process.env.RELAYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("RELAYER_PRIVATE_KEY environment variable is not set");
    }
    globalForBlockchain.bcSigner = new ethers.Wallet(privateKey, getProvider());
  }
  return globalForBlockchain.bcSigner;
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
 * Get candidate IDs
 */
export async function getCandidateIds(): Promise<number[]> {
  const contract = getReadOnlyContract();
  const ids = await contract.getCandidateIds();
  return ids.map((id: bigint) => Number(id));
}


/**
 * Get the deployed contract address
 */
export function getContractAddress(): string {
  const { contractAddress } = getDeploymentInfo();
  return contractAddress;
}

export interface DecodedTransaction {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  method: string;
  args: any[];
  value: string;
}

/**
 * Fetch and decode recent transactions for the ballot contract
 */
export async function getRecentTransactions(maxBlocks: number = 50): Promise<DecodedTransaction[]> {
  const provider = getProvider();
  const contractAddress = getContractAddress().toLowerCase();
  const iface = new ethers.Interface(BALLOT_ABI);
  
  const latestBlockNumber = await provider.getBlockNumber();
  const startBlock = Math.max(0, latestBlockNumber - maxBlocks + 1);
  
  const decodedTxs: DecodedTransaction[] = [];
  
  // Fetch blocks in reverse order
  for (let i = latestBlockNumber; i >= startBlock; i--) {
    const block = await provider.getBlock(i, true);
    if (!block || !block.prefetchedTransactions) continue;
    
    for (const tx of block.prefetchedTransactions) {
      let method = "Unknown Data";
      let serializedArgs: any[] = [];
      let isBallotTx = false;

      // Try to decode if it is directed to our contract
      if (tx.to && tx.to.toLowerCase() === contractAddress) {
        isBallotTx = true;
        try {
          const parsed = iface.parseTransaction({ data: tx.data, value: tx.value });
          method = parsed ? parsed.name : "Unknown";
          serializedArgs = parsed ? JSON.parse(
              JSON.stringify(parsed.args, (key, value) => 
                typeof value === 'bigint' ? value.toString() : value
              )
            ) : [];
        } catch (e) {
            // keep default "Unknown Data" and empty args
        }
      } else if (tx.to === null) {
        method = "Contract Deployment";
      } else if (tx.data === "0x") {
        method = "Transfer";
      }

      decodedTxs.push({
        hash: tx.hash,
        blockNumber: block.number,
        from: tx.from,
        to: tx.to || "Contract Creation",
        method,
        args: serializedArgs,
        value: ethers.formatEther(tx.value)
      });
    }
  }
  
  return decodedTxs;
}
