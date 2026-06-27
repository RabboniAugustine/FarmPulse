import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __farmpulse_pg__: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Reuse the connection across hot-reloads / lambda invocations.
const client =
  global.__farmpulse_pg__ ??
  postgres(connectionString, { max: 1, ssl: "require" });

if (process.env.NODE_ENV !== "production") {
  global.__farmpulse_pg__ = client;
}

export const db = drizzle(client, { schema });
