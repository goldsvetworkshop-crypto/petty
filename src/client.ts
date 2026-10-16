import { AxiosRequestConfig, AxiosInstance } from "axios";
import { getAddress, isAddressEqual, keccak256, toHex, type Address, type Hex } from "viem";
import { randomUUID } from "node:crypto";
import {
  SessionPolicy,
  PaymentState,
  EIP712_PAYMENT_TYPES,
  ComplianceCheckHook,
  AuditLogger,
  AuditReceipt
} from "./types.js";
import {
  PolicyViolationError,
  SanctionsCheckFailedError,
  DistributedAmbiguityError
} from "./errors.js";
import { IEnclaveSigner } from "./signer.js";
import { createUniversalHttpClient } from "./security/network.js";
import { VelocityGuard } from "./security/velocity.js";
import { TriStateLedger } from "./ledger/tri-state-ledger.js";
import { PartitionedMutex } from "./concurrency/partitioned-mutex.js";
import { PaymentAutomaton } from "./fsm/payment-automaton.js";
import { canonicalize } from "./crypto/canonical.js";

export class PettyClient {
  private httpClient: AxiosInstance;
  private ledger: TriStateLedger;
  private velocityGuard: VelocityGuard;
  private partitionedMutex = new PartitionedMutex();
  private lastNonce = 0n;
  private isLocallyTerminated = false;

  constructor(
    private signer: IEnclaveSigner,
    private policy: SessionPolicy,
    private complianceCheck?: ComplianceCheckHook,
    private auditLogger?: AuditLogger,
    allowLocalhost = false
  ) {
    this.httpClient = createUniversalHttpClient(allowLocalhost);
    this.ledger = new TriStateLedger(policy.totalBudget);
    this.velocityGuard = new VelocityGuard(policy.maxSpendPerWindow, policy.windowMs);
  }

  public terminateSession(): void {
    this.isLocallyTerminated = true;
    this.signer.dispose();
  }

  private getNextNonce(): bigint {
    const now = BigInt(Date.now());
    this.lastNonce = now > this.lastNonce ? now : this.lastNonce + 1n;
    return this.lastNonce;
  }

  public async fetch(targetUrl: string, options: AxiosRequestConfig = {}): Promise<any> {
    if (this.isLocallyTerminated) {
      throw new Error("[Petty Security] Client is terminated.");
    }

    const initialResponse = await this.httpClient({ url: targetUrl, ...options });
    if (initialResponse.status === 402) {
      return await this.handle402Payment(targetUrl, options, initialResponse);
    }
    return initialResponse.data;
  }

  private async handle402Payment(targetUrl: string, options: AxiosRequestConfig, response: any): Promise<any> {
    const urlObj = new URL(targetUrl);
    const partitionKey = urlObj.hostname;

    return await this.partitionedMutex.runOnPartition(partitionKey, 12000, async () => {
      const fsm = new PaymentAutomaton();
      const rawRecipient = response.headers["x-payment-address"];
      const rawAmount = response.headers["x-payment-amount"];

      if (!rawRecipient || !rawAmount) {
        throw new Error("[Petty x402] Malformed response: Missing payment headers.");
      }

      const recipient = getAddress(rawRecipient);
      const amount = BigInt(rawAmount);
      const receiptId = randomUUID();

      if (Math.floor(Date.now() / 1000) >= this.policy.validUntil) {
        throw new PolicyViolationError("Session expired.");
      }
      if (!this.policy.allowedContracts.some((addr) => isAddressEqual(addr, recipient))) {
        throw new PolicyViolationError(`Recipient ${recipient} not whitelisted.`);
      }
      if (this.complianceCheck && !(await this.complianceCheck(recipient))) {
        throw new SanctionsCheckFailedError(`Sanctions check failed for ${recipient}.`);
      }
      if (amount > this.policy.maxPerRequest) {
        throw new PolicyViolationError(`Amount ${amount} exceeds per-request ceiling.`);
      }

      this.velocityGuard.recordAndCheck(amount);

      fsm.transition(PaymentState.RESERVED);
      this.ledger.reserve(amount);

      const canonicalPayload = options.data ? canonicalize(options.data) : "";
      const method = (options.method || "GET").toUpperCase();
      const requestHash = keccak256(toHex(`${method}:${targetUrl}:${canonicalPayload}`));

      const nonce = this.getNextNonce();
      const sessionAddress = await this.signer.getAddress();

      let signature: Hex;
      try {
        fsm.transition(PaymentState.SIGNED);
        signature = await this.signer.signTypedData({
          domain: {
            name: "Petty-x402-Gateway",
            version: "1",
            chainId: this.policy.chainId,
            verifyingContract: this.policy.verifyingGateway
          },
          types: EIP712_PAYMENT_TYPES,
          primaryType: "PaymentVoucher",
          message: {
            token: this.policy.tokenAddress,
            recipient,
            amount,
            nonce,
            validUntil: BigInt(this.policy.validUntil),
            requestHash
          }
        });
      } catch (err) {
        this.ledger.releaseAmbiguous(amount);
        throw err;
      }

      const receipt: AuditReceipt = {
        receiptId,
        timestamp: Date.now(),
        url: targetUrl,
        method,
        recipient,
        token: this.policy.tokenAddress,
        amount: amount.toString(),
        nonce: nonce.toString(),
        requestHash,
        signature,
        state: fsm.currentState
      };

      try {
        fsm.transition(PaymentState.DISPATCHED);

        const retryResponse = await this.httpClient({
          url: targetUrl,
          ...options,
          headers: {
            ...options.headers,
            "x-payment-signature": signature,
            "x-payment-signer": sessionAddress,
            "x-payment-nonce": nonce.toString(),
            "x-payment-token": this.policy.tokenAddress,
            "x-payment-requesthash": requestHash
          }
        });

        fsm.transition(PaymentState.SETTLED);
        this.ledger.commit(amount);

        receipt.state = PaymentState.SETTLED;
        this.auditLogger?.(receipt);

        return retryResponse.data;
      } catch (networkError) {
        fsm.transition(PaymentState.AMBIGUOUS);
        this.ledger.quarantineAmbiguous(amount);

        receipt.state = PaymentState.AMBIGUOUS;
        this.auditLogger?.(receipt);

        throw new DistributedAmbiguityError(
          "Payment voucher dispatched but network failed. Funds quarantined until on-chain sync."
        );
      }
    });
  }

  public getLedger() {
    return this.ledger.getSnapshot();
  }
}