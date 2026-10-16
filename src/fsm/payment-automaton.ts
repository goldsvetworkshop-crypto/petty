import { PaymentState } from "../types.js";

export class PaymentAutomaton {
  private state: PaymentState = PaymentState.IDLE;

  private static readonly TRANSITIONS: Record<PaymentState, PaymentState[]> = {
    [PaymentState.IDLE]: [PaymentState.RESERVED],
    [PaymentState.RESERVED]: [PaymentState.SIGNED, PaymentState.IDLE],
    [PaymentState.SIGNED]: [PaymentState.DISPATCHED],
    [PaymentState.DISPATCHED]: [PaymentState.SETTLED, PaymentState.AMBIGUOUS],
    [PaymentState.SETTLED]: [PaymentState.IDLE],
    [PaymentState.AMBIGUOUS]: [PaymentState.RECONCILED_VOID, PaymentState.SETTLED],
    [PaymentState.RECONCILED_VOID]: [PaymentState.IDLE]
  };

  public get currentState(): PaymentState {
    return this.state;
  }

  public transition(next: PaymentState): void {
    const valid = PaymentAutomaton.TRANSITIONS[this.state];
    if (!valid.includes(next)) {
      throw new Error(`[Petty FSM] Illegal transition from ${this.state} to ${next}`);
    }
    this.state = next;
  }
}