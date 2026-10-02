"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuthUser } from "@/components/auth/hooks/auth.hook";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ROLES = ["guest", "host", "admin"] as const;
type Role = (typeof ROLES)[number];
type ManagedUser = { id: string; email: string; first_name?: string | null; last_name?: string | null; location?: string | null; user_roles?: Array<{ role?: { name?: Role | null } | null }> };
type CreateForm = { firstName: string; lastName: string; email: string; password: string; role: Role };
const EMPTY_CREATE_FORM: CreateForm = { firstName: "", lastName: "", email: "", password: "", role: "guest" };

function roleFor(user: ManagedUser): Role {
  const role = user.user_roles?.[0]?.role?.name;
  return role && ROLES.includes(role) ? role : "guest";
}
function displayName(user: ManagedUser): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unnamed user";
}

export default function UsersPage() {
  const { user, loading: authLoading } = useAuthUser();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    if (!user) throw new Error("Your session has expired. Please sign in again.");
    const token = await user.getIdToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3002";
    const response = await fetch(`${backendUrl}/api/admin${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) throw new Error(body?.error ?? "The request could not be completed.");
    return body;
  }, [user]);

  const loadUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const body = await request("/users") as { users?: ManagedUser[] };
      setUsers(body.users ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load users.");
    } finally { setLoading(false); }
  }, [request, user]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? users.filter((managedUser) => [displayName(managedUser), managedUser.email, roleFor(managedUser)].join(" ").toLowerCase().includes(query)) : users;
  }, [search, users]);

  const saveRole = async (managedUser: ManagedUser, role: Role) => {
    if (role === roleFor(managedUser)) return;
    setSavingUserId(managedUser.id); setError(null); setNotice(null);
    try {
      await request(`/users/${managedUser.id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      setUsers((current) => current.map((entry) => entry.id === managedUser.id ? { ...entry, user_roles: [{ role: { name: role } }] } : entry));
      setNotice(`${displayName(managedUser)} is now a ${role}.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to change the role."); }
    finally { setSavingUserId(null); }
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setCreating(true); setError(null); setNotice(null);
    try {
      await request("/users", { method: "POST", body: JSON.stringify(createForm) });
      setCreateOpen(false); setCreateForm(EMPTY_CREATE_FORM); setNotice("User created and assigned a role.");
      await loadUsers();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create the user."); }
    finally { setCreating(false); }
  };

  if (authLoading) return <p className="p-6 text-sm text-muted-foreground">Checking your access…</p>;
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-2">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h1 className="text-xl font-semibold">Super host · User management</h1></div><p className="mt-1 text-sm text-muted-foreground">Create accounts and control guest, host, and controller access.</p></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void loadUsers()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button><Button size="sm" onClick={() => setCreateOpen(true)}><Plus />Add user</Button></div>
      </div>
      {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
      <div className="flex items-center justify-between gap-3"><Input className="max-w-sm" placeholder="Search name, email, or role…" value={search} onChange={(event) => setSearch(event.target.value)} /><span className="text-sm text-muted-foreground">{filteredUsers.length} user{filteredUsers.length === 1 ? "" : "s"}</span></div>
      <div className="rounded-lg border bg-card"><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Location</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Access</TableHead></TableRow></TableHeader><TableBody>
        {loading && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Loading users…</TableCell></TableRow>}
        {!loading && filteredUsers.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No users found.</TableCell></TableRow>}
        {!loading && filteredUsers.map((managedUser) => { const currentRole = roleFor(managedUser); const isSelf = managedUser.id === user?.uid; return <TableRow key={managedUser.id}><TableCell><p className="font-medium">{displayName(managedUser)} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}</p><p className="text-xs text-muted-foreground">{managedUser.email}</p></TableCell><TableCell className="text-muted-foreground">{managedUser.location || "—"}</TableCell><TableCell><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">{currentRole}</span></TableCell><TableCell><div className="ml-auto flex max-w-48 items-center gap-2"><Select value={currentRole} onValueChange={(value) => void saveRole(managedUser, value as Role)} disabled={savingUserId === managedUser.id || isSelf}><SelectTrigger aria-label={`Change ${displayName(managedUser)} role`}><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((role) => <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>)}</SelectContent></Select>{isSelf && <span className="text-xs text-muted-foreground">Protected</span>}</div></TableCell></TableRow>; })}
      </TableBody></Table></div>
      <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>Add a managed user</DialogTitle><DialogDescription>The account is created in Firebase and assigned the selected SafeTrust role.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => void createUser(event)}><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="first-name">First name</Label><Input id="first-name" value={createForm.firstName} onChange={(event) => setCreateForm({ ...createForm, firstName: event.target.value })} /></div><div className="grid gap-2"><Label htmlFor="last-name">Last name</Label><Input id="last-name" value={createForm.lastName} onChange={(event) => setCreateForm({ ...createForm, lastName: event.target.value })} /></div></div><div className="grid gap-2"><Label htmlFor="managed-email">Email</Label><Input id="managed-email" type="email" required value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} /></div><div className="grid gap-2"><Label htmlFor="managed-password">Temporary password</Label><Input id="managed-password" type="password" minLength={6} required value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} /></div><div className="grid gap-2"><Label>Initial role</Label><Select value={createForm.role} onValueChange={(value) => setCreateForm({ ...createForm, role: value as Role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((role) => <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create user"}</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
}
