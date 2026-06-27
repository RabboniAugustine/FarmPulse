import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if ((session.user as any).id === params.id) {
    return NextResponse.json(
      { error: "You can't remove your own account" },
      { status: 400 },
    );
  }
  await db.delete(users).where(eq(users.id, params.id));
  return NextResponse.json({ ok: true });
}
