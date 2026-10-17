# :coin: Petty

> **Petty cash for autonomous AI agents.**  
> The cryptographically hardened, policy-enforced x402 wallet engine for LangChain, Vercel AI SDK, and AutoGPT.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org/)
[![Viem Version](https://img.shields.io/badge/viem-%5E2.21.0-purple.svg?style=flat-square)](https://viem.sh/)
[![Security: Formally Modeled](https://img.shields.io/badge/Security-DFA%20%2B%20EIP--712-success.svg?style=flat-square)](#-security-deep-dive-the-7-pillars-of-defense)

---

## :bulb: What Does This Script Actually Do? (In Plain English)

Imagine you hire a human research assistant and give them a company credit card with no limit. If a scammer tricks them, or they get stuck in an automated loop, your bank account gets wiped out in minutes.

In business, companies solve this with **petty cash**: a small, locked metal box with $50 inside. If the assistant needs to buy office supplies or pay for a courier, they can spend from the petty cash box—but **never more than the cash inside, and never without leaving a receipt**.

### Petty brings that exact concept to AI agents.

Today, AI agents (powered by GPT-4, Claude, or local LLMs) are increasingly autonomous. They browse the web, write code, and query databases. When an agent visits a premium database (e.g., Bloomberg market data, web scrapers, or private intelligence), the server blocks them with a web standard called **`HTTP 402 Payment Required`**.

Instead of giving your AI agent full access to your crypto wallet or corporate credit card:
1. You allocate a **Petty Cash budget** (e.g., maximum $5.00 USDC, max $0.25 per request).
2. When the AI agent encounters an `HTTP 402 Payment Required` paywall, **Petty intercepts the error behind the scenes**.
3. Petty validates that the price is safe, signs a tiny cryptographic payment voucher (EIP-712), and submits it to the API provider.
4. The provider verifies the voucher, unlocks the data, and returns it to your AI agent.
5. Your agent gets the data it needs seamlessly, while your wallet remains completely safe from runaway costs or prompt injection exploits.

---

## :arrows_counterclockwise: The Autonomous Payment Lifecycle

Here is what happens under the hood during a single `client.fetch()` call:

---

## :shield: Security Deep Dive: The 7 Pillars of Defense

Most Web3 wrappers fail when deployed with AI agents. Petty was engineered with formal computer science and security principles to eliminate real-world attack vectors:

### 1. Sliding-Window Velocity Guard ("Death by 1,000 Cuts" Defense)
* **The Attack:** Even with a $0.25 limit per request, an attacker manipulating an LLM via prompt injection can force the agent into a 100-request loop, draining $25 in 30 seconds.
* **Petty's Defense:** A sliding-window velocity limiter enforces a rate ceiling (e.g., max $1.00 spent across any rolling 60-second window). If the agent goes into a loop, Petty automatically throttles execution.

### 2. Tri-State Ledger (Solving the Two Generals' Paradox)
* **The Attack:** An agent sends a signed payment voucher, but the network drops (`ETIMEDOUT`). Did the server get the payment or not? If you refund the budget locally, the server might still redeem the voucher on-chain later (causing over-spending). If you don't refund it, funds are lost prematurely.
* **Petty's Defense:** Indeterminate payments are quarantined in an **`AMBIGUOUS`** state. They cannot be re-spent, but can be released or confirmed by calling `reconcileOnChain()` against the smart contract validator.

### 3. RFC 8785 Canonical JSON (JCS) Determinism
* **The Problem:** JavaScript's `JSON.stringify()` does not guarantee deterministic key order. An object `{ a: 1, b: 2 }` in Node.js might be parsed and re-serialized as `{ b: 2, a: 1 }` by a server running Python FastAPI or Go, producing different cryptographic hashes and causing valid signatures to be rejected.
* **Petty's Defense:** All payloads are normalized using the **RFC 8785 JSON Canonicalization Scheme (JCS)**, guaranteeing identical byte sequences across all programming languages.

### 4. Socket-Level DNS Pinning & Anti-SSRF
* **The Attack:** An LLM might be tricked into requesting `http://169.254.169.254/latest/meta-data/` (AWS cloud credentials) or internal microservices (`http://192.168.1.1`). Attackers also use **DNS Rebinding** where a domain resolves to a safe IP during validation, but swaps to `127.0.0.1` when fetched.
* **Petty's Defense:** Custom `dns.lookup` hooks inside Node's HTTP/HTTPS agent validate resolved IP addresses at the TCP socket layer. Connection attempts to loopback, private subnets (RFC 1918), or link-local addresses are rejected immediately. Automatic HTTP redirects are strictly disabled (`maxRedirects: 0`).

### 5. Memory Zeroization & Cold-Boot Protection
* **The Problem:** In Node.js, storing private keys in standard JavaScript strings means they stay in V8 heap memory until garbage collected, leaving them vulnerable to crash dump inspection or heap leaks.
* **Petty's Defense:** Keys are stored in low-level byte buffers that are overwritten with high-entropy cryptographic noise and zero-filled (`buffer.fill(0)`) the moment `client.terminateSession()` is called.

### 6. Host-Partitioned Concurrency (No Head-of-Line Blocking)
* **The Problem:** Modern AI models (like GPT-4o) call multiple tools in parallel. A single global lock means if Server A stalls for 9 seconds, tool calls to Servers B and C are frozen.
* **Petty's Defense:** Locks are partitioned per target domain (`runOnPartition`). Parallel tool calls to different APIs execute concurrently without blocking each other.

### 7. Formally Modeled Deterministic Finite Automaton (DFA)
* **The Defense:** Every payment moves strictly through mathematically validated states:  
  `IDLE` $\rightarrow$ `RESERVED` $\rightarrow$ `SIGNED` $\rightarrow$ `DISPATCHED` $\rightarrow$ `SETTLED` or `AMBIGUOUS`.  
  Illegal state jumps are rejected at runtime.

---

## :package: Installation

Requires **Node.js v20.0.0+**. Uses **`viem`** exclusively (zero `ethers` bloat).

```bash
npm install @goldsvetworkshop/petty viem

import { PettyClient, MemoryGuardedLocalSigner } from "@goldsvetworkshop/petty";
import { generatePrivateKey } from "viem/accounts";
import { parseUnits, type Address } from "viem";

// 1. Generate an isolated, memory-guarded signer
const signer = new MemoryGuardedLocalSigner(generatePrivateKey());

// 2. Define strict spending boundaries
const policy: SessionPolicy = {
  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
  totalBudget: parseUnits("5.0", 6),                          // $5.00 Max Total
  maxPerRequest: parseUnits("0.25", 6),                        // $0.25 Max per call
  maxSpendPerWindow: parseUnits("1.00", 6),                    // Max $1.00 / minute
  windowMs: 60000,
  validUntil: Math.floor(Date.now() / 1000) + 86400,          // 24-hour expiration
  allowedContracts: ["0x2506F46A6D95c249E69e160eB698dF1991Fbe45C" as Address],
  chainId: 8453,                                               // Base Mainnet
  verifyingGateway: "0xYourSettlementContract" as Address
};

// 3. Initialize Petty Client
const client = new PettyClient(
  signer,
  policy,
  async (recipient) => true, // Optional: Sanctions / OFAC screening hook
  (receipt) => console.log("[PETTY AUDIT RECEIPT]", JSON.stringify(receipt))
);

// 4. Autonomous fetch: Handles 402 challenge and retry transparently
const response = await client.fetch("https://api.marketdata.ai/v1/search", {
  method: "POST",
  data: { query: "L2 liquidity trends" }
});

console.log("Unlocked Intelligence:", response);

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { PettyClient } from "@petty/wallet";

export function createPettyTool(client: PettyClient) {
  return new DynamicStructuredTool({
    name: "petty_paid_search",
    description: "Queries premium financial data via autonomous micro-settlements.",
    schema: z.object({
      query: z.string().describe("The research prompt or query")
    }),
    func: async ({ query }) => {
      try {
        const result = await client.fetch("https://api.marketdata.ai/v1/search", {
          method: "POST",
          data: { query }
        });
        return JSON.stringify(result);
      } catch (err: any) {
        return `Payment / Tool Blocked: ${err.message}`;
      }
    }
  });
}

import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { PettyClient } from "@petty/wallet";

export function getPettyTools(client: PettyClient) {
  return {
    queryMarketIntelligence: tool({
      description: "Safely retrieves intelligence via autonomous micro-allowance.",
      parameters: z.object({
        endpoint: z.string().url(),
        query: z.string()
      }),
      execute: async ({ endpoint, query }) => {
        return await client.fetch(endpoint, {
          method: "POST",
          data: { query }
        });
      }
    })
  };
}

petty/
├── src/
│   ├── types.ts                    # EIP-712 schemas, DFA state enum, policy structs
│   ├── errors.ts                   # Strongly-typed error hierarchy (SSRF, Budget, Velocity)
│   ├── crypto/
│   │   ├── canonical.ts            # RFC 8785 Canonical JSON (JCS) deterministic serializer
│   │   └── memory.ts               # Cryptographic buffer overwrite & zero-fill
│   ├── concurrency/
│   │   └── partitioned-mutex.ts    # Host-partitioned non-blocking mutex (No HoL blocking)
│   ├── fsm/
│   │   └── payment-automaton.ts    # Deterministic Finite Automaton (DFA) state verifier
│   ├── ledger/
│   │   └── tri-state-ledger.ts     # Two Generals' Ledger (Available, Reserved, Settled, Ambiguous)
│   ├── security/
│   │   ├── network.ts              # Socket-pinned DNS resolver & anti-SSRF client
│   │   └── velocity.ts             # Rolling-window spend rate limiter
│   ├── signer.ts                   # MemoryGuardedLocalSigner & IEnclaveSigner interface
│   ├── client.ts                   # PettyClient: The unified orchestrator
│   └── index.ts                    # Public SDK exports
└── examples/
    └── quickstart.mjs              # Runnable integration demonstration

---

### How to Update Your GitHub Repository (From Your Server)

To replace your old README on GitHub with this new, comprehensive version, run these three commands in your SSH terminal:

#### 1. Paste the new README into your project:
```bash

