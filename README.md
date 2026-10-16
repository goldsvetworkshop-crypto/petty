# Petty

> **Petty cash for autonomous AI agents.**  
> The cryptographically hardened, policy-enforced x402 wallet engine for LangChain, Vercel AI SDK, and AutoGPT.

[![npm version](https://img.shields.io/npm/v/@petty/wallet.svg?style=flat-square)](https://www.npmjs.com/package/@petty/wallet)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org/)
[![Viem Version](https://img.shields.io/badge/viem-%5E2.21.0-purple.svg?style=flat-square)](https://viem.sh/)

---

## What is Petty?

In business, **petty cash** is a strictly capped pool of funds allocated for minor, day-to-day operations without going through formal requisition loops. 

**Petty brings that exact concept to AI agents.** 

When your autonomous LLM interacts with paid databases, real-time search APIs, or enterprise pipelines demanding micro-settlements, Petty intercepts `HTTP 402 Payment Required` challenges, signs deterministic EIP-712 payment authorizations within mathematical limits, and retries the request seamlessly.

---

## Core Guarantees

- **No Prompt Injection Draining:** Strict per-request caps and rolling-window velocity limiters (e.g., max $1.00/min).
- **Two Generals' Fault Tolerance:** Quarantines indeterminate states (`AMBIGUOUS`) to eliminate double-spending under network drops.
- **Cross-Runtime Determinism:** Built-in **RFC 8785 JSON Canonicalization Scheme (JCS)** ensures signature compatibility across Python, Go, and Rust APIs.
- **SSRF & Metadata Immunity:** Socket-level DNS resolution pinning rejects loopbacks (`127.0.0.1`), link-local IPs (`169.254.169.254`), and redirects (`maxRedirects: 0`).
- **Memory Zeroization:** Cryptographic keys stored in low-level buffers wiped with `.fill(0)` upon disposal.

---

## Installation

```bash
npm install @petty/wallet viem
