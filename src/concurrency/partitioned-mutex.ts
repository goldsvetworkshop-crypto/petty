export class PartitionedMutex {
  private partitions = new Map<string, Promise<void>>();

  public async runOnPartition<T>(
    partitionKey: string,
    timeoutMs: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const currentLock = this.partitions.get(partitionKey) ?? Promise.resolve();

    let release: () => void;
    const nextLock = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.partitions.set(partitionKey, currentLock.then(() => nextLock));

    try {
      await Promise.race([
        currentLock,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`[Petty Mutex] Partition '${partitionKey}' lock timeout.`)), timeoutMs)
        )
      ]);
      return await fn();
    } finally {
      release!();
      if (this.partitions.get(partitionKey) === nextLock) {
        this.partitions.delete(partitionKey);
      }
    }
  }
}