export class MemorySandbox {
  public static wipe(buffer: Uint8Array): void {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(buffer);
    }
    buffer.fill(0);
  }
}