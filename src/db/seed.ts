import { db } from "./index";
import { users, flocks, rabbits, pigs, cages } from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@farmpulse.app";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail));

  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const adminUser = {
      name: "Admin",
      email: adminEmail,
      passwordHash,
      role: "admin",
    };
    await db.insert(users).values(adminUser);
    console.log(`Created admin user: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log("Admin user already exists, skipping.");
  }

  const cageCount = await db.select().from(cages);
  let sampleCageId: string | undefined;
  if (cageCount.length === 0) {
    const inserted = await db
      .insert(cages)
      .values([
        { name: "Cage A1", location: "Rabbitry - North Row", capacity: 4, notes: "Breeding does" },
        { name: "Cage A2", location: "Rabbitry - North Row", capacity: 6, notes: "Growers" },
        { name: "Cage B1", location: "Rabbitry - South Row", capacity: 1, notes: "Buck pen" },
      ])
      .returning({ id: cages.id, name: cages.name });
    sampleCageId = inserted[0]?.id;
    console.log("Seeded starter cages.");
  }

  const flockCount = await db.select().from(flocks);
  if (flockCount.length === 0) {
    await db.insert(flocks).values([
      {
        name: "Layer Flock A",
        breed: "ISA Brown",
        count: 32,
        purpose: "layers",
        ageWeeks: 54,
        dateAcquired: "2025-06-10",
        notes: "Consistent producers, peak production",
      },
      {
        name: "SASO Growers",
        breed: "SASO",
        count: 100,
        purpose: "broilers",
        ageWeeks: 1,
        dateAcquired: "2026-06-17",
        notes: "Day-old chicks, just acquired",
      },
    ]);
    await db.insert(rabbits).values([
      {
        tagId: "R-001",
        breed: "New Zealand White",
        sex: "female",
        dob: "2025-01-15",
        weightKg: 3.8,
        status: "breeding",
        lastBredDate: "2026-06-01",
        expectedKindleDate: "2026-07-01",
        cageId: sampleCageId,
      },
    ]);
    await db.insert(pigs).values([
      {
        tagId: "P-001",
        name: "Bessie",
        breed: "Large White x Landrace",
        sex: "sow",
        dob: "2024-08-15",
        weightKg: 185,
        status: "pregnant",
        expectedFarrowDate: "2026-07-08",
        litterNumber: 2,
      },
    ]);
    console.log("Seeded starter farm data.");
  } else {
    console.log("Farm data already present, skipping.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
