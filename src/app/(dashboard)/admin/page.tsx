"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Users,
  Database,
  Lock,
  Activity,
  LogOut,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Server,
  FileText,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: "CUSTOMER" | "VENDOR" | "SUPER_ADMIN";
  createdAt: string;
  orderCount: number;
}

interface AuditLogItem {
  id: string;
  action: string;
  resource: string;
  details?: string;
  createdAt: string;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, logsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/audit"),
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }
      if (logsRes.ok) {
        const lData = await logsRes.json();
        setAuditLogs(lData.logs || []);
      }
    } catch (err) {
      console.error("Admin data fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      setStatusMessage(null);
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u))
        );
        setStatusMessage(`Successfully changed role to ${newRole}`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      console.error("Failed to update user role", err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-neutral-950 border-b border-neutral-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-700 text-white font-bold">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <div>
                <span className="font-serif font-bold text-white text-base sm:text-lg">
                  Super Admin Master Console
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded font-mono border border-rose-800">
                  ROOT PRIVILEGES
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/vendor"
                className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 flex items-center gap-1"
              >
                <span>Store Owner View</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-neutral-400 hover:text-red-400 text-xs h-8 px-2.5 rounded-lg gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        {/* Status Toast */}
        {statusMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* System Architecture & Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-mono uppercase tracking-wider">Zero-Cost Infrastructure</span>
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-white mt-2">100% Free Tier ($0/mo)</p>
            <p className="text-xs text-neutral-400 mt-1">
              Firebase Hosting + Supabase PostgreSQL + Firebase Storage
            </p>
          </div>

          <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-mono uppercase tracking-wider">Payment Gateway Health</span>
              <Activity className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-xl font-bold text-white mt-2">Razorpay Standard UPI</p>
            <p className="text-xs text-neutral-400 mt-1">Prepaid Online Only • HMAC-SHA256 verified</p>
          </div>

          <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-mono uppercase tracking-wider">Security & RBAC</span>
              <Lock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xl font-bold text-white mt-2">OWASP Top 10 Guard</p>
            <p className="text-xs text-neutral-400 mt-1">HttpOnly Cookies • Zod Validation • Bcrypt 12</p>
          </div>
        </div>

        {/* User Management & Role Assignment */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-400" /> User Directory & Role Assignment (RBAC)
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Assign store owner privileges (VENDOR) or administrator rights (SUPER_ADMIN).
              </p>
            </div>
            <span className="text-xs text-neutral-500 font-mono">{users.length} accounts</span>
          </div>

          <div className="mt-4 divide-y divide-neutral-800/80">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-neutral-500">Loading user records...</div>
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500">No users found.</div>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">{u.fullName || "Registered User"}</p>
                      <span className="text-[11px] font-mono text-neutral-400">({u.email})</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Joined {new Date(u.createdAt).toLocaleDateString()} • {u.orderCount} orders
                    </p>
                  </div>

                  {/* Role Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400 uppercase font-mono">Role:</span>
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none ${
                        u.role === "SUPER_ADMIN"
                          ? "bg-rose-950/80 text-rose-300 border-rose-800"
                          : u.role === "VENDOR"
                          ? "bg-amber-950/80 text-amber-300 border-amber-800"
                          : "bg-neutral-800 text-neutral-300 border-neutral-700"
                      }`}
                    >
                      <option value="CUSTOMER">CUSTOMER (Shopper)</option>
                      <option value="VENDOR">VENDOR (Store Owner)</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN (Master Dev)</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Immutable System Audit Ledger
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Every sensitive action is tracked with timestamp and parameters for OWASP auditability.
              </p>
            </div>
            <span className="text-xs text-neutral-500 font-mono">{auditLogs.length} events</span>
          </div>

          <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-neutral-500">Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500">No audit events recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-neutral-900 rounded-xl border border-neutral-800/80 text-xs font-mono flex flex-col sm:flex-row justify-between sm:items-center gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-neutral-800 text-rose-300 font-bold text-[10px]">
                      {log.action}
                    </span>
                    <span className="text-neutral-400">{log.resource}</span>
                    {log.details && (
                      <span className="text-neutral-500 truncate max-w-xs">{log.details}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-500 shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
