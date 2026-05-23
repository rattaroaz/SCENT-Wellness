import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PHYSICIAN_PHONES } from "../src/lib/physicianPhones";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("password", 10);

  const users = [
    { username: "admin", role: Role.ADMIN },
    { username: "user", role: Role.USER },
    { username: "guest", role: Role.GUEST },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: hash, role: u.role },
      create: { username: u.username, role: u.role, passwordHash: hash },
    });
  }

  const labels = ["Physician Line 1", "Physician Line 2", "Physician Line 3"];
  for (let i = 0; i < PHYSICIAN_PHONES.length; i++) {
    const physicianPhone = PHYSICIAN_PHONES[i];
    await prisma.physicianForward.upsert({
      where: { physicianPhone },
      update: { enabled: true, label: labels[i] },
      create: {
        physicianPhone,
        label: labels[i],
        enabled: true,
      },
    });
  }

  console.log("Seeded users: admin, user, guest (password: password)");
  console.log("Seeded physician phones:", PHYSICIAN_PHONES.join(", "));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
