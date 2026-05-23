import pino, { type Logger as PinoLogger, type LoggerOptions } from "pino";
import { join } from "path";

export type LogLevel =
  | "silent"
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal";

const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
const logLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (isTest ? "silent" : isProd ? "info" : "debug");

const redactPaths = [
  "req.headers.authorization",
  "req.body.password",
  "req.body.passwordHash",
  "password",
  "passwordHash",
  "token",
  "jwt",
  "*.password",
  "*.token",
  "metadata.cellPhone",
  "metadata.dateOfBirth",
];

function createBaseConfig(): LoggerOptions {
  const targets: pino.TransportTargetOptions[] = [];

  if (!isTest && !isProd) {
    targets.push({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
        singleLine: false,
      },
      level: logLevel,
    });
  }

  const logFile = process.env.LOG_FILE;
  if (logFile && !isTest) {
    targets.push({
      target: "pino/file",
      options: { destination: join(process.cwd(), logFile) },
      level: logLevel,
    });
  }

  const transport =
    targets.length === 1
      ? targets[0]
      : targets.length > 1
        ? { targets }
        : undefined;

  return {
    level: logLevel,
    redact: {
      paths: redactPaths,
      censor: "[REDACTED]",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    ...(transport ? { transport } : {}),
  };
}

let rootLogger: PinoLogger = pino(createBaseConfig());

export function getLogger(name?: string): PinoLogger {
  if (!name) return rootLogger;
  return rootLogger.child({ module: name });
}

export function setRootLogger(logger: PinoLogger): void {
  rootLogger = logger;
}

export function createRequestLogger(
  reqId: string,
  userId?: string
): PinoLogger {
  return rootLogger.child({
    reqId,
    ...(userId ? { userId } : {}),
  });
}

export type { PinoLogger as Logger };
