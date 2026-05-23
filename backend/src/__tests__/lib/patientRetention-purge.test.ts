import { describe, it, expect } from "vitest";
import { prisma } from "../../lib/prisma";
import {
  PATIENT_RETENTION_DAYS,
  purgeExpiredPatients,
} from "../../lib/patientRetention";

describe("patientRetention purge", () => {
  it("removes patients whose createdAt is older than retention", async () => {
    const expiredAt = new Date(
      Date.now() - (PATIENT_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000
    );

    const expired = await prisma.patient.create({
      data: {
        lastName: "Old",
        firstName: "Patient",
        dateOfBirth: "1980-01-01",
        mrn: `OLD-${Date.now()}`,
        cellPhone: "5550000001",
        createdAt: expiredAt,
      },
    });
    const fresh = await prisma.patient.create({
      data: {
        lastName: "New",
        firstName: "Patient",
        dateOfBirth: "1990-01-01",
        mrn: `NEW-${Date.now()}`,
        cellPhone: "5550000002",
      },
    });

    const purged = await purgeExpiredPatients();
    expect(purged).toBeGreaterThanOrEqual(1);

    expect(
      await prisma.patient.findUnique({ where: { id: expired.id } })
    ).toBeNull();
    expect(
      await prisma.patient.findUnique({ where: { id: fresh.id } })
    ).toBeTruthy();
  });

  it("returns 0 when nothing is expired", async () => {
    await prisma.patient.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - PATIENT_RETENTION_DAYS * 24 * 60 * 60 * 1000),
        },
      },
    });
    const purged = await purgeExpiredPatients();
    expect(purged).toBe(0);
  });
});
