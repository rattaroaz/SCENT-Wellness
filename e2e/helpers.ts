import type { APIRequestContext } from "@playwright/test";

const API_URL =
  process.env.E2E_API_URL ||
  `http://127.0.0.1:${process.env.E2E_API_PORT || "3011"}`;

export async function loginApi(
  request: APIRequestContext,
  username = "admin",
  password = "password"
): Promise<string> {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { username, password },
  });
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.token as string;
}

export async function createTemplateViaApi(
  request: APIRequestContext,
  token: string,
  name: string
): Promise<string> {
  const res = await request.post(`${API_URL}/templates`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      messages: [
        {
          body: "How are you feeling today?",
          weeks: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expectsResponse: true,
        },
      ],
    },
  });
  if (!res.ok()) {
    throw new Error(`Create template failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.template.id as string;
}

export async function createPatientViaApi(
  request: APIRequestContext,
  token: string,
  mrn: string
): Promise<{ id: string; firstName: string; lastName: string }> {
  const res = await request.post(`${API_URL}/patients`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      lastName: "E2E",
      firstName: "Patient",
      dateOfBirth: "1985-06-15",
      mrn,
      cellPhone: "5555551234",
    },
  });
  if (!res.ok()) {
    throw new Error(`Create patient failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.patient;
}
