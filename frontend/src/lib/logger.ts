type LogLevel = "debug" | "info" | "warn" | "error";

function isTestEnv(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV === "test";
}

function isDevEnv(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV === "development";
}

function shouldLog(level: LogLevel): boolean {
  if (isTestEnv()) return false;
  if (level === "debug" && !isDevEnv()) return false;
  return true;
}

function emit(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
) {
  if (!shouldLog(level)) return;
  const payload = context ? { ...context, msg: message } : { msg: message };
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
  debug: (message: string, context?: Record<string, unknown>) =>
    emit("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    emit("error", message, context),
};
