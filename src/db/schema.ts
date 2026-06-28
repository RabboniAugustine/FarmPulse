import {
  pgTable,
  text,
  uuid,
  integer,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("worker"), // "admin" | "worker"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const flocks = pgTable("flocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  breed: text("breed").notNull(),
  count: integer("count").notNull(),
  purpose: text("purpose").notNull(), // layers | broilers | dual-purpose
  ageWeeks: integer("age_weeks").notNull().default(0),
  hatchDate: text("hatch_date").default(""),
  dateAcquired: text("date_acquired").notNull(),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cages = pgTable("cages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  location: text("location").default(""),
  capacity: integer("capacity").notNull().default(1),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rabbits = pgTable("rabbits", {
  id: uuid("id").primaryKey().defaultRandom(),
  tagId: text("tag_id").notNull(),
  breed: text("breed").notNull(),
  sex: text("sex").notNull(),
  dob: text("dob").notNull(),
  weightKg: doublePrecision("weight_kg").notNull().default(0),
  status: text("status").notNull().default("active"),
  lastBredDate: text("last_bred_date").default(""),
  expectedKindleDate: text("expected_kindle_date").default(""),
  cageId: uuid("cage_id").references(() => cages.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pigs = pgTable("pigs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tagId: text("tag_id").notNull(),
  name: text("name").notNull(),
  breed: text("breed").notNull(),
  sex: text("sex").notNull(),
  dob: text("dob").notNull(),
  weightKg: doublePrecision("weight_kg").notNull().default(0),
  status: text("status").notNull().default("active"),
  expectedFarrowDate: text("expected_farrow_date").default(""),
  litterNumber: integer("litter_number").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eggLogs = pgTable("egg_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: text("date").notNull(),
  flockId: text("flock_id").notNull(),
  count: integer("count").notNull().default(0),
  damaged: integer("damaged").notNull().default(0),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: text("date").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull().default(0),
  animalGroup: text("animal_group").default(""),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: text("date").notNull(),
  product: text("product").notNull(),
  quantity: doublePrecision("quantity").notNull().default(0),
  unit: text("unit").default(""),
  pricePerUnit: doublePrecision("price_per_unit").notNull().default(0),
  buyer: text("buyer").default(""),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vaccinations = pgTable("vaccinations", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: text("date").notNull(),
  animalGroup: text("animal_group").notNull(),
  vaccine: text("vaccine").notNull(),
  dosage: text("dosage").default(""),
  administeredBy: text("administered_by").default(""),
  nextDueDate: text("next_due_date").default(""),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activity = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: text("date").notNull(),
  type: text("type").notNull(),
  subject: text("subject").notNull(),
  description: text("description").default(""),
  details: text("details").default(""),
  performedBy: text("performed_by").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Maps the "table" URL param used by the generic API route to the actual table.
export const TABLES = {
  flocks,
  rabbits,
  cages,
  pigs,
  "egg-logs": eggLogs,
  expenses,
  sales,
  vaccinations,
  activity,
} as const;

export type TableName = keyof typeof TABLES;
