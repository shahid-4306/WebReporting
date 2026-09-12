// @ts-nocheck
import { db } from "@/api/base44Client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShieldCheck, UserPlus, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [access, setAccess] = useState([]);
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState({ allowed_companies: [] });
  const [saving, setSaving] = useState(false);
  const [assigningRole, setAssigningRole] = useState(false);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ user_code: "", user_name: "", user_password: "", role_id: "" });
  const [creating, setCreating] = useState(false);

  const [editDraft, setEditDraft] = useState({ user_name: "", user_password: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [u, a, r, c] = await Promise.all([
        db.entities.User.list(),
        db.entities.ReportAccess.list(),
        db.roles.list(),
        db.functions.invoke("getLookups", {}),
      ]);
      setUsers(u || []);
      setAccess(a || []);
      setRoles(r || []);
      setCompanies(c?.data?.companies || []);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const accessFor = (userId) => access.find((x) => x.user_id === userId);
  const roleName = (roleId) => roles.find((r) => r.id === roleId)?.name;

  const selectUser = (userId) => {
    setSelectedId(userId);
    const rec = accessFor(userId);
    setDraft({ allowed_companies: (rec && rec.allowed_companies) || [] });
    const u = users.find((x) => x.id === userId);
    setEditDraft({ user_name: u?.full_name || "", user_password: "" });
  };

  const saveEdit = async () => {
    if (!editDraft.user_name.trim()) {
      toast({ title: "Error", description: "Full name cannot be empty", variant: "destructive" });
      return;
    }
    if (editDraft.user_password && editDraft.user_password.length > 10) {
      toast({ title: "Error", description: "Password must be 10 characters or less", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      const payload = { user_name: editDraft.user_name.trim() };
      if (editDraft.user_password) payload.user_password = editDraft.user_password;
      await db.users.update(selectedId, payload);
      toast({ title: "Saved", description: "User details updated." });
      setEditDraft((d) => ({ ...d, user_password: "" }));
      await load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleStatus = async (userId, nextActive) => {
    setTogglingStatus(true);
    try {
      await db.users.setActive(userId, nextActive);
      toast({ title: "Saved", description: `User ${nextActive ? "activated" : "deactivated"}.` });
      await load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setTogglingStatus(false);
    }
  };

  const toggleCompany = (value) => {
    setDraft((d) => {
      const arr = d.allowed_companies || [];
      return { ...d, allowed_companies: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const existing = accessFor(selectedId);
      if (existing) {
        await db.entities.ReportAccess.update(existing.id, { allowed_companies: draft.allowed_companies });
      } else {
        await db.entities.ReportAccess.create({
          user_id: selectedId,
          user_email: "",
          allowed_companies: draft.allowed_companies,
        });
      }
      toast({ title: "Saved", description: "Company access updated." });
      await load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const assignRole = async (roleId) => {
    setAssigningRole(true);
    try {
      await db.users.updateRoleId(selectedId, roleId || null);
      toast({ title: "Saved", description: "Role updated." });
      await load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setAssigningRole(false);
    }
  };

  const createUser = async () => {
    if (!newUser.user_code.trim() || !newUser.user_password.trim()) {
      toast({ title: "Error", description: "User code and password are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api").replace(/\/$/, "");
      const token = localStorage.getItem("sonex_access_token");
      const res = await fetch(`${apiBase}/users`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          user_code: newUser.user_code.trim(),
          user_name: newUser.user_name.trim() || newUser.user_code.trim(),
          user_password: newUser.user_password.trim(),
          role_code: "USER",
          role_id: newUser.role_id || null,
          active: 1
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }
      
      toast({ title: "Success", description: `User "${newUser.user_code}" created!` });
      setNewUser({ user_code: "", user_name: "", user_password: "", role_id: "" });
      setShowCreateForm(false);
      await load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedUser = users.find((x) => x.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold">User Access</h1>
          <p className="text-muted-foreground mt-1">
            Create users, assign roles, and manage company access.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/roles">
              <ShieldCheck className="w-4 h-4 mr-2" /> Manage Roles
            </Link>
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <UserPlus className="w-4 h-4 mr-2" /> New User
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <div className="rounded-lg border border-border p-5 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Create New User</h2>
            <button onClick={() => setShowCreateForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">User Code (max 8)</label>
              <Input 
                placeholder="e.g., TEST" 
                value={newUser.user_code} 
                onChange={(e) => setNewUser({...newUser, user_code: e.target.value})}
                maxLength={8}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Full Name</label>
              <Input 
                placeholder="e.g., Test User" 
                value={newUser.user_name} 
                onChange={(e) => setNewUser({...newUser, user_name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Password</label>
              <Input 
                placeholder="e.g., test123" 
                value={newUser.user_password} 
                onChange={(e) => setNewUser({...newUser, user_password: e.target.value})}
                maxLength={10}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Role</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3"
                value={newUser.role_id}
                onChange={(e) => setNewUser({...newUser, role_id: e.target.value})}
              >
                <option value="">No role assigned</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={createUser} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create User
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Users ({users.length})</h2>
          <div className="space-y-1 max-h-[65vh] overflow-y-auto">
            {users.map((u) => {
              const isAdm = u.role === "admin";
              return (
                <button
                  key={u.id}
                  onClick={() => selectUser(u.id)}
                  className={"w-full text-left px-3 py-2.5 rounded-md border transition-colors " +
                    (selectedId === u.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50") +
                    (u.active === false ? " opacity-50" : "")}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{u.username}</span>
                    {isAdm && <ShieldCheck className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                  <span className="text-xs text-muted-foreground truncate block">{u.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {isAdm ? "Admin · all access" : roleName(u.role_id) || "No role assigned"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          {!selectedUser ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
              Select a user to manage their access.
            </div>
          ) : selectedUser.role === "admin" ? (
            <div className="rounded-lg border border-border p-6 text-center text-muted-foreground space-y-3">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p>{selectedUser.username} is an admin and has access to all menus and companies.</p>
              <Button
                variant="outline"
                size="sm"
                disabled={togglingStatus}
                onClick={() => toggleStatus(selectedUser.id, selectedUser.active === false)}
              >
                {togglingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {selectedUser.active === false ? "Activate User" : "Deactivate User"}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium">{selectedUser.username}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedUser.full_name} · {selectedUser.active === false ? "Inactive" : "Active"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={togglingStatus}
                  onClick={() => toggleStatus(selectedUser.id, selectedUser.active === false)}
                >
                  {togglingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {selectedUser.active === false ? "Activate" : "Deactivate"}
                </Button>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Edit Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Full Name</label>
                    <Input
                      value={editDraft.user_name}
                      onChange={(e) => setEditDraft({ ...editDraft, user_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">New Password (leave blank to keep current)</label>
                    <Input
                      value={editDraft.user_password}
                      maxLength={10}
                      onChange={(e) => setEditDraft({ ...editDraft, user_password: e.target.value })}
                    />
                  </div>
                </div>
                <Button className="mt-3" size="sm" onClick={saveEdit} disabled={savingEdit}>
                  {savingEdit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Details
                </Button>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Assign Role</h3>
                <select
                  className="h-10 w-full sm:w-72 rounded-md border border-input bg-background px-3"
                  value={selectedUser.role_id || ""}
                  disabled={assigningRole}
                  onChange={(e) => assignRole(e.target.value)}
                >
                  <option value="">No role assigned</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Allowed Companies</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {companies.map((c) => (
                    <label key={c.code} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={draft.allowed_companies.includes(c.code)}
                        onCheckedChange={() => toggleCompany(c.code)}
                      />
                      <span className="text-sm">{c.code} - {c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Companies
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}