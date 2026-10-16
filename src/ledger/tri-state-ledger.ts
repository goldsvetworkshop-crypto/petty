import { BudgetDepletedError } from "../errors.js";

export class TriStateLedger {
  private availableBalance: bigint;
  private reservedBalance: bigint = 0n;
  private settledBalance: bigint = 0n;
  private ambiguousBalance: bigint = 0n;

  constructor(totalBudget: bigint) {
    this.availableBalance = totalBudget;
  }

  public reserve(amount: bigint): void {
    if (amount > this.availableBalance) {
      throw new BudgetDepletedError(
        `Insufficient budget. Requested: ${amount}, Available: ${this.availableBalance}`
      );
    }
    this.availableBalance -= amount;
    this.reservedBalance += amount;
  }

  public commit(amount: bigint): void {
    if (amount > this.reservedBalance) {
      throw new Error(`[Petty Ledger] Cannot commit unreserved balance.`);
    }
    this.reservedBalance -= amount;
    this.settledBalance += amount;
  }

  public quarantineAmbiguous(amount: bigint): void {
    if (amount > this.reservedBalance) {
      throw new Error(`[Petty Ledger] Cannot quarantine unreserved balance.`);
    }
    this.reservedBalance -= amount;
    this.ambiguousBalance += amount;
  }

  public releaseAmbiguous(amount: bigint): void {
    if (amount > this.ambiguousBalance) {
      throw new Error(`[Petty Ledger] Cannot release more than ambiguous balance.`);
    }
    this.ambiguousBalance -= amount;
    this.availableBalance += amount;
  }

  public confirmAmbiguousSettlement(amount: bigint): void {
    if (amount > this.ambiguousBalance) {
      throw new Error(`[Petty Ledger] Cannot settle more than ambiguous balance.`);
    }
    this.ambiguousBalance -= amount;
    this.settledBalance += amount;
  }

  public getSnapshot() {
    return {
      available: this.availableBalance,
      reserved: this.reservedBalance,
      settled: this.settledBalance,
      ambiguous: this.ambiguousBalance
    };
  }
}