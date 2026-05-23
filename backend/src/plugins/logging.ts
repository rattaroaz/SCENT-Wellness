import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getLogger } from "../lib/logger";

type RequestWithLog = FastifyRequest & {
  startTime?: number;
  log?: ReturnType<typeof getLogger>;
};

/**
 * HTTP logging plugin: emits structured `request started` / `request completed` /
 * `request error` events with reqId, userId (after auth), method, url, status,
 * duration. Attaches `request.log` (Pino child) for downstream handlers.
 */
export async function registerLogging(app: FastifyInstance) {
  const httpLog = getLogger("http");

  app.addHook("onRequest", async (request: FastifyRequest) => {
    (request as RequestWithLog).startTime = Date.now();
    const reqLogger = httpLog.child({ reqId: request.id });
    (request as RequestWithLog).log = reqLogger;
    reqLogger.debug(
      { method: request.method, url: request.url, ip: request.ip },
      "request started"
    );
  });

  app.addHook("preHandler", async (request: FastifyRequest) => {
    const user = request.user as { id?: string } | undefined;
    if (user?.id) {
      const req = request as RequestWithLog;
      req.log = (req.log ?? httpLog).child({ userId: user.id }) as typeof req.log;
    }
  });

  app.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as RequestWithLog;
    const durationMs = req.startTime ? Date.now() - req.startTime : undefined;
    const user = request.user as { id?: string } | undefined;
    const baseLog = req.log ?? httpLog;
    const log = user?.id ? baseLog.child({ userId: user.id }) : baseLog;
    const level =
      reply.statusCode >= 500 ? "error" : reply.statusCode >= 400 ? "warn" : "info";

    log[level](
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs,
      },
      "request completed"
    );
  });

  app.addHook("onError", async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    const req = request as RequestWithLog;
    const log = req.log ?? httpLog;
    log.error(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        err: error,
      },
      "request error"
    );
  });
}
