import pkg from 'hardhat';
const { ethers } = pkg as any;

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); 

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AnonymousBallot with account:", deployer.address);

  // Relayer is the deployer (Hardhat account #0) for local dev
  const relayerAddress = deployer.address;

  // Candidate IDs for the election (matching data/candidates.json)
  const candidateIds = [1, 2, 3, 4, 5, 6, 7, 8];

  const AnonymousBallot = await ethers.getContractFactory("AnonymousBallot");
  const ballot = await AnonymousBallot.deploy(relayerAddress, candidateIds);
  await ballot.waitForDeployment();

  const contractAddress = await ballot.getAddress();
  console.log("AnonymousBallot deployed to:", contractAddress);

  // Start the election immediately for demo
  const tx = await ballot.advanceElectionState();
  await tx.wait();
  console.log("Election state advanced to: Active");

  // Write deployment info to a JSON file for the Next.js app
  const fs = await import("fs");
  const path = await import("path");

  const deploymentInfo = {
    contractAddress,
    relayerAddress,
    chainId: 31337,
    deployedAt: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, "..", "data", "deployment.json");

  // Ensure data directory exists
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info written to data/deployment.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
