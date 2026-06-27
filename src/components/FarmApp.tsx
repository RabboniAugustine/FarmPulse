"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Bird, Rabbit, PiggyBank, LayoutDashboard, TrendingUp,
  DollarSign, Syringe, Download, Plus, X, Egg,
  Calendar, AlertTriangle, ChevronRight, Trash2,
  Package, ArrowUpRight, ArrowDownRight, ScrollText,
  AlertCircle, RefreshCw, LogOut,
} from "lucide-react";
import { useSyncedRecords } from "@/lib/useSyncedRecords";

// ─── Types ────────────────────────────────────────────────────────────────────
type NavSection =
  | "dashboard" | "poultry" | "rabbits" | "pigs"
  | "production" | "expenses" | "sales" | "vaccinations" | "activity";

interface Flock {
  id: string; name: string; breed: string; count: number;
  purpose: "layers" | "broilers" | "dual-purpose";
  ageWeeks: number; dateAcquired: string; notes: string;
}
interface RabbitRecord {
  id: string; tagId: string; breed: string; sex: "male" | "female";
  dob: string; weightKg: number;
  status: "active" | "breeding" | "pregnant" | "sold" | "deceased";
  lastBredDate: string; expectedKindleDate: string;
  cageId: string | null;
}
interface Cage {
  id: string; name: string; location: string; capacity: number; notes: string;
}
interface PigRecord {
  id: string; tagId: string; name: string; breed: string;
  sex: "boar" | "sow" | "gilt" | "barrow";
  dob: string; weightKg: number;
  status: "active" | "pregnant" | "farrowing" | "sold";
  expectedFarrowDate: string; litterNumber: number;
}
interface EggLog {
  id: string; date: string; flockId: string;
  count: number; damaged: number; notes: string;
}
interface Expense {
  id: string; date: string;
  category: "feed" | "medication" | "equipment" | "labor" | "utilities" | "other";
  description: string; amount: number; animalGroup: string; notes: string;
}
interface Sale {
  id: string; date: string;
  product: "eggs" | "live-birds" | "meat" | "rabbits" | "pigs" | "other";
  quantity: number; unit: string; pricePerUnit: number; buyer: string; notes: string;
}
interface Vaccination {
  id: string; date: string; animalGroup: string;
  vaccine: string; dosage: string; administeredBy: string;
  nextDueDate: string; notes: string;
}
interface ActivityEntry {
  id: string; date: string;
  type: "death" | "status_change" | "sale" | "vaccination" | "expense" | "added" | "note";
  subject: string;
  description: string;
  details: string;
}


// ─── Utilities ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const fmt = (n: number) => `GHS ${n.toLocaleString("en-GH")}`;
const fmtDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
};
const ageFromDob = (dob: string) => {
  const days = Math.floor((new Date().getTime() - new Date(dob).getTime()) / 86400000);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}yr ${Math.floor((days % 365) / 30)}mo`;
};
const daysUntil = (d: string) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - new Date().getTime()) / 86400000);
};
function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
const uid = () => Math.random().toString(36).slice(2, 9);

// ─── UI Primitives ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, trend }: {
  label: string; value: string; sub?: string; trend?: "up" | "down" | null;
}) {
  return (
    <div className="p-4 bg-card border border-border">
      <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-semibold tracking-tight font-mono">{value}</p>
        {trend === "up" && <ArrowUpRight size={16} className="text-green-600 mb-1" />}
        {trend === "down" && <ArrowDownRight size={16} className="text-red-500 mb-1" />}
      </div>
      {sub && <p className="text-xs text-muted-foreground mt-0.5 font-mono">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", type = "button" }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md"; type?: "button" | "submit";
}) {
  const sizes = { sm: "px-2.5 py-1 text-xs", md: "px-3 py-1.5 text-sm" };
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-border bg-card hover:bg-muted text-foreground",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  };
  return (
    <button type={type} onClick={onClick}
      className={`inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${sizes[size]} ${variants[variant]}`}>
      {children}
    </button>
  );
}

function Badge({ label, color }: { label: string; color: "green" | "amber" | "red" | "blue" | "gray" }) {
  const colors = {
    green: "bg-green-100 text-green-800 border border-green-200",
    amber: "bg-amber-100 text-amber-800 border border-amber-200",
    red: "bg-red-100 text-red-800 border border-red-200",
    blue: "bg-sky-100 text-sky-800 border border-sky-200",
    gray: "bg-muted text-muted-foreground border border-border",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-mono font-medium ${colors[color]}`}>
      {label}
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-border px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors";
const selectCls = "w-full border border-border px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-1 focus:ring-accent/60";
const textareaCls = "w-full border border-border px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-1 focus:ring-accent/60 resize-none";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TH({ children }: { children?: React.ReactNode }) {
  return <th className="text-left text-xs font-mono uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border bg-muted/40">{children}</th>;
}
function TD({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`px-3 py-2.5 text-sm border-b border-border/50 ${mono ? "font-mono" : ""}`}>{children}</td>;
}

// ─── Activity Log Section ─────────────────────────────────────────────────────
const activityIcon: Record<ActivityEntry["type"], React.ReactNode> = {
  death: <AlertCircle size={14} className="text-red-600" />,
  status_change: <RefreshCw size={14} className="text-sky-600" />,
  sale: <TrendingUp size={14} className="text-green-600" />,
  vaccination: <Syringe size={14} className="text-purple-600" />,
  expense: <DollarSign size={14} className="text-amber-600" />,
  added: <Plus size={14} className="text-primary" />,
  note: <ScrollText size={14} className="text-muted-foreground" />,
};
const activityBg: Record<ActivityEntry["type"], string> = {
  death: "border-red-200 bg-red-50",
  status_change: "border-sky-200 bg-sky-50",
  sale: "border-green-200 bg-green-50",
  vaccination: "border-purple-200 bg-purple-50",
  expense: "border-amber-200 bg-amber-50",
  added: "border-primary/20 bg-primary/5",
  note: "border-border bg-card",
};

function ActivitySection({ activity, onAdd }: {
  activity: ActivityEntry[]; onAdd: (a: ActivityEntry) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: today(), type: "note", subject: "", description: "", details: "" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ id: uid(), date: form.date, type: form.type as ActivityEntry["type"], subject: form.subject, description: form.description, details: form.details });
    setShowModal(false);
    setForm({ date: today(), type: "note", subject: "", description: "", details: "" });
  };

  const sorted = [...activity].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="p-6">
      <SectionHeader title="Activity Log">
        <Btn variant="outline" size="sm" onClick={() => exportCSV(activity as unknown as Record<string, unknown>[], "activity.csv")}>
          <Download size={14} /> Export
        </Btn>
        <Btn size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Add Note</Btn>
      </SectionHeader>

      <p className="text-xs text-muted-foreground font-mono mb-5">{activity.length} events recorded across all livestock</p>

      <div className="space-y-2">
        {sorted.map(a => (
          <div key={a.id} className={`flex gap-3 p-3 border ${activityBg[a.type]}`}>
            <div className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center">
              {activityIcon[a.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{a.description}</p>
                <span className="text-xs font-mono text-muted-foreground shrink-0">{fmtDate(a.date)}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground">{a.subject}</span>
                {a.details && <span className="text-xs text-muted-foreground">· {a.details}</span>}
              </div>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12 font-mono">No activity logged yet.</p>
        )}
      </div>

      {showModal && (
        <Modal title="Add Activity Note" onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date"><input required type="date" className={inputCls} value={form.date} onChange={e => set("date", e.target.value)} /></FormField>
              <FormField label="Type">
                <select className={selectCls} value={form.type} onChange={e => set("type", e.target.value)}>
                  <option value="note">Note</option>
                  <option value="death">Death</option>
                  <option value="status_change">Status Change</option>
                  <option value="added">Animal Added</option>
                  <option value="vaccination">Vaccination</option>
                  <option value="expense">Expense</option>
                  <option value="sale">Sale</option>
                </select>
              </FormField>
            </div>
            <FormField label="Subject (animal / flock name)"><input required className={inputCls} value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="e.g. R-005, Layer Flock A" /></FormField>
            <FormField label="Description"><input required className={inputCls} value={form.description} onChange={e => set("description", e.target.value)} /></FormField>
            <FormField label="Details (optional)"><textarea className={textareaCls} rows={2} value={form.details} onChange={e => set("details", e.target.value)} /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn type="submit">Save Entry</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Dashboard Section ─────────────────────────────────────────────────────────
function DashboardSection({ flocks, rabbits, pigs, eggLogs, expenses, sales, activity, onNavigate }: {
  flocks: Flock[]; rabbits: RabbitRecord[]; pigs: PigRecord[];
  eggLogs: EggLog[]; expenses: Expense[]; sales: Sale[];
  activity: ActivityEntry[];
  onNavigate: (s: NavSection) => void;
}) {
  const totalAnimals = flocks.reduce((s, f) => s + f.count, 0) + rabbits.length + pigs.length;
  const todayEggs = eggLogs.find(e => e.date === today())?.count ?? 0;

  const monthRevenue = useMemo(() =>
    sales.filter(s => s.date.startsWith("2026-06")).reduce((sum, s) => sum + s.quantity * s.pricePerUnit, 0),
    [sales]);
  const monthExpenses = useMemo(() =>
    expenses.filter(e => e.date.startsWith("2026-06")).reduce((sum, e) => sum + e.amount, 0),
    [expenses]);

  const eggChartData = eggLogs.slice(-14).map(e => ({
    date: e.date.slice(5),
    eggs: e.count,
  }));

  const monthlyData = useMemo(() => {
    const months = [
      { key: "2026-04", label: "Apr" },
      { key: "2026-05", label: "May" },
      { key: "2026-06", label: "Jun" },
    ];
    return months.map(({ key, label }) => ({
      month: label,
      revenue: sales.filter(s => s.date.startsWith(key)).reduce((sum, s) => sum + s.quantity * s.pricePerUnit, 0),
      expenses: expenses.filter(e => e.date.startsWith(key)).reduce((sum, e) => sum + e.amount, 0),
    }));
  }, [sales, expenses]);

  const recentActivity = [...activity].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Farm Overview</h1>
        <p className="text-sm text-muted-foreground font-mono mt-0.5">24 Jun 2026 · FarmPulse</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Animals" value={totalAnimals.toString()} sub={`${flocks.reduce((s,f)=>s+f.count,0)} poultry · ${rabbits.length} rabbits · ${pigs.length} pigs`} />
        <StatCard label="Today's Eggs" value={todayEggs.toString()} sub={`${Math.round(todayEggs/32*100)}% lay rate`} trend="up" />
        <StatCard label="Jun Revenue" value={`GHS ${(monthRevenue/1000).toFixed(1)}k`} sub="from egg & rabbit sales" trend="up" />
        <StatCard label="Jun Expenses" value={`GHS ${(monthExpenses/1000).toFixed(1)}k`} sub={`profit: GHS ${((monthRevenue-monthExpenses)/1000).toFixed(1)}k`} trend={monthRevenue > monthExpenses ? "up" : "down"} />
      </div>

      {pigs.filter(p => p.status === "pregnant").map(p => {
        const days = daysUntil(p.expectedFarrowDate);
        return (
          <div key={p.id} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-300">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{p.name} is due to farrow in <span className="font-mono font-semibold">{days} days</span></p>
              <p className="text-xs text-muted-foreground font-mono">Expected: {fmtDate(p.expectedFarrowDate)} · Litter #{p.litterNumber}</p>
            </div>
            <button className="ml-auto text-xs text-amber-700 hover:underline" onClick={() => onNavigate("pigs")}>View <ChevronRight size={12} className="inline" /></button>
          </div>
        );
      })}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Egg Production — Last 14 Days</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={eggChartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="eggGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2B5219" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2B5219" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,24,16,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
              <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }} domain={[0, 35]} />
              <Tooltip contentStyle={{ fontSize: 12, fontFamily: "var(--font-mono)", border: "1px solid var(--border)", background: "var(--card)" }} />
              <Area type="monotone" dataKey="eggs" stroke="#2B5219" strokeWidth={2} fill="url(#eggGrad)" name="Eggs" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Revenue vs Expenses (3 months)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,24,16,0.08)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
              <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ fontSize: 12, fontFamily: "var(--font-mono)", border: "1px solid var(--border)", background: "var(--card)" }} formatter={(v: number) => `GHS ${v.toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
              <Bar dataKey="revenue" fill="#2B5219" name="Revenue" />
              <Bar dataKey="expenses" fill="#C97C1A" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Bird size={16} />, label: "Poultry", sub: `${flocks.reduce((s,f)=>s+f.count,0)} birds`, nav: "poultry" as NavSection },
          { icon: <Rabbit size={16} />, label: "Rabbits", sub: `${rabbits.length} recorded`, nav: "rabbits" as NavSection },
          { icon: <PiggyBank size={16} />, label: "Pigs", sub: `${pigs.length} animals`, nav: "pigs" as NavSection },
          { icon: <Egg size={16} />, label: "Egg Log", sub: `${eggLogs.reduce((s,e)=>s+e.count,0)} total eggs`, nav: "production" as NavSection },
        ].map(({ icon, label, sub, nav }) => (
          <button key={nav} onClick={() => onNavigate(nav)}
            className="text-left p-3 bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors group">
            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary mb-1">{icon}<span className="text-xs font-mono uppercase tracking-wide">{label}</span></div>
            <p className="text-sm font-semibold">{sub}</p>
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Recent Activity</p>
          <button onClick={() => onNavigate("activity")} className="text-xs text-primary hover:underline font-mono">View all →</button>
        </div>
        <div className="space-y-1.5">
          {recentActivity.map(a => (
            <div key={a.id} className={`flex gap-3 p-2.5 border ${activityBg[a.type]}`}>
              <div className="mt-0.5 shrink-0">{activityIcon[a.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{a.description}</p>
                <p className="text-xs font-mono text-muted-foreground">{a.subject} · {fmtDate(a.date)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Poultry Section ──────────────────────────────────────────────────────────
function PoultrySection({ flocks, onAdd, onDelete, onLogDeath }: {
  flocks: Flock[]; onAdd: (f: Flock) => void; onDelete: (id: string) => void;
  onLogDeath: (flockId: string, count: number, cause: string, date: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [deathModal, setDeathModal] = useState<Flock | null>(null);
  const [form, setForm] = useState({ name: "", breed: "", count: "", purpose: "layers", ageWeeks: "", dateAcquired: "", notes: "" });
  const [deathForm, setDeathForm] = useState({ count: "1", cause: "", date: today() });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const setD = (k: string, v: string) => setDeathForm(p => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ id: uid(), name: form.name, breed: form.breed, count: parseInt(form.count)||0, purpose: form.purpose as Flock["purpose"], ageWeeks: parseInt(form.ageWeeks)||0, dateAcquired: form.dateAcquired, notes: form.notes });
    setShowModal(false);
    setForm({ name: "", breed: "", count: "", purpose: "layers", ageWeeks: "", dateAcquired: "", notes: "" });
  };

  const submitDeath = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deathModal) return;
    onLogDeath(deathModal.id, parseInt(deathForm.count)||1, deathForm.cause, deathForm.date);
    setDeathModal(null);
    setDeathForm({ count: "1", cause: "", date: today() });
  };

  const total = flocks.reduce((s, f) => s + f.count, 0);
  const layers = flocks.filter(f => f.purpose === "layers").reduce((s, f) => s + f.count, 0);
  const broilers = flocks.filter(f => f.purpose === "broilers").reduce((s, f) => s + f.count, 0);

  return (
    <div className="p-6">
      <SectionHeader title="Poultry Management">
        <Btn variant="outline" size="sm" onClick={() => exportCSV(flocks as unknown as Record<string, unknown>[], "flocks.csv")}>
          <Download size={14} /> Export
        </Btn>
        <Btn size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Add Flock</Btn>
      </SectionHeader>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Birds" value={total.toString()} />
        <StatCard label="Layers" value={layers.toString()} sub="egg production" />
        <StatCard label="Broilers" value={broilers.toString()} sub="meat birds" />
      </div>

      <div className="bg-card border border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <TH>Flock Name</TH><TH>Breed</TH><TH>Count</TH><TH>Purpose</TH>
              <TH>Age</TH><TH>Acquired</TH><TH>Notes</TH><TH>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {flocks.map(f => (
              <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                <TD><span className="font-medium">{f.name}</span></TD>
                <TD mono>{f.breed}</TD>
                <TD mono>{f.count}</TD>
                <TD>
                  <Badge label={f.purpose} color={f.purpose === "layers" ? "green" : f.purpose === "broilers" ? "amber" : "blue"} />
                </TD>
                <TD mono>{f.ageWeeks < 52 ? `${f.ageWeeks}wk` : `${Math.floor(f.ageWeeks/52)}yr ${f.ageWeeks%52}wk`}</TD>
                <TD mono>{fmtDate(f.dateAcquired)}</TD>
                <TD><span className="text-xs text-muted-foreground">{f.notes || "—"}</span></TD>
                <TD>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDeathModal(f)}
                      title="Log bird death"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                      <AlertCircle size={11} /> Death
                    </button>
                    <button onClick={() => onDelete(f.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Add Flock" onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Flock Name"><input required className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Layer Flock B" /></FormField>
              <FormField label="Breed"><input required className={inputCls} value={form.breed} onChange={e => set("breed", e.target.value)} placeholder="e.g. Kenbro" /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Count"><input required type="number" min="1" className={inputCls} value={form.count} onChange={e => set("count", e.target.value)} /></FormField>
              <FormField label="Purpose">
                <select className={selectCls} value={form.purpose} onChange={e => set("purpose", e.target.value)}>
                  <option value="layers">Layers</option>
                  <option value="broilers">Broilers</option>
                  <option value="dual-purpose">Dual-Purpose</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Age (weeks)"><input type="number" min="0" className={inputCls} value={form.ageWeeks} onChange={e => set("ageWeeks", e.target.value)} /></FormField>
              <FormField label="Date Acquired"><input type="date" className={inputCls} value={form.dateAcquired} onChange={e => set("dateAcquired", e.target.value)} /></FormField>
            </div>
            <FormField label="Notes"><textarea className={textareaCls} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn type="submit">Save Flock</Btn>
            </div>
          </form>
        </Modal>
      )}

      {deathModal && (
        <Modal title={`Log Bird Death — ${deathModal.name}`} onClose={() => setDeathModal(null)}>
          <div className="text-sm text-muted-foreground font-mono mb-3 p-2 bg-muted border border-border">
            Current count: <span className="font-semibold text-foreground">{deathModal.count}</span> birds
          </div>
          <form onSubmit={submitDeath} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Number of Deaths">
                <input required type="number" min="1" max={deathModal.count} className={inputCls} value={deathForm.count} onChange={e => setD("count", e.target.value)} />
              </FormField>
              <FormField label="Date">
                <input required type="date" className={inputCls} value={deathForm.date} onChange={e => setD("date", e.target.value)} />
              </FormField>
            </div>
            <FormField label="Cause / Notes">
              <input className={inputCls} value={deathForm.cause} onChange={e => setD("cause", e.target.value)} placeholder="e.g. Newcastle disease, unknown" />
            </FormField>
            <div className="text-xs text-muted-foreground font-mono p-2 bg-red-50 border border-red-200">
              New count will be: <span className="font-semibold text-red-700">{Math.max(0, deathModal.count - (parseInt(deathForm.count)||0))} birds</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="outline" onClick={() => setDeathModal(null)}>Cancel</Btn>
              <Btn variant="destructive" type="submit">Log Death</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Rabbits Section ──────────────────────────────────────────────────────────
function RabbitsSection({ rabbits, cages, onAdd, onDelete, onUpdateStatus, onAddCage, onDeleteCage, onAssignCage }: {
  rabbits: RabbitRecord[]; cages: Cage[]; onAdd: (r: RabbitRecord) => void; onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: RabbitRecord["status"], notes: string) => void;
  onAddCage: (c: Cage) => void; onDeleteCage: (id: string) => void;
  onAssignCage: (rabbitId: string, cageId: string | null) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [cageModal, setCageModal] = useState(false);
  const [statusModal, setStatusModal] = useState<RabbitRecord | null>(null);
  const [statusForm, setStatusForm] = useState({ status: "active", notes: "", lastBredDate: "", expectedKindleDate: "" });
  const [form, setForm] = useState({ tagId: "", breed: "", sex: "female", dob: "", weightKg: "", status: "active", lastBredDate: "", expectedKindleDate: "", cageId: "" });
  const [cageForm, setCageForm] = useState({ name: "", location: "", capacity: "4", notes: "" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const occupancy = useCallback((cageId: string) => rabbits.filter(r => r.cageId === cageId && r.status !== "sold" && r.status !== "deceased").length, [rabbits]);
  const overCapacity = cages.filter(c => occupancy(c.id) > c.capacity);
  const cageLabel = (cageId: string | null) => {
    if (!cageId) return null;
    const c = cages.find(c => c.id === cageId);
    return c ? c.name : "Unknown cage";
  };

  const openStatus = (r: RabbitRecord) => {
    setStatusModal(r);
    setStatusForm({ status: r.status, notes: "", lastBredDate: r.lastBredDate, expectedKindleDate: r.expectedKindleDate });
  };

  const submitStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModal) return;
    onUpdateStatus(statusModal.id, statusForm.status as RabbitRecord["status"], statusForm.notes);
    setStatusModal(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ id: uid(), tagId: form.tagId, breed: form.breed, sex: form.sex as RabbitRecord["sex"], dob: form.dob, weightKg: parseFloat(form.weightKg)||0, status: form.status as RabbitRecord["status"], lastBredDate: form.lastBredDate, expectedKindleDate: form.expectedKindleDate, cageId: form.cageId || null });
    setShowModal(false);
    setForm({ tagId: "", breed: "", sex: "female", dob: "", weightKg: "", status: "active", lastBredDate: "", expectedKindleDate: "", cageId: "" });
  };

  const submitCage = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCage({ id: uid(), name: cageForm.name, location: cageForm.location, capacity: parseInt(cageForm.capacity) || 1, notes: cageForm.notes });
    setCageForm({ name: "", location: "", capacity: "4", notes: "" });
  };

  const statusColor = (s: string): "green" | "amber" | "red" | "blue" | "gray" => {
    if (s === "pregnant") return "amber";
    if (s === "breeding") return "blue";
    if (s === "sold") return "gray";
    if (s === "deceased") return "red";
    return "green";
  };

  const pregnant = rabbits.filter(r => r.status === "pregnant");

  return (
    <div className="p-6">
      <SectionHeader title="Rabbit Management">
        <Btn variant="outline" size="sm" onClick={() => setCageModal(true)}><Package size={14} /> Manage Cages</Btn>
        <Btn variant="outline" size="sm" onClick={() => exportCSV(rabbits as unknown as Record<string, unknown>[], "rabbits.csv")}><Download size={14} /> Export</Btn>
        <Btn size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Add Rabbit</Btn>
      </SectionHeader>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total" value={rabbits.length.toString()} />
        <StatCard label="Does" value={rabbits.filter(r => r.sex === "female").length.toString()} />
        <StatCard label="Bucks" value={rabbits.filter(r => r.sex === "male").length.toString()} />
        <StatCard label="Pregnant" value={pregnant.length.toString()} sub={pregnant[0] ? `Due ${fmtDate(pregnant[0].expectedKindleDate)}` : undefined} />
        <StatCard label="Cages" value={cages.length.toString()} sub={`${rabbits.filter(r => r.cageId).length} housed`} />
      </div>

      {overCapacity.map(c => (
        <div key={c.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-300 mb-4">
          <AlertTriangle size={15} className="text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm"><span className="font-medium">{c.name}</span> is over capacity — <span className="font-mono font-semibold">{occupancy(c.id)}/{c.capacity}</span> rabbits housed.</p>
        </div>
      ))}

      {pregnant.map(r => {
        const days = daysUntil(r.expectedKindleDate);
        return (
          <div key={r.id} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-300 mb-4">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm"><span className="font-medium">{r.tagId}</span> expected to kindle in <span className="font-mono font-semibold">{days} days</span> ({fmtDate(r.expectedKindleDate)})</p>
          </div>
        );
      })}

      <div className="bg-card border border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <TH>Tag ID</TH><TH>Breed</TH><TH>Sex</TH><TH>Age</TH><TH>Weight</TH>
              <TH>Status</TH><TH>Cage</TH><TH>Last Bred</TH><TH>Kindle Date</TH><TH>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {rabbits.map(r => {
              const cage = cages.find(c => c.id === r.cageId);
              const crowded = cage ? occupancy(cage.id) > cage.capacity : false;
              return (
              <tr key={r.id} className={`hover:bg-muted/30 transition-colors ${r.status === "deceased" ? "opacity-50" : ""}`}>
                <TD><span className="font-mono font-medium">{r.tagId}</span></TD>
                <TD>{r.breed}</TD>
                <TD><Badge label={r.sex} color={r.sex === "female" ? "blue" : "gray"} /></TD>
                <TD mono>{ageFromDob(r.dob)}</TD>
                <TD mono>{r.weightKg.toFixed(1)} kg</TD>
                <TD>
                  <button
                    onClick={() => openStatus(r)}
                    title="Click to update status"
                    className="hover:opacity-75 transition-opacity">
                    <Badge label={r.status} color={statusColor(r.status)} />
                  </button>
                </TD>
                <TD>
                  <select
                    className={`${selectCls} text-xs py-1 ${crowded ? "border-red-400" : ""}`}
                    value={r.cageId ?? ""}
                    onChange={e => onAssignCage(r.id, e.target.value || null)}
                    title={cage ? `${occupancy(cage.id)}/${cage.capacity} housed` : "Unassigned"}
                  >
                    <option value="">— Unassigned —</option>
                    {cages.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({occupancy(c.id)}/{c.capacity})</option>
                    ))}
                  </select>
                </TD>
                <TD mono>{fmtDate(r.lastBredDate)}</TD>
                <TD mono>{fmtDate(r.expectedKindleDate)}</TD>
                <TD>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openStatus(r)}
                      title="Update status"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono border border-border hover:bg-muted transition-colors text-muted-foreground">
                      <RefreshCw size={10} /> Status
                    </button>
                    <button onClick={() => onDelete(r.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </TD>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {cageModal && (
        <Modal title="Manage Cages" onClose={() => setCageModal(false)}>
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {cages.length === 0 && <p className="text-sm text-muted-foreground">No cages yet — add one below.</p>}
            {cages.map(c => {
              const occ = occupancy(c.id);
              const full = occ > c.capacity;
              return (
                <div key={c.id} className="flex items-center justify-between p-2 border border-border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{c.name} {c.location && <span className="text-xs text-muted-foreground font-mono">· {c.location}</span>}</p>
                    <p className={`text-xs font-mono ${full ? "text-red-600" : "text-muted-foreground"}`}>{occ}/{c.capacity} housed{c.notes ? ` · ${c.notes}` : ""}</p>
                  </div>
                  <button onClick={() => onDeleteCage(c.id)} title="Delete cage (rabbits become unassigned)" className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          <form onSubmit={submitCage} className="space-y-3 border-t border-border pt-3">
            <p className="text-xs font-mono uppercase text-muted-foreground">Add a cage</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Name"><input required className={inputCls} value={cageForm.name} onChange={e => setCageForm(p => ({ ...p, name: e.target.value }))} placeholder="Cage A1" /></FormField>
              <FormField label="Capacity"><input required type="number" min="1" className={inputCls} value={cageForm.capacity} onChange={e => setCageForm(p => ({ ...p, capacity: e.target.value }))} /></FormField>
            </div>
            <FormField label="Location"><input className={inputCls} value={cageForm.location} onChange={e => setCageForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Rabbitry - North Row" /></FormField>
            <FormField label="Notes"><input className={inputCls} value={cageForm.notes} onChange={e => setCageForm(p => ({ ...p, notes: e.target.value }))} placeholder="optional" /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="submit"><Plus size={14} /> Add Cage</Btn>
            </div>
          </form>
        </Modal>
      )}

      {statusModal && (
        <Modal title={`Update Status — ${statusModal.tagId}`} onClose={() => setStatusModal(null)}>
          <div className="text-sm text-muted-foreground font-mono p-2 bg-muted border border-border mb-2">
            Current: <span className="font-semibold text-foreground">{statusModal.status}</span> · {statusModal.breed}
          </div>
          <form onSubmit={submitStatus} className="space-y-3">
            <FormField label="New Status">
              <select className={selectCls} value={statusForm.status} onChange={e => setStatusForm(p => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="breeding">Breeding</option>
                <option value="pregnant">Pregnant</option>
                <option value="sold">Sold</option>
                <option value="deceased">Deceased</option>
              </select>
            </FormField>
            {(statusForm.status === "breeding" || statusForm.status === "pregnant") && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Date Bred">
                  <input type="date" className={inputCls} value={statusForm.lastBredDate} onChange={e => setStatusForm(p => ({ ...p, lastBredDate: e.target.value }))} />
                </FormField>
                <FormField label="Expected Kindle">
                  <input type="date" className={inputCls} value={statusForm.expectedKindleDate} onChange={e => setStatusForm(p => ({ ...p, expectedKindleDate: e.target.value }))} />
                </FormField>
              </div>
            )}
            <FormField label="Notes / Reason">
              <input className={inputCls} value={statusForm.notes} onChange={e => setStatusForm(p => ({ ...p, notes: e.target.value }))} placeholder={statusForm.status === "deceased" ? "e.g. illness, injury" : "optional"} />
            </FormField>
            {statusForm.status === "deceased" && (
              <div className="p-2 bg-red-50 border border-red-200 text-xs font-mono text-red-700">
                This will mark {statusModal.tagId} as deceased and log the event.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="outline" onClick={() => setStatusModal(null)}>Cancel</Btn>
              <Btn
                type="submit"
                variant={statusForm.status === "deceased" ? "destructive" : "primary"}>
                Save Status
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {showModal && (
        <Modal title="Add Rabbit" onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tag ID"><input required className={inputCls} value={form.tagId} onChange={e => set("tagId", e.target.value)} placeholder="R-009" /></FormField>
              <FormField label="Breed"><input required className={inputCls} value={form.breed} onChange={e => set("breed", e.target.value)} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Sex">
                <select className={selectCls} value={form.sex} onChange={e => set("sex", e.target.value)}>
                  <option value="female">Female (Doe)</option>
                  <option value="male">Male (Buck)</option>
                </select>
              </FormField>
              <FormField label="Date of Birth"><input type="date" className={inputCls} value={form.dob} onChange={e => set("dob", e.target.value)} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Weight (kg)"><input type="number" step="0.1" min="0" className={inputCls} value={form.weightKg} onChange={e => set("weightKg", e.target.value)} /></FormField>
              <FormField label="Status">
                <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="active">Active</option>
                  <option value="breeding">Breeding</option>
                  <option value="pregnant">Pregnant</option>
                  <option value="sold">Sold</option>
                  <option value="deceased">Deceased</option>
                </select>
              </FormField>
            </div>
            <FormField label="Cage">
              <select className={selectCls} value={form.cageId} onChange={e => set("cageId", e.target.value)}>
                <option value="">— Unassigned —</option>
                {cages.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({occupancy(c.id)}/{c.capacity})</option>
                ))}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Last Bred Date"><input type="date" className={inputCls} value={form.lastBredDate} onChange={e => set("lastBredDate", e.target.value)} /></FormField>
              <FormField label="Expected Kindle Date"><input type="date" className={inputCls} value={form.expectedKindleDate} onChange={e => set("expectedKindleDate", e.target.value)} /></FormField>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn type="submit">Save Rabbit</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Pigs Section ─────────────────────────────────────────────────────────────
function PigsSection({ pigs, onAdd, onDelete }: {
  pigs: PigRecord[]; onAdd: (p: PigRecord) => void; onDelete: (id: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ tagId: "", name: "", breed: "", sex: "sow", dob: "", weightKg: "", status: "active", expectedFarrowDate: "", litterNumber: "" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ id: uid(), tagId: form.tagId, name: form.name, breed: form.breed, sex: form.sex as PigRecord["sex"], dob: form.dob, weightKg: parseFloat(form.weightKg)||0, status: form.status as PigRecord["status"], expectedFarrowDate: form.expectedFarrowDate, litterNumber: parseInt(form.litterNumber)||0 });
    setShowModal(false);
    setForm({ tagId: "", name: "", breed: "", sex: "sow", dob: "", weightKg: "", status: "active", expectedFarrowDate: "", litterNumber: "" });
  };

  const statusColor = (s: string): "green" | "amber" | "red" | "blue" | "gray" => {
    if (s === "pregnant") return "amber";
    if (s === "farrowing") return "red";
    if (s === "sold") return "gray";
    return "green";
  };

  return (
    <div className="p-6">
      <SectionHeader title="Pig Management">
        <Btn variant="outline" size="sm" onClick={() => exportCSV(pigs as unknown as Record<string, unknown>[], "pigs.csv")}><Download size={14} /> Export</Btn>
        <Btn size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Add Pig</Btn>
      </SectionHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Pigs" value={pigs.length.toString()} />
        <StatCard label="Sows" value={pigs.filter(p => p.sex === "sow" || p.sex === "gilt").length.toString()} />
        <StatCard label="Pregnant" value={pigs.filter(p => p.status === "pregnant").length.toString()} />
        <StatCard label="Est. Farrow" value={pigs.filter(p => p.expectedFarrowDate).map(p => fmtDate(p.expectedFarrowDate))[0] ?? "—"} />
      </div>

      {pigs.filter(p => p.status === "pregnant").map(p => {
        const days = daysUntil(p.expectedFarrowDate);
        return (
          <div key={p.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-300 mb-4">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium">{p.name} ({p.tagId}) — farrowing in <span className="font-mono">{days} days</span></p>
              <p className="text-xs text-muted-foreground font-mono">Expected: {fmtDate(p.expectedFarrowDate)} · Litter #{p.litterNumber}</p>
            </div>
          </div>
        );
      })}

      <div className="bg-card border border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr><TH>Tag</TH><TH>Name</TH><TH>Breed</TH><TH>Sex</TH><TH>Age</TH><TH>Weight</TH><TH>Status</TH><TH>Farrow Date</TH><TH>Litter #</TH><TH></TH></tr>
          </thead>
          <tbody>
            {pigs.map(p => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <TD><span className="font-mono font-medium">{p.tagId}</span></TD>
                <TD>{p.name}</TD>
                <TD>{p.breed}</TD>
                <TD><Badge label={p.sex} color="gray" /></TD>
                <TD mono>{ageFromDob(p.dob)}</TD>
                <TD mono>{p.weightKg} kg</TD>
                <TD><Badge label={p.status} color={statusColor(p.status)} /></TD>
                <TD mono>{fmtDate(p.expectedFarrowDate)}</TD>
                <TD mono>{p.litterNumber || "—"}</TD>
                <TD><button onClick={() => onDelete(p.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button></TD>
              </tr>
            ))}
          </tbody>
        </table>
        {pigs.length === 0 && <p className="text-center text-sm text-muted-foreground py-8 font-mono">No pigs recorded yet.</p>}
      </div>

      {showModal && (
        <Modal title="Add Pig" onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tag ID"><input required className={inputCls} value={form.tagId} onChange={e => set("tagId", e.target.value)} placeholder="P-002" /></FormField>
              <FormField label="Name"><input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Breed"><input className={inputCls} value={form.breed} onChange={e => set("breed", e.target.value)} /></FormField>
              <FormField label="Sex">
                <select className={selectCls} value={form.sex} onChange={e => set("sex", e.target.value)}>
                  <option value="sow">Sow</option><option value="gilt">Gilt</option>
                  <option value="boar">Boar</option><option value="barrow">Barrow</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date of Birth"><input type="date" className={inputCls} value={form.dob} onChange={e => set("dob", e.target.value)} /></FormField>
              <FormField label="Weight (kg)"><input type="number" step="0.5" className={inputCls} value={form.weightKg} onChange={e => set("weightKg", e.target.value)} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Status">
                <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="active">Active</option><option value="pregnant">Pregnant</option>
                  <option value="farrowing">Farrowing</option><option value="sold">Sold</option>
                </select>
              </FormField>
              <FormField label="Litter #"><input type="number" min="0" className={inputCls} value={form.litterNumber} onChange={e => set("litterNumber", e.target.value)} /></FormField>
            </div>
            <FormField label="Expected Farrow Date"><input type="date" className={inputCls} value={form.expectedFarrowDate} onChange={e => set("expectedFarrowDate", e.target.value)} /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn type="submit">Save Pig</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Production Section ───────────────────────────────────────────────────────
function ProductionSection({ eggLogs, flocks, onAdd, onDelete }: {
  eggLogs: EggLog[]; flocks: Flock[]; onAdd: (e: EggLog) => void; onDelete: (id: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: today(), flockId: "f1", count: "", damaged: "0", notes: "" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ id: uid(), date: form.date, flockId: form.flockId, count: parseInt(form.count)||0, damaged: parseInt(form.damaged)||0, notes: form.notes });
    setShowModal(false);
    setForm({ date: today(), flockId: "f1", count: "", damaged: "0", notes: "" });
  };

  const sorted = [...eggLogs].sort((a, b) => b.date.localeCompare(a.date));
  const totalEggs = eggLogs.reduce((s, e) => s + e.count, 0);
  const totalDamaged = eggLogs.reduce((s, e) => s + e.damaged, 0);
  const avgDaily = Math.round(totalEggs / eggLogs.length);
  const totalTrays = Math.floor(totalEggs / 30);

  const chartData = sorted.slice(0, 14).reverse().map(e => ({
    date: e.date.slice(5),
    eggs: e.count,
  }));

  return (
    <div className="p-6">
      <SectionHeader title="Egg Production Log">
        <Btn variant="outline" size="sm" onClick={() => exportCSV(eggLogs as unknown as Record<string, unknown>[], "egg-production.csv")}><Download size={14} /> Export CSV</Btn>
        <Btn size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Add Entry</Btn>
      </SectionHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="30-Day Total" value={totalEggs.toLocaleString()} sub="eggs collected" />
        <StatCard label="Avg / Day" value={avgDaily.toString()} sub={`${Math.round(avgDaily/32*100)}% lay rate`} />
        <StatCard label="Total Trays" value={totalTrays.toString()} sub="trays of 30" />
        <StatCard label="Damaged" value={totalDamaged.toString()} sub={`${((totalDamaged/totalEggs)*100).toFixed(1)}% loss`} />
      </div>

      <div className="bg-card border border-border p-4 mb-5">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Daily Production — Last 14 Days</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,24,16,0.08)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
            <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }} domain={[0, 35]} />
            <Tooltip contentStyle={{ fontSize: 12, fontFamily: "var(--font-mono)", border: "1px solid var(--border)", background: "var(--card)" }} />
            <Bar dataKey="eggs" fill="#2B5219" name="Eggs" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr><TH>Date</TH><TH>Flock</TH><TH>Collected</TH><TH>Damaged</TH><TH>Net</TH><TH>Trays</TH><TH>Lay Rate</TH><TH>Notes</TH><TH></TH></tr>
          </thead>
          <tbody>
            {sorted.map(e => {
              const flock = flocks.find(f => f.id === e.flockId);
              const net = e.count - e.damaged;
              const layRate = flock ? Math.round((e.count / flock.count) * 100) : 0;
              return (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <TD mono>{fmtDate(e.date)}</TD>
                  <TD><span className="text-xs">{flock?.name ?? e.flockId}</span></TD>
                  <TD mono>{e.count}</TD>
                  <TD mono>{e.damaged > 0 ? <span className="text-red-600">{e.damaged}</span> : "0"}</TD>
                  <TD mono><span className="font-semibold">{net}</span></TD>
                  <TD mono>{(net / 30).toFixed(1)}</TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(layRate, 100)}%` }} />
                      </div>
                      <span className="font-mono text-xs">{layRate}%</span>
                    </div>
                  </TD>
                  <TD><span className="text-xs text-muted-foreground">{e.notes || "—"}</span></TD>
                  <TD><button onClick={() => onDelete(e.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button></TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Add Egg Log Entry" onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date"><input required type="date" className={inputCls} value={form.date} onChange={e => set("date", e.target.value)} /></FormField>
              <FormField label="Flock">
                <select className={selectCls} value={form.flockId} onChange={e => set("flockId", e.target.value)}>
                  {flocks.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Eggs Collected"><input required type="number" min="0" className={inputCls} value={form.count} onChange={e => set("count", e.target.value)} /></FormField>
              <FormField label="Damaged"><input type="number" min="0" className={inputCls} value={form.damaged} onChange={e => set("damaged", e.target.value)} /></FormField>
            </div>
            <FormField label="Notes"><input className={inputCls} value={form.notes} onChange={e => set("notes", e.target.value)} /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn type="submit">Save Entry</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Expenses Section ─────────────────────────────────────────────────────────
function ExpensesSection({ expenses, onAdd, onDelete }: {
  expenses: Expense[]; onAdd: (e: Expense) => void; onDelete: (id: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ date: today(), category: "feed", description: "", amount: "", animalGroup: "Poultry", notes: "" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ id: uid(), date: form.date, category: form.category as Expense["category"], description: form.description, amount: parseFloat(form.amount)||0, animalGroup: form.animalGroup, notes: form.notes });
    setShowModal(false);
    setForm({ date: today(), category: "feed", description: "", amount: "", animalGroup: "Poultry", notes: "" });
  };

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = filterCat === "all" ? sorted : sorted.filter(e => e.category === filterCat);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = ["feed", "medication", "equipment", "labor", "utilities", "other"].map(cat => ({
    cat, total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0);

  const catColor: Record<string, "green" | "amber" | "blue" | "red" | "gray"> = {
    feed: "green", medication: "amber", equipment: "blue", labor: "gray", utilities: "gray", other: "gray",
  };

  return (
    <div className="p-6">
      <SectionHeader title="Expenses">
        <Btn variant="outline" size="sm" onClick={() => exportCSV(expenses as unknown as Record<string, unknown>[], "expenses.csv")}><Download size={14} /> Export CSV</Btn>
        <Btn size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Add Expense</Btn>
      </SectionHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Expenses" value={`GHS ${(total/1000).toFixed(1)}k`} />
        <StatCard label="Feed Costs" value={fmt(byCategory.find(c => c.cat === "feed")?.total ?? 0)} />
        <StatCard label="Medication" value={fmt(byCategory.find(c => c.cat === "medication")?.total ?? 0)} />
        <StatCard label="Labor" value={fmt(byCategory.find(c => c.cat === "labor")?.total ?? 0)} />
      </div>

      <div className="bg-card border border-border p-4 mb-5">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Expense Breakdown by Category</p>
        <div className="space-y-2">
          {byCategory.sort((a, b) => b.total - a.total).map(c => (
            <div key={c.cat} className="flex items-center gap-3">
              <span className="text-xs font-mono w-20 capitalize text-muted-foreground">{c.cat}</span>
              <div className="flex-1 h-5 bg-muted overflow-hidden">
                <div className="h-full bg-primary/80 transition-all" style={{ width: `${(c.total / total) * 100}%` }} />
              </div>
              <span className="text-xs font-mono w-24 text-right">{fmt(c.total)}</span>
              <span className="text-xs font-mono text-muted-foreground w-10 text-right">{Math.round(c.total / total * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {["all", "feed", "medication", "equipment", "labor", "utilities", "other"].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={`px-2.5 py-1 text-xs font-mono capitalize border transition-colors ${filterCat === cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr><TH>Date</TH><TH>Description</TH><TH>Category</TH><TH>Animal Group</TH><TH>Amount</TH><TH>Notes</TH><TH></TH></tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                <TD mono>{fmtDate(e.date)}</TD>
                <TD><span className="font-medium text-sm">{e.description}</span></TD>
                <TD><Badge label={e.category} color={catColor[e.category] ?? "gray"} /></TD>
                <TD><span className="text-xs">{e.animalGroup}</span></TD>
                <TD mono><span className="font-semibold">{fmt(e.amount)}</span></TD>
                <TD><span className="text-xs text-muted-foreground">{e.notes || "—"}</span></TD>
                <TD><button onClick={() => onDelete(e.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button></TD>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td colSpan={4} className="px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider">Total ({filtered.length} items)</td>
              <td className="px-3 py-2 font-mono font-semibold text-sm">{fmt(filtered.reduce((s, e) => s + e.amount, 0))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {showModal && (
        <Modal title="Add Expense" onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date"><input required type="date" className={inputCls} value={form.date} onChange={e => set("date", e.target.value)} /></FormField>
              <FormField label="Category">
                <select className={selectCls} value={form.category} onChange={e => set("category", e.target.value)}>
                  <option value="feed">Feed</option><option value="medication">Medication</option>
                  <option value="equipment">Equipment</option><option value="labor">Labor</option>
                  <option value="utilities">Utilities</option><option value="other">Other</option>
                </select>
              </FormField>
            </div>
            <FormField label="Description"><input required className={inputCls} value={form.description} onChange={e => set("description", e.target.value)} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Amount (GHS)"><input required type="number" min="0" step="0.01" className={inputCls} value={form.amount} onChange={e => set("amount", e.target.value)} /></FormField>
              <FormField label="Animal Group">
                <select className={selectCls} value={form.animalGroup} onChange={e => set("animalGroup", e.target.value)}>
                  <option value="Poultry">Poultry</option><option value="Rabbits">Rabbits</option>
                  <option value="Pigs">Pigs</option><option value="General">General</option>
                </select>
              </FormField>
            </div>
            <FormField label="Notes"><textarea className={textareaCls} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn type="submit">Save Expense</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Sales Section ────────────────────────────────────────────────────────────
function SalesSection({ sales, onAdd, onDelete }: {
  sales: Sale[]; onAdd: (s: Sale) => void; onDelete: (id: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: today(), product: "eggs", quantity: "", unit: "tray", pricePerUnit: "", buyer: "", notes: "" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ id: uid(), date: form.date, product: form.product as Sale["product"], quantity: parseFloat(form.quantity)||0, unit: form.unit, pricePerUnit: parseFloat(form.pricePerUnit)||0, buyer: form.buyer, notes: form.notes });
    setShowModal(false);
    setForm({ date: today(), product: "eggs", quantity: "", unit: "tray", pricePerUnit: "", buyer: "", notes: "" });
  };

  const sorted = [...sales].sort((a, b) => b.date.localeCompare(a.date));
  const total = sales.reduce((s, sale) => s + sale.quantity * sale.pricePerUnit, 0);
  const eggRevenue = sales.filter(s => s.product === "eggs").reduce((s, sale) => s + sale.quantity * sale.pricePerUnit, 0);

  const monthlyData = useMemo(() => {
    const months = [{ key: "2026-04", label: "Apr" }, { key: "2026-05", label: "May" }, { key: "2026-06", label: "Jun" }];
    return months.map(({ key, label }) => ({
      month: label,
      eggs: sales.filter(s => s.date.startsWith(key) && s.product === "eggs").reduce((sum, s) => sum + s.quantity * s.pricePerUnit, 0),
      other: sales.filter(s => s.date.startsWith(key) && s.product !== "eggs").reduce((sum, s) => sum + s.quantity * s.pricePerUnit, 0),
    }));
  }, [sales]);

  const productColor = (p: string): "green" | "amber" | "blue" | "red" | "gray" => {
    if (p === "eggs") return "green";
    if (p === "rabbits" || p === "meat") return "amber";
    if (p === "live-birds") return "blue";
    if (p === "pigs") return "red";
    return "gray";
  };

  return (
    <div className="p-6">
      <SectionHeader title="Sales & Revenue">
        <Btn variant="outline" size="sm" onClick={() => exportCSV(sorted as unknown as Record<string, unknown>[], "sales.csv")}><Download size={14} /> Export CSV</Btn>
        <Btn size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Record Sale</Btn>
      </SectionHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Revenue" value={`GHS ${(total/1000).toFixed(1)}k`} trend="up" />
        <StatCard label="Egg Revenue" value={`GHS ${(eggRevenue/1000).toFixed(1)}k`} sub={`${Math.round(eggRevenue/total*100)}% of total`} />
        <StatCard label="Total Trays Sold" value={sales.filter(s => s.product === "eggs").reduce((s, sale) => s + sale.quantity, 0).toString()} sub="trays of 30 eggs" />
        <StatCard label="Transactions" value={sales.length.toString()} />
      </div>

      <div className="bg-card border border-border p-4 mb-5">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Monthly Revenue Breakdown</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,24,16,0.08)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
            <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ fontSize: 12, fontFamily: "var(--font-mono)", border: "1px solid var(--border)", background: "var(--card)" }} formatter={(v: number) => `GHS ${v.toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
            <Bar dataKey="eggs" stackId="a" fill="#2B5219" name="Eggs" />
            <Bar dataKey="other" stackId="a" fill="#C97C1A" name="Other" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr><TH>Date</TH><TH>Product</TH><TH>Qty</TH><TH>Unit</TH><TH>Price/Unit</TH><TH>Total</TH><TH>Buyer</TH><TH>Notes</TH><TH></TH></tr>
          </thead>
          <tbody>
            {sorted.map(s => (
              <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                <TD mono>{fmtDate(s.date)}</TD>
                <TD><Badge label={s.product} color={productColor(s.product)} /></TD>
                <TD mono>{s.quantity}</TD>
                <TD><span className="text-xs font-mono">{s.unit}</span></TD>
                <TD mono>{fmt(s.pricePerUnit)}</TD>
                <TD mono><span className="font-semibold">{fmt(s.quantity * s.pricePerUnit)}</span></TD>
                <TD><span className="text-sm">{s.buyer || "—"}</span></TD>
                <TD><span className="text-xs text-muted-foreground">{s.notes || "—"}</span></TD>
                <TD><button onClick={() => onDelete(s.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button></TD>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td colSpan={5} className="px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider">Total ({sorted.length} sales)</td>
              <td className="px-3 py-2 font-mono font-semibold text-sm">{fmt(total)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {showModal && (
        <Modal title="Record Sale" onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date"><input required type="date" className={inputCls} value={form.date} onChange={e => set("date", e.target.value)} /></FormField>
              <FormField label="Product">
                <select className={selectCls} value={form.product} onChange={e => set("product", e.target.value)}>
                  <option value="eggs">Eggs</option><option value="live-birds">Live Birds</option>
                  <option value="meat">Meat</option><option value="rabbits">Rabbits</option>
                  <option value="pigs">Pigs</option><option value="other">Other</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Quantity"><input required type="number" min="0" step="0.5" className={inputCls} value={form.quantity} onChange={e => set("quantity", e.target.value)} /></FormField>
              <FormField label="Unit"><input className={inputCls} value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="tray / kg / bird" /></FormField>
              <FormField label="Price / Unit (GHS)"><input required type="number" min="0" className={inputCls} value={form.pricePerUnit} onChange={e => set("pricePerUnit", e.target.value)} /></FormField>
            </div>
            {form.quantity && form.pricePerUnit && (
              <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-2">
                Total: <span className="font-semibold text-foreground">{fmt(parseFloat(form.quantity) * parseFloat(form.pricePerUnit))}</span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Buyer"><input className={inputCls} value={form.buyer} onChange={e => set("buyer", e.target.value)} /></FormField>
              <FormField label="Notes"><input className={inputCls} value={form.notes} onChange={e => set("notes", e.target.value)} /></FormField>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn type="submit">Save Sale</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Vaccinations Section ─────────────────────────────────────────────────────
function VaccinationsSection({ vaccinations, onAdd, onDelete }: {
  vaccinations: Vaccination[]; onAdd: (v: Vaccination) => void; onDelete: (id: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: today(), animalGroup: "", vaccine: "", dosage: "", administeredBy: "", nextDueDate: "", notes: "" });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ id: uid(), date: form.date, animalGroup: form.animalGroup, vaccine: form.vaccine, dosage: form.dosage, administeredBy: form.administeredBy, nextDueDate: form.nextDueDate, notes: form.notes });
    setShowModal(false);
    setForm({ date: today(), animalGroup: "", vaccine: "", dosage: "", administeredBy: "", nextDueDate: "", notes: "" });
  };

  const sorted = [...vaccinations].sort((a, b) => b.date.localeCompare(a.date));

  const getStatus = (nextDue: string): { label: string; color: "green" | "amber" | "red" | "gray" } => {
    if (!nextDue) return { label: "one-time", color: "gray" };
    const days = daysUntil(nextDue);
    if (days === null) return { label: "one-time", color: "gray" };
    if (days < 0) return { label: "overdue", color: "red" };
    if (days <= 14) return { label: `due in ${days}d`, color: "amber" };
    return { label: `due ${fmtDate(nextDue)}`, color: "green" };
  };

  const upcoming = vaccinations.filter(v => {
    if (!v.nextDueDate) return false;
    const days = daysUntil(v.nextDueDate);
    return days !== null && days <= 30 && days >= 0;
  });

  return (
    <div className="p-6">
      <SectionHeader title="Vaccination Schedule">
        <Btn variant="outline" size="sm" onClick={() => exportCSV(vaccinations as unknown as Record<string, unknown>[], "vaccinations.csv")}><Download size={14} /> Export CSV</Btn>
        <Btn size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Add Record</Btn>
      </SectionHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Records" value={vaccinations.length.toString()} />
        <StatCard label="Due Within 30 Days" value={upcoming.length.toString()} sub={upcoming[0]?.vaccine} />
        <StatCard label="Overdue" value={vaccinations.filter(v => v.nextDueDate && (daysUntil(v.nextDueDate) ?? 1) < 0).length.toString()} />
      </div>

      {upcoming.map(v => {
        const days = daysUntil(v.nextDueDate);
        return (
          <div key={v.id} className={`flex items-start gap-3 p-3 border mb-2 ${(days ?? 999) <= 7 ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-300"}`}>
            <Calendar size={15} className={`mt-0.5 shrink-0 ${(days ?? 999) <= 7 ? "text-red-600" : "text-amber-600"}`} />
            <div>
              <p className="text-sm font-medium">{v.vaccine} — {v.animalGroup}</p>
              <p className="text-xs font-mono text-muted-foreground">Due {fmtDate(v.nextDueDate)} · {days} days remaining</p>
            </div>
          </div>
        );
      })}

      <div className="bg-card border border-border overflow-x-auto mt-4">
        <table className="w-full">
          <thead>
            <tr><TH>Date</TH><TH>Animal Group</TH><TH>Vaccine</TH><TH>Dosage</TH><TH>By</TH><TH>Next Due</TH><TH>Status</TH><TH>Notes</TH><TH></TH></tr>
          </thead>
          <tbody>
            {sorted.map(v => {
              const status = getStatus(v.nextDueDate);
              return (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <TD mono>{fmtDate(v.date)}</TD>
                  <TD><span className="font-medium text-sm">{v.animalGroup}</span></TD>
                  <TD>{v.vaccine}</TD>
                  <TD mono>{v.dosage}</TD>
                  <TD><span className="text-xs">{v.administeredBy || "—"}</span></TD>
                  <TD mono>{fmtDate(v.nextDueDate)}</TD>
                  <TD><Badge label={status.label} color={status.color} /></TD>
                  <TD><span className="text-xs text-muted-foreground">{v.notes || "—"}</span></TD>
                  <TD><button onClick={() => onDelete(v.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button></TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Add Vaccination Record" onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date Administered"><input required type="date" className={inputCls} value={form.date} onChange={e => set("date", e.target.value)} /></FormField>
              <FormField label="Animal Group"><input required className={inputCls} value={form.animalGroup} onChange={e => set("animalGroup", e.target.value)} placeholder="Layer Flock A" /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Vaccine Name"><input required className={inputCls} value={form.vaccine} onChange={e => set("vaccine", e.target.value)} /></FormField>
              <FormField label="Dosage"><input className={inputCls} value={form.dosage} onChange={e => set("dosage", e.target.value)} placeholder="1 drop/eye" /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Administered By"><input className={inputCls} value={form.administeredBy} onChange={e => set("administeredBy", e.target.value)} /></FormField>
              <FormField label="Next Due Date"><input type="date" className={inputCls} value={form.nextDueDate} onChange={e => set("nextDueDate", e.target.value)} /></FormField>
            </div>
            <FormField label="Notes"><textarea className={textareaCls} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn type="submit">Save Record</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Nav Config ───────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: NavSection; label: string; short: string; icon: React.ComponentType<any> }[] = [
  { id: "dashboard", label: "Overview", short: "Home", icon: LayoutDashboard },
  { id: "poultry", label: "Poultry", short: "Poultry", icon: Bird },
  { id: "rabbits", label: "Rabbits", short: "Rabbits", icon: Rabbit },
  { id: "pigs", label: "Pigs", short: "Pigs", icon: PiggyBank },
  { id: "production", label: "Egg Production", short: "Eggs", icon: Egg },
  { id: "expenses", label: "Expenses", short: "Costs", icon: DollarSign },
  { id: "sales", label: "Sales & Revenue", short: "Sales", icon: TrendingUp },
  { id: "vaccinations", label: "Vaccinations", short: "Health", icon: Syringe },
  { id: "activity", label: "Activity Log", short: "Log", icon: ScrollText },
];

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const { data: sessionData } = useSession();
  const [section, setSection] = useState<NavSection>("dashboard");
  const [loading, setLoading] = useState(true);

  const [flocks, setFlocks, loadFlocks] = useSyncedRecords<Flock>("flocks");
  const [rabbits, setRabbits, loadRabbits] = useSyncedRecords<RabbitRecord>("rabbits");
  const [cages, setCages, loadCages] = useSyncedRecords<Cage>("cages");
  const [pigs, setPigs, loadPigs] = useSyncedRecords<PigRecord>("pigs");
  const [eggLogs, setEggLogs, loadEggLogs] = useSyncedRecords<EggLog>("egg-logs");
  const [expenses, setExpenses, loadExpenses] = useSyncedRecords<Expense>("expenses");
  const [sales, setSales, loadSales] = useSyncedRecords<Sale>("sales");
  const [vaccinations, setVaccinations, loadVaccinations] = useSyncedRecords<Vaccination>("vaccinations");
  const [activity, setActivity, loadActivity] = useSyncedRecords<ActivityEntry>("activity");

  useEffect(() => {
    async function loadAll() {
      const tables: [string, (rows: any[]) => void][] = [
        ["flocks", loadFlocks],
        ["rabbits", loadRabbits],
        ["cages", loadCages],
        ["pigs", loadPigs],
        ["egg-logs", loadEggLogs],
        ["expenses", loadExpenses],
        ["sales", loadSales],
        ["vaccinations", loadVaccinations],
        ["activity", loadActivity],
      ];
      await Promise.all(
        tables.map(async ([table, load]) => {
          try {
            const res = await fetch(`/api/records/${table}`);
            if (res.ok) load(await res.json());
          } catch {
            // Network hiccup — leave that section empty rather than crash the app.
          }
        }),
      );
      setLoading(false);
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addActivity = useCallback((a: ActivityEntry) => setActivity(p => [a, ...p]), []);

  const addFlock = useCallback((f: Flock) => {
    setFlocks(p => [f, ...p]);
    addActivity({ id: uid(), date: f.dateAcquired || today(), type: "added", subject: f.name, description: `${f.count} ${f.breed} (${f.purpose}) acquired`, details: `Flock: ${f.name}` });
  }, [addActivity]);

  const addRabbit = useCallback((r: RabbitRecord) => {
    setRabbits(p => [r, ...p]);
    addActivity({ id: uid(), date: today(), type: "added", subject: r.tagId, description: `Rabbit ${r.tagId} added (${r.breed})`, details: `${r.sex} · ${r.weightKg}kg` });
  }, [addActivity]);

  const addPig = useCallback((p: PigRecord) => {
    setPigs(prev => [p, ...prev]);
    addActivity({ id: uid(), date: today(), type: "added", subject: p.tagId, description: `Pig ${p.name || p.tagId} added (${p.breed})`, details: `${p.sex} · ${p.weightKg}kg` });
  }, [addActivity]);

  const addEggLog = useCallback((e: EggLog) => setEggLogs(p => [e, ...p]), []);
  const addExpense = useCallback((e: Expense) => setExpenses(p => [e, ...p]), []);
  const addSale = useCallback((s: Sale) => setSales(p => [s, ...p]), []);
  const addVaccination = useCallback((v: Vaccination) => setVaccinations(p => [v, ...p]), []);

  const delFlock = useCallback((id: string) => setFlocks(p => p.filter(f => f.id !== id)), []);
  const delRabbit = useCallback((id: string) => setRabbits(p => p.filter(r => r.id !== id)), []);

  const addCage = useCallback((c: Cage) => {
    setCages(p => [c, ...p]);
    addActivity({ id: uid(), date: today(), type: "added", subject: c.name, description: `Cage ${c.name} added (capacity ${c.capacity})`, details: c.location });
  }, [addActivity]);
  const delCage = useCallback((id: string) => {
    setCages(p => p.filter(c => c.id !== id));
    setRabbits(p => p.map(r => r.cageId === id ? { ...r, cageId: null } : r));
  }, []);
  const assignCage = useCallback((rabbitId: string, cageId: string | null) => {
    setRabbits(p => p.map(r => r.id === rabbitId ? { ...r, cageId } : r));
  }, []);
  const delPig = useCallback((id: string) => setPigs(p => p.filter(p2 => p2.id !== id)), []);
  const delEggLog = useCallback((id: string) => setEggLogs(p => p.filter(e => e.id !== id)), []);
  const delExpense = useCallback((id: string) => setExpenses(p => p.filter(e => e.id !== id)), []);
  const delSale = useCallback((id: string) => setSales(p => p.filter(s => s.id !== id)), []);
  const delVaccination = useCallback((id: string) => setVaccinations(p => p.filter(v => v.id !== id)), []);

  const logBirdDeath = useCallback((flockId: string, count: number, cause: string, date: string) => {
    const flock = flocks.find(f => f.id === flockId);
    setFlocks(p => p.map(f => f.id === flockId ? { ...f, count: Math.max(0, f.count - count) } : f));
    addActivity({
      id: uid(), date, type: "death",
      subject: flock?.name ?? flockId,
      description: `${count} bird${count > 1 ? "s" : ""} died in ${flock?.name ?? "flock"}`,
      details: cause ? `Cause: ${cause}` : "Cause not specified",
    });
  }, [flocks, addActivity]);

  const updateRabbitStatus = useCallback((id: string, status: RabbitRecord["status"], notes: string) => {
    const rabbit = rabbits.find(r => r.id === id);
    setRabbits(p => p.map(r => r.id === id ? { ...r, status } : r));
    addActivity({
      id: uid(), date: today(), type: status === "deceased" ? "death" : "status_change",
      subject: rabbit?.tagId ?? id,
      description: `${rabbit?.tagId ?? id} marked as ${status}`,
      details: notes || `Status changed from ${rabbit?.status} → ${status}`,
    });
  }, [rabbits, addActivity]);

  const navigate = useCallback((s: NavSection) => setSection(s), []);

  const urgentVax = vaccinations.filter(v => v.nextDueDate && (daysUntil(v.nextDueDate) ?? 999) <= 7 && (daysUntil(v.nextDueDate) ?? 999) >= 0).length;
  const pregnantPigs = pigs.filter(p => p.status === "pregnant").length;
  const alerts = urgentVax + pregnantPigs;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm font-mono text-muted-foreground">Loading FarmPulse…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-3 shrink-0 border-b border-border" style={{ backgroundColor: "#152D09" }}>
        <div className="w-6 h-6 flex items-center justify-center shrink-0" style={{ backgroundColor: "#C97C1A" }}>
          <Package size={13} className="text-white" />
        </div>
        <p className="text-sm font-semibold text-white tracking-tight flex-1">FarmPulse</p>
        <p className="text-xs font-mono hidden sm:block" style={{ color: "rgba(200,224,168,0.5)" }}>
          {NAV_ITEMS.find(n => n.id === section)?.label}
        </p>
        {sessionData?.user?.name && (
          <p className="text-xs font-mono hidden md:block" style={{ color: "rgba(200,224,168,0.6)" }}>
            {sessionData.user.name}
          </p>
        )}
        {alerts > 0 && (
          <button onClick={() => navigate("vaccinations")}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono transition-colors"
            style={{ backgroundColor: "#C97C1A", color: "#fff" }}>
            <AlertTriangle size={11} />
            {alerts}
          </button>
        )}
        {(sessionData?.user as any)?.role === "admin" && (
          <a
            href="/team"
            className="text-xs font-mono hidden sm:block underline"
            style={{ color: "rgba(200,224,168,0.7)" }}
          >
            Team
          </a>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          className="flex items-center justify-center w-7 h-7 transition-colors"
          style={{ color: "rgba(200,224,168,0.7)" }}
        >
          <LogOut size={15} />
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-16">
        {section === "dashboard" && <DashboardSection flocks={flocks} rabbits={rabbits} pigs={pigs} eggLogs={eggLogs} expenses={expenses} sales={sales} activity={activity} onNavigate={navigate} />}
        {section === "poultry" && <PoultrySection flocks={flocks} onAdd={addFlock} onDelete={delFlock} onLogDeath={logBirdDeath} />}
        {section === "rabbits" && <RabbitsSection rabbits={rabbits} cages={cages} onAdd={addRabbit} onDelete={delRabbit} onUpdateStatus={updateRabbitStatus} onAddCage={addCage} onDeleteCage={delCage} onAssignCage={assignCage} />}
        {section === "pigs" && <PigsSection pigs={pigs} onAdd={addPig} onDelete={delPig} />}
        {section === "production" && <ProductionSection eggLogs={eggLogs} flocks={flocks} onAdd={addEggLog} onDelete={delEggLog} />}
        {section === "expenses" && <ExpensesSection expenses={expenses} onAdd={addExpense} onDelete={delExpense} />}
        {section === "sales" && <SalesSection sales={sales} onAdd={addSale} onDelete={delSale} />}
        {section === "vaccinations" && <VaccinationsSection vaccinations={vaccinations} onAdd={addVaccination} onDelete={delVaccination} />}
        {section === "activity" && <ActivitySection activity={activity} onAdd={addActivity} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t flex overflow-x-auto" style={{ backgroundColor: "#152D09", borderColor: "rgba(200,224,168,0.12)" }}>
        {NAV_ITEMS.map(({ id, short, icon: Icon }) => {
          const active = section === id;
          const hasBadge = id === "vaccinations" && urgentVax > 0;
          return (
            <button key={id} onClick={() => navigate(id)}
              className="flex-1 flex-shrink-0 flex flex-col items-center justify-center py-2 px-1 min-w-[56px] transition-colors relative"
              style={{ color: active ? "#fff" : "rgba(200,224,168,0.55)", backgroundColor: active ? "rgba(255,255,255,0.08)" : "transparent" }}>
              <Icon size={17} />
              <span className="text-[9px] font-mono mt-0.5 leading-none">{short}</span>
              {hasBadge && (
                <span className="absolute top-1.5 right-2 w-3.5 h-3.5 flex items-center justify-center text-[8px] font-mono"
                  style={{ backgroundColor: "#C97C1A", color: "#fff" }}>
                  {urgentVax}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
