export class TransactionQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const runTask = this.tail.then(task, task);
    this.tail = runTask.catch(() => undefined);
    return runTask;
  }
}

export const expTransactionQueue = new TransactionQueue();
