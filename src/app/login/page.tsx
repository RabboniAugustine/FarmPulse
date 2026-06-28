"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center"
            style={{ backgroundColor: "#C97C1A" }}
          >
            <Package size={15} className="text-white" />
          </div>
          <p className="text-lg font-semibold text-foreground tracking-tight">
            FarmPulse
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border border-border bg-card p-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-mono uppercase text-muted-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border bg-[var(--input-background)] focus:outline-none focus:ring-1"
              style={{ "--tw-ring-color": "var(--ring)" } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-muted-foreground mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border bg-[var(--input-background)] focus:outline-none focus:ring-1"
            />
          </div>

          {error && (
            <p className="text-xs font-mono" style={{ color: "var(--destructive)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
