export function formatPublishError(e: unknown, fallback: string): string {
  if (typeof e === "string" && e.trim()) return e;

  if (e instanceof DOMException && e.name === "AbortError") {
    return "Upload cancelled.";
  }

  if (e instanceof Error) {
    const agg = e as AggregateError;
    if (Array.isArray(agg.errors) && agg.errors.length > 0) {
      return formatPublishError(agg.errors[0], fallback);
    }
    if (e.message.trim()) return e.message;
  }

  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }

  return fallback;
}
