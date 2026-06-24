export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
  signal?: AbortSignal
): Promise<T> {
  throwIfAborted(signal);

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error(message));
    }, ms);

    signal?.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (value) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  ms: number,
  message: string,
  signal?: AbortSignal
): Promise<Response> {
  throwIfAborted(signal);
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    return await withTimeout(
      fetch(input, { ...init, signal: controller.signal }),
      ms,
      message,
      signal
    );
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}
