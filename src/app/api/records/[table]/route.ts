import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { TABLES, TableName, activity } from "@/db/schema";
import { desc } from "drizzle-orm";

function getTable(name: string) {
  return TABLES[name as TableName];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { table: string } },
) {
  const table = getTable(params.table);
  if (!table) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
  const rows = await db.select().from(table as any).orderBy(desc((table as any).createdAt));
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { table: string } },
) {
  const table = getTable(params.table);
  if (!table) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
  const body = await req.json();
  delete body.id;
  delete body.createdAt;

  try {
    const [row] = await db.insert(table as any).values(body).returning();

    // Log to activity feed unless we're already writing to it
    if (params.table !== "activity" && body.__activity) {
      await db.insert(activity).values(body.__activity);
    }

    return NextResponse.json(row, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
