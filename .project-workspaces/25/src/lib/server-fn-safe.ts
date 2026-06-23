// Helper: convert thrown Response objects (from auth middleware) and unexpected
// errors into a structured `{ ok, ... }` result. Without this, server fn
// rejections surface in the browser as the unhelpful "Error: [object Response]"
// runtime error and trigger a blank screen via the global error boundary.

export type SafeOk<T> = { ok: true; data: T };
export type SafeErr = { ok: false; status: number; error: string };
export type SafeResult<T> = SafeOk<T> | SafeErr;

export async function safeRun<T>(task: () => Promise<T>): Promise<SafeResult<T>> {
  try {
    const data = await task();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof Response) {
      let body = "";
      try {
        body = await error.clone().text();
      } catch {
        body = "";
      }
      return {
        ok: false,
        status: error.status || 500,
        error: body || error.statusText || "Request failed",
      };
    }

    const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
    return { ok: false, status: 500, error: message };
  }
}
