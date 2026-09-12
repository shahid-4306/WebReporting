import { db } from "@/api/base44Client";
import React, { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Trash2, ShieldCheck } from "lucide-react";

// Builds the same parent/children tree shape the backend's menusRepo does,
// from the flat list GET /api/menus returns (admin-only, unfiltered by
// permission — this screen is where permissions are set in the first
// place).
function buildTree(flatMenus) {
  const byId = new Map(flatMenus.map((m) => [m.id, { ...m, children: [] }]));
  const roots = [];
  for (const m of byId.values()) {
    if (m.parent_id && byId.has(m.parent_id)) byId.get(m.parent_id).children.push(m);
    else if (!m.parent_id) roots.push(m);
  }
  const sortRec = (list) => {
    list.sort((a, b) => a.display_order - b.display_order || a.display_name.localeCompare(b.display_name));
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

// Every leaf (route-bearing) menu id beneath a node, used so checking/
// unchecking a group grants/revokes every report under it in one click.
function collectLeafIds(node, out = []) {
  if (!node.children || node.children.length === 0) {
    if (node.route_path) out.push(node.id);
    return out;
  }
  node.children.forEach((c) => collectLeafIds(c, out));
  return out;
}

export default function RoleManagement() {
  const { toast } = useToast();
  const [roles, setRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([db.roles.list(), db.menus.list()]);
      setRoles(r);
      setMenus(m);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const tree = useMemo(() => buildTree(menus.filter((m) => m.is_active)), [menus]);

  const selectRole = (roleId) => {
    setSelectedRoleId(roleId);
    const role = roles.find((r) => r.id === roleId);
    setCheckedIds(new Set(role?.menu_ids || []));
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const toggleLeaf = (menuId) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(menuId)) next.delete(menuId);
      else next.add(menuId);
      return next;
    });
  };

  const toggleGroup = (node) => {
    const leafIds = collectLeafIds(node);
    const allChecked = leafIds.every((id) => checkedIds.has(id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      leafIds.forEach((id) => (allChecked ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      await db.roles.setPermissions(selectedRoleId, Array.from(checkedIds));
      toast({ title: "Saved", description: "Role permissions updated." });
      await load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    setCreating(true);
    try {
      const created = await db.roles.create({ name: newRoleName.trim(), description: newRoleDesc.trim() });
      setNewRoleName("");
      setNewRoleDesc("");
      toast({ title: "Role created", description: created.name });
      await load();
      selectRole(created.id);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const deleteRole = async (roleId) => {
    try {
      await db.roles.remove(roleId);
      if (selectedRoleId === roleId) setSelectedRoleId(null);
      toast({ title: "Role deleted" });
      await load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const renderNode = (node, depth) => {
    const hasChildren = node.children && node.children.length > 0;
    if (!hasChildren) {
      if (!node.route_path) return null;
      return (
        <label
          key={node.id}
          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
          style={{ paddingLeft: `${8 + depth * 20}px` }}
        >
          <Checkbox checked={checkedIds.has(node.id)} onCheckedChange={() => toggleLeaf(node.id)} />
          <span className="text-sm">{node.display_name}</span>
        </label>
      );
    }
    const leafIds = collectLeafIds(node);
    const allChecked = leafIds.length > 0 && leafIds.every((id) => checkedIds.has(id));
    const someChecked = leafIds.some((id) => checkedIds.has(id));
    return (
      <div key={node.id} className={depth === 0 ? "pt-3" : "pt-1"}>
        <label
          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer font-medium text-sm"
          style={{ paddingLeft: `${8 + depth * 20}px` }}
        >
          <Checkbox
            checked={allChecked}
            className={!allChecked && someChecked ? "data-[state=unchecked]:bg-primary/30" : ""}
            onCheckedChange={() => toggleGroup(node)}
          />
          {node.display_name}
        </label>
        <div>{node.children.map((c) => renderNode(c, depth + 1))}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold">Role Management</h1>
        <p className="text-muted-foreground mt-1">
          Create roles and choose which menus each one can see. Assign a role to a user from{" "}
          <a href="/users" className="underline">User Access</a> — their sidebar and API access update automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles list + create */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-3 bg-card space-y-2">
            <Label className="text-xs">New role</Label>
            <Input placeholder="Role name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
            <Input placeholder="Description (optional)" value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} />
            <Button size="sm" className="w-full" onClick={createRole} disabled={creating || !newRoleName.trim()}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create role
            </Button>
          </div>

          <div className="space-y-1">
            {roles.map((r) => (
              <div
                key={r.id}
                className={"flex items-center gap-2 px-3 py-2.5 rounded-md border transition-colors " +
                  (selectedRoleId === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}
              >
                <button className="flex-1 text-left" onClick={() => selectRole(r.id)}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{r.name}</span>
                    {r.is_system && <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  </div>
                  {r.description && <span className="text-xs text-muted-foreground">{r.description}</span>}
                </button>
                {!r.is_system && (
                  <button
                    onClick={() => deleteRole(r.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Delete role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Permission tree */}
        <div className="lg:col-span-2">
          {!selectedRole ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
              Select a role to manage its menu permissions.
            </div>
          ) : (
            <div className="rounded-lg border border-border p-5 space-y-4">
              <div>
                <h2 className="font-medium">{selectedRole.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedRole.is_system
                    ? "Built-in role — its permissions can still be edited."
                    : "Custom role."}{" "}
                  Checking a group grants every report under it; parent menus appear in the sidebar automatically once a child is granted.
                </p>
              </div>

              <div className="max-h-[55vh] overflow-y-auto pr-1">
                {tree.map((n) => renderNode(n, 0))}
              </div>

              <Button onClick={savePermissions} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Permissions
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
