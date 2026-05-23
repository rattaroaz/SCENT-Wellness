import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../index";
import { FastifyInstance } from "fastify";
import { createTestUser, getAuthHeader, createTestPatient } from "../../test/helpers";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";

describe("DELETE /patients/:id", () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    const user = await createTestUser(Role.USER);
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: user.username, password: "password" },
    });
    token = JSON.parse(login.body).token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("deletes a patient and related data", async () => {
    const patient = await createTestPatient();
    const res = await app.inject({
      method: "DELETE",
      url: `/patients/${patient.id}`,
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const gone = await prisma.patient.findUnique({ where: { id: patient.id } });
    expect(gone).toBeNull();
  });
});
