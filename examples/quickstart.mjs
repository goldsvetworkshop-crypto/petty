import { generatePrivateKey, parseUnits } from "viem/accounts";
import { parseUnits as parseTokenUnits } from "viem";
import { PettyClient, MemoryGuardedLocalSigner } from "../dist/index.js";

// 1. Generate an isolated, memory-guarded signer for the agent
const signer = new MemoryGuardedLocalSigner(generatePrivateKey());

// 2. Define strict spending boundaries
const policy = {
  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
  totalBudget: parseTokenUnits("5.0", 6),                       // $5.00 Max
  maxPerRequest: parseTokenUnits("0.25", 6),                     // $0.25 per API call
  maxSpendPerWindow: parseTokenUnits("1.00", 6),                 // Max $1.00 per minute
  windowMs: 60000,
  validUntil: Math.floor(Date.now() / 1000) + 86400,            // 24 hours
  allowedContracts: ["0x2506F46A6D95c249E69e160eB698dF1991Fbe45C"],
  chainId: 8453,                                                // Base Mainnet
  verifyingGateway: "0x4A64b0906EE0D1318cf301C8982E6a8a018b0D49"
};

// 3. Initialize the Petty Client
const client = new PettyClient(
  signer,
  policy,
  async (recipient) => true, // Optional: Sanctions / OFAC check hook
  (receipt) => console.log("[PETTY AUDIT RECEIPT]", JSON.stringify(receipt))
);

console.log("Petty Client is initialized and ready to protect your agent's budget!");
console.log("Agent Signer Address:", await signer.getAddress());