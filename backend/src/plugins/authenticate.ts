import { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const auth = request.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      throw new Error("No token");
    }
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}
