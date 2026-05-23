import { Role } from "@prisma/client";
import { FastifyRequest } from "fastify";

export type JwtUser = {
  id: string;
  username: string;
  role: Role;
};

export function getUser(request: FastifyRequest): JwtUser | null {
  const user = request.user as JwtUser | undefined;
  return user ?? null;
}

export function requireAuth(request: FastifyRequest): JwtUser {
  const user = getUser(request);
  if (!user) {
    const err = new Error("Unauthorized");
    (err as Error & { statusCode: number }).statusCode = 401;
    throw err;
  }
  return user;
}

export function canEditTemplates(role: Role): boolean {
  return role === Role.ADMIN || role === Role.USER;
}
