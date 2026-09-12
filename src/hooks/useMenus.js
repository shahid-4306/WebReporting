// // import { db } from "@/api/base44Client";
// // import { useQuery } from "@tanstack/react-query";
// // import { useAuth } from "@/lib/AuthContext";

// // // Flattens a menu tree into a Set of every leaf/branch menu_key present in
// // // it — used to answer "is this route/report permitted" without walking the
// // // tree at every call site.
// // function flattenKeys(tree, out = new Set()) {
// //   for (const node of tree) {
// //     out.add(node.menu_key);
// //     if (node.children?.length) flattenKeys(node.children, out);
// //   }
// //   return out;
// // }

// // // Resolves the authenticated user's permitted menu tree from the backend
// // // (GET /api/menus/my — Menu Master -> Role -> Role Menu Permissions ->
// // // User Role, already applied server-side). This is the single source of
// // // truth the dynamic sidebar renders from; nothing about which menus a user
// // // can see is decided in the frontend.
// // export function useMenus() {
// //   const { user, isLoadingAuth } = useAuth();

// //   const { data: menuTree, isLoading: isLoadingMenus } = useQuery({
// //     queryKey: ["menus", "my", user?.id],
// //     queryFn: () => db.menus.my(),
// //     enabled: !!user,
// //     // A role's permissions rarely change mid-session; refetch on the next
// //     // mount/navigation rather than on every focus, same staleness policy as
// //     // useReportAccess used for the old per-user access record.
// //     staleTime: 60_000,
// //   });

// //   const tree = menuTree || [];
// //   const loading = isLoadingAuth || (!!user && isLoadingMenus);
// //   const permittedKeys = flattenKeys(tree);
// //   const hasMenu = (menuKey) => permittedKeys.has(menuKey);

// //   return { menuTree: tree, loading, permittedKeys, hasMenu };
// // }

// import { db } from "@/api/base44Client";
// import { useQuery } from "@tanstack/react-query";
// import { useAuth } from "@/lib/AuthContext";

// // Flattens a menu tree into a Set of every leaf/branch menu_key present in
// // it — used to answer "is this route/report permitted" without walking the
// // tree at every call site.
// function flattenKeys(tree, out = new Set()) {
//   if (!tree || !Array.isArray(tree)) return out;
//   for (const node of tree) {
//     if (node.menu_key) out.add(node.menu_key);
//     if (node.children?.length) flattenKeys(node.children, out);
//   }
//   return out;
// }

// // Resolves the authenticated user's permitted menu tree from the backend
// // (GET /api/menus/my — Menu Master -> Role -> Role Menu Permissions ->
// // User Role, already applied server-side). This is the single source of
// // truth the dynamic sidebar renders from; nothing about which menus a user
// // can see is decided in the frontend.
// export function useMenus() {
//   const { user, isLoadingAuth } = useAuth();

//   const { data, isLoading: isLoadingMenus, error } = useQuery({
//     queryKey: ["menus", "my", user?.id],
//     queryFn: async () => {
//       try {
//         const result = await db.menus.my();
//         // Backend returns array directly (not wrapped in {menuTree: ...})
//         // So we ensure we always return an array
//         return Array.isArray(result) ? result : (result?.menuTree || result?.menus || []);
//       } catch (err) {
//         console.error("Failed to fetch menus:", err);
//         return [];
//       }
//     },
//     enabled: !!user,
//     // A role's permissions rarely change mid-session; refetch on the next
//     // mount/navigation rather than on every focus, same staleness policy as
//     // useReportAccess used for the old per-user access record.
//     staleTime: 60_000,
//   });

//   const menuTree = data || [];
//   const loading = isLoadingAuth || (!!user && isLoadingMenus);
//   const permittedKeys = flattenKeys(menuTree);
  
//   // hasMenu checks if the user has access to a specific menu key.
//   // Admins bypass all menu checks (return true always).
//   const hasMenu = (menuKey) => {
//     if (user?.role === "admin") return true;
//     return permittedKeys.has(menuKey);
//   };

//   return { 
//     menuTree, 
//     loading, 
//     permittedKeys, 
//     hasMenu,
//     error 
//   };
// }
import { db } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";

// Flattens a menu tree into a Set of every leaf/branch menu_key present in it
function flattenKeys(tree, out = new Set()) {
  if (!tree || !Array.isArray(tree)) return out;
  for (const node of tree) {
    if (node.menu_key) out.add(node.menu_key);
    if (node.children?.length) flattenKeys(node.children, out);
  }
  return out;
}

export function useMenus() {
  const { user, isLoadingAuth } = useAuth();

  const { data, isLoading: isLoadingMenus, error } = useQuery({
    queryKey: ["menus", "my", user?.id],
    queryFn: async () => {
      try {
        const result = await db.menus.my();
        return Array.isArray(result) ? result : (result?.menuTree || result?.menus || []);
      } catch (err) {
        console.error("Failed to fetch menus:", err);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const menuTree = data || [];
  const loading = isLoadingAuth || (!!user && isLoadingMenus);
  const permittedKeys = flattenKeys(menuTree);
  
  const hasMenu = (menuKey) => {
    if (user?.role === "admin") return true;
    return permittedKeys.has(menuKey);
  };

  return { menuTree, loading, permittedKeys, hasMenu, error };
}