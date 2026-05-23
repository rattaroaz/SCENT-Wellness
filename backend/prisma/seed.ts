import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

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

  const existing = await prisma.physicianForward.count();
  if (existing === 0) {
    await prisma.physicianForward.create({
      data: { physicianPhone: "+15551234567", enabled: true },
    });
  }

  console.log("Seeded users: admin, user, guest (password: password)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
