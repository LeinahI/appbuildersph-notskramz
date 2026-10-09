/** Runs one job at a time, in arrival order. One model on one device: parallel requests only slow each other. */
export function oneAtATime(): <T>(job: () => Promise<T>) => Promise<T> {
  let queue: Promise<unknown> = Promise.resolve();
  return (job) => {
    const run = queue.then(job);
    queue = run.catch(() => undefined);
    return run;
  };
}
