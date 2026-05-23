import { clientLogger } from "./logger";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  const method = options.method || "GET";
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const start = Date.now();
  clientLogger.debug("api request", { method, path });

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    clientLogger.error("api network error", {
      method,
      path,
      durationMs: Date.now() - start,
      err: String(err),
    });
    throw err;
  }

  const durationMs = Date.now() - start;
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    clientLogger.warn("api error response", {
      method,
      path,
      status: res.status,
      durationMs,
    });
    const err = (data as { error?: string | Record<string, unknown> }).error;
    if (typeof err === "string") throw new Error(err);
    if (err && typeof err === "object") {
      throw new Error(
        "Validation failed. Check message fields and try again."
      );
    }
    throw new Error(res.statusText || "Request failed");
  }

  clientLogger.debug("api success", { method, path, status: res.status, durationMs });
  return data as T;
}
