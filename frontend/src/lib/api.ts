import { clientLogger } from "./logger";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function createRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const method = (options.method || "GET").toUpperCase();
  const reqId = createRequestId();
  const headers: HeadersInit = {
    "x-request-id": reqId,
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  let body = options.body;
  if (body === undefined && ["POST", "PUT", "PATCH"].includes(method)) {
    body = "{}";
  }
  if (body !== undefined) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const start = Date.now();
  clientLogger.debug("api request", { method, path, reqId });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      method,
      body,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      clientLogger.warn("api request timeout", { method, path, reqId });
      throw new Error("Request timed out. Please try again.");
    }
    clientLogger.error("api network error", {
      method,
      path,
      reqId,
      durationMs: Date.now() - start,
      err: String(err),
    });
    throw new Error(
      `Cannot reach the API at ${API_URL}. Run "npm run dev" from the project root and ensure the backend is on port 3001.`
    );
  }
  clearTimeout(timeout);

  const durationMs = Date.now() - start;
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    clientLogger.warn("api error response", {
      method,
      path,
      reqId,
      status: res.status,
      durationMs,
    });
    if (res.status === 401 && !path.startsWith("/auth/login")) {
      setToken(null);
      throw new Error("Session expired. Please log in again.");
    }
    const err = (data as { error?: string | Record<string, unknown> }).error;
    if (typeof err === "string") throw new Error(err);
    if (err && typeof err === "object") {
      throw new Error(
        "Validation failed. Check message fields and try again."
      );
    }
    throw new Error(res.statusText || "Request failed");
  }

  clientLogger.debug("api success", {
    method,
    path,
    reqId,
    status: res.status,
    durationMs,
  });
  return data as T;
}
