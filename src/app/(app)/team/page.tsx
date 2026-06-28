"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Trash2, UserPlus } from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function TeamPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "worker" });
  const [error, setError] = useState("");

  const isAdmin = (session?.user as any)?.role === "admin";

  async function load() {
    const res = await fetch("/api/users");
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const { error } = await res.json();
      setError(error || "Could not create account");
      return;
    }
    setForm({ name: "", email: "", password: "", role: "worker" });
    load();
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this team member?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  }

  if (!isAdmin && !loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Only admins can manage the team.
        </p>
        <Link href="/dashboard" className="text-sm underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-2xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>
      <h1 className="text-lg font-semibold mb-4">Team</h1>

      <form onSubmit={handleAdd} className="border border-border bg-card p-4 mb-6 space-y-3">
        <p className="text-xs font-mono uppercase text-muted-foreground">Add team member</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-3 py-2 text-sm border border-border bg-[var(--input-background)]"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="px-3 py-2 text-sm border border-border bg-[var(--input-background)]"
          />
          <input
            required
            type="password"
            placeholder="Temporary password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="px-3 py-2 text-sm border border-border bg-[var(--input-background)]"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="px-3 py-2 text-sm border border-border bg-[var(--input-background)]"
          >
            <option value="worker">Worker</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error && <p className="text-xs" style={{ color: "var(--destructive)" }}>{error}</p>}
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <UserPlus size={14} /> Add member
        </button>
      </form>

      <div className="border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-3 py-2 text-xs font-mono uppercase text-muted-foreground">Name</th>
              <th className="text-left px-3 py-2 text-xs font-mono uppercase text-muted-foreground">Email</th>
              <th className="text-left px-3 py-2 text-xs font-mono uppercase text-muted-foreground">Role</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-3 py-2">{m.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{m.email}</td>
                <td className="px-3 py-2 font-mono text-xs">{m.role}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => handleRemove(m.id)} title="Remove">
                    <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
