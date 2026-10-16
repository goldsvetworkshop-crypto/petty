export abstract class PettyError extends Error {
  abstract readonly code: string;
  constructor(message: string, public readonly metadata: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PolicyViolationError extends PettyError {
  readonly code = "POLICY_VIOLATION";
}

export class BudgetDepletedError extends PettyError {
  readonly code = "BUDGET_DEPLETED";
}

export class VelocityLimitError extends PettyError {
  readonly code = "VELOCITY_LIMIT_EXCEEDED";
}

export class SanctionsCheckFailedError extends PettyError {
  readonly code = "SANCTIONS_BLOCKED";
}

export class DistributedAmbiguityError extends PettyError {
  readonly code = "DISTRIBUTED_STATE_AMBIGUOUS";
}

export class SsrSecurityError extends PettyError {
  readonly code = "SSRF_DETECTED";
}