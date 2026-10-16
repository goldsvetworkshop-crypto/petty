import { VelocityLimitError } from "../errors.js";

export class VelocityGuard {
  private spendHistory: { timestamp: number; amount: bigint }[] = [];

  constructor(
    private maxAmountPerWindow: bigint,
    private windowMs: number
  ) {}

  public recordAndCheck(amount: bigint): void {
    const now = Date.now();
    this.spendHistory = this.spendHistory.filter((entry) => now - entry.timestamp < this.windowMs);
    const currentWindowTotal = this.spendHistory.reduce((acc, cur) => acc + cur.amount, 0n);

    if (currentWindowTotal + amount > this.maxAmountPerWindow) {
      throw new VelocityLimitError(
        `Velocity cap exceeded. Window Total: ${currentWindowTotal}, Cap: ${this.maxAmountPerWindow}`
      );
    }
    this.spendHistory.push({ timestamp: now, amount });
  }
}