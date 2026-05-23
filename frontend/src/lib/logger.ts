export type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function isTestEnv(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV === "test";
}

function isDevEnv(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV === "development";
}

function envMinLevel(): LogLevel {
  const raw =
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel | undefined)) ||
    undefined;
  if (raw && raw in LEVEL_ORDER) return raw;
  return isDevEnv() ? "debug" : "info";
}

function shouldLog(level: LogLevel): boolean {
  if (isTestEnv()) return false;
  return LEVEL_ORDER[level] >= LEVEL_ORDER[envMinLevel()];
}

let globalContext: LogContext = {};

/** Add fields (e.g. userId, sessionId) to every subsequent log entry. */
export function setClientLogContext(context: LogContext): void {
  globalContext = { ...globalContext, ...context };
}

/** Remove a single field from the global log context. */
export function clearClientLogField(key: string): void {
  const next = { ...globalContext };
  delete next[key];
  globalContext = next;
}

/** For tests: wipe global context. */
export function _resetClientLogContextForTests(): void {
  globalContext = {};
}

function browserContext(): LogContext {
  if (typeof window === "undefined") return {};
  return {
    url: window.location?.pathname,
    ua: navigator?.userAgent?.slice(0, 80),
  };
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  if (!shouldLog(level)) return;
  const payload = {
    ...globalContext,
    ...browserContext(),
    ...(context ?? {}),
    msg: message,
    level,
    ts: new Date().toISOString(),
  };
  const fn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : level === "debug"
          ? console.debug
          : console.info;
  fn(`[SCENT:${level}]`, payload);
}

export const clientLogger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
