import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { TABLES, TableName } from "@/db/schema";
import { eq } from "drizzle-orm";

function getTable(name: string) {
  return TABLES[name as TableName];
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { table: string; id: string } },
) {
  const table = getTable(params.table);
  if (!table) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
  const body = await req.json();
  delete body.id;
  delete body.createdAt;

  try {
    const [row] = await db
      .update(table as any)
      .set(body)
      .where(eq((table as any).id, params.id))
      .returning();
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { table: string; id: string } },
) {
  const table = getTable(params.table);
  if (!table) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
  await db.delete(table as any).where(eq((table as any).id, params.id));
  return NextResponse.json({ ok: true });
}
