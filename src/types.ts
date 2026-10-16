import { type Address, type Hex } from "viem";

export const EIP712_PAYMENT_TYPES = {
  PaymentVoucher: [
    { name: "token", type: "address" },
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "validUntil", type: "uint256" },
    { name: "requestHash", type: "bytes32" }
  ]
} as const;

export enum PaymentState {
  IDLE = "IDLE",
  RESERVED = "RESERVED",
  SIGNED = "SIGNED",
  DISPATCHED = "DISPATCHED",
  SETTLED = "SETTLED",
  AMBIGUOUS = "AMBIGUOUS",
  RECONCILED_VOID = "RECONCILED_VOID"
}

export interface SessionPolicy {
  tokenAddress: Address;
  totalBudget: bigint;
  maxPerRequest: bigint;
  maxSpendPerWindow: bigint;
  windowMs: number;
  validUntil: number;
  allowedContracts: readonly Address[];
  chainId: number;
  verifyingGateway: Address;
}

export type ComplianceCheckHook = (recipient: Address) => Promise<boolean>;

export interface AuditReceipt {
  receiptId: string;
  timestamp: number;
  url: string;
  method: string;
  recipient: Address;
  token: Address;
  amount: string;
  nonce: string;
  requestHash: Hex;
  signature: Hex;
  state: PaymentState;
}

export type AuditLogger = (receipt: AuditReceipt) => void;