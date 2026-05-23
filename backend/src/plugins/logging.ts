import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getLogger } from "../lib/logger";

type RequestWithLog = FastifyRequest & {
  startTime?: number;
  log?: ReturnType<typeof getLogger>;
};

export async function registerLogging(app: FastifyInstance) {
  const httpLog = getLogger("http");

  app.addHook("onRequest", async (request: FastifyRequest) => {
    (request as RequestWithLog).startTime = Date.now();
  });

  app.addHook("preHandler", async (request: FastifyRequest) => {
    const user = request.user as { id?: string } | undefined;
    const reqLogger = httpLog.child({
      reqId: request.id,
      ...(user?.id ? { userId: user.id } : {}),
    });
    (request as RequestWithLog).log = reqLogger;
    reqLogger.debug(
      { method: request.method, url: request.url, ip: request.ip },
      "request started"
    );
  });

  app.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as RequestWithLog;
    const durationMs = req.startTime ? Date.now() - req.startTime : undefined;
    const log = req.log ?? httpLog;
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
