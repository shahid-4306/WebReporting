import { db } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useMenus } from "@/hooks/useMenus";

// Resolves the current user's report/company access.
//
// Identity (the "user" object and whether the session is authenticated) is
// owned exclusively by AuthContext (see src/lib/AuthContext.jsx) — this hook
// reads it from there instead of calling db.auth.me() again, so every
// consumer (AppLayout, Dashboard, ReportPage, ...) always agrees on who is
// signed in and never fires a redundant "who am I" request.
//
// Report access (`hasReport`) now comes from the Menu-Based RBAC system —
// the user's Role and its granted menus, via useMenus() — instead of a
// per-user JSON list. Company access (`allowedCompanies`) is a separate,
// unrelated concern and is left exactly as it was: fetched from the
// ReportAccess entity, keyed by user id, through React Query so multiple
// components mounted at once share a single request/cache entry.
//
// allowedCompanies === null means "all" (admin).
export function useReportAccess() {
  const { user, isLoadingAuth } = useAuth();
  const isAdmin = !!user && user.role === "admin";
  const { loading: isLoadingMenus, hasMenu } = useMenus();

  const {
    data: accessRecord,
    isLoading: isLoadingAccess,
  } = useQuery({
    queryKey: ["reportAccess", user?.id],
    queryFn: async () => {
      const recs = await db.entities.ReportAccess.filter({ user_id: user.id });
      return recs[0] || {};
    },
    // Admins implicitly have access to everything, so there is nothing to
    // fetch for them; only query once we know who the (non-admin) user is.
    enabled: !!user && !isAdmin,
    // Access rules rarely change during a session; avoid refetching on
    // every remount/focus while still picking up admin-made changes on the
    // next navigation/mount.
    staleTime: 60_000,
  });

  const loading = isLoadingAuth || isLoadingMenus || (!!user && !isAdmin && isLoadingAccess);
  // Fail closed: while loading, on a fetch error, or for a user with no
  // record yet, treat access as empty rather than "all".
  const allowedCompanies = isAdmin ? null : (accessRecord?.allowed_companies || []);

  const hasReport = (key) => isAdmin || hasMenu(key);

  return { user, isAdmin, allowedCompanies, loading, hasReport };
}
