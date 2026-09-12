// import React, { useState, useEffect } from "react";
// import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

// import { Button } from "@/components/ui/button";
// import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
// import { iconForMenu } from "@/lib/menuIcons";
// import { useMenus } from "@/hooks/useMenus";
// import { useAuth } from "@/lib/AuthContext";
// import ThemeSwitcher from "@/components/ThemeSwitcher";

// export default function AppLayout() {
//   const { loading: loadingMenus, menuTree } = useMenus();
//   const { user, logout } = useAuth();
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [open, setOpen] = useState(false);

//   // Debug: Log menu tree when it changes
//   useEffect(() => {
//     if (menuTree && menuTree.length > 0) {
//       console.log("=== SIDEBAR MENU TREE ===");
//       const logTree = (nodes, depth = 0) => {
//         nodes.forEach(node => {
//           console.log(`${"  ".repeat(depth)}${node.menu_key} → ${node.route_path || "NO ROUTE"}`);
//           if (node.children?.length) logTree(node.children, depth + 1);
//         });
//       };
//       logTree(menuTree);
//     }
//   }, [menuTree]);

//   const handleLogout = () => logout();

//   const navItem = (to, label, icon, extraStyle) => {
//     const Icon = icon;
//     const active = location.pathname === to;
//     return (
//       <Link
//         key={to}
//         to={to}
//         onClick={(e) => {
//           e.preventDefault();
//           e.stopPropagation();
//           console.log("Navigating to:", to); // Debug
//           setOpen(false);
//           navigate(to);
//         }}
//         style={extraStyle}
//         className={"flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer " +
//           (active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}
//       >
//         <Icon className="w-4 h-4" /> {label}
//       </Link>
//     );
//   };

//   const renderMenuNode = (node, depth) => {
//     const hasChildren = node.children && node.children.length > 0;

//     if (!hasChildren) {
//       if (!node.route_path) {
//         console.log("No route for:", node.menu_key); // Debug
//         return null;
//       }
//       const extraStyle = depth > 1 ? { paddingLeft: `${12 + (depth - 1) * 12}px` } : undefined;
//       return navItem(node.route_path, node.display_name, iconForMenu(node.icon), extraStyle);
//     }

//     return (
//       <div key={node.id} className={depth === 0 ? "pt-4" : "pt-2"}>
//         <p
//           className="px-3 text-[11px] uppercase tracking-wider text-sidebar-foreground/50 mb-1"
//           style={depth > 0 ? { paddingLeft: `${12 + depth * 12}px` } : undefined}
//         >
//           {node.display_name}
//         </p>
//         <div className="space-y-1">{node.children.map((child) => renderMenuNode(child, depth + 1))}</div>
//       </div>
//     );
//   };

//   return (
//     <div className="h-screen flex bg-background overflow-hidden">
//       {/* Sidebar */}
//       <aside className={"fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform " +
//         (open ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
//         <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
//           <span className="font-heading font-semibold text-sidebar-primary">ERP Reports</span>
//         </div>
//         <nav className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-1">
//           {/* Dashboard Link */}
//           <Link
//             to="/"
//             onClick={(e) => {
//               e.preventDefault();
//               setOpen(false);
//               navigate("/");
//             }}
//             className={"flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer " +
//               (location.pathname === "/" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}
//           >
//             <LayoutDashboard className="w-4 h-4" /> Dashboard
//           </Link>

//           {/* Dynamic menu items */}
//           {menuTree && menuTree.length > 0 ? (
//             menuTree.map((node) => renderMenuNode(node, 0))
//           ) : (
//             <div className="px-3 py-2 text-sm text-muted-foreground">
//               {loadingMenus ? "Loading menus..." : "No menus available"}
//             </div>
//           )}
//         </nav>
//         <div className="p-3 border-t border-sidebar-border">
//           <div className="px-3 py-1 text-xs text-sidebar-foreground/60 truncate">{user?.full_name || user?.username}</div>
//           <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80" onClick={handleLogout}>
//             <LogOut className="w-4 h-4 mr-2" /> Sign out
//           </Button>
//         </div>
//       </aside>

//       {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

//       {/* Main */}
//       <div className="flex-1 flex flex-col min-w-0 min-h-0">
//         <header className="h-16 shrink-0 flex items-center gap-3 px-4 border-b border-border lg:px-8 no-print">
//           <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)}>
//             {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
//           </Button>
//           <span className="font-heading font-medium">Reporting Module</span>
//           <div className="ml-auto">
//             <ThemeSwitcher />
//           </div>
//         </header>
//         <main className="flex-1 overflow-y-auto p-4 lg:p-8">
//           {loadingMenus ? (
//             <div className="flex items-center justify-center py-20">
//               <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
//             </div>
//           ) : (
//             <Outlet />
//           )}
//         </main>
//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { iconForMenu } from "@/lib/menuIcons";
import { useMenus } from "@/hooks/useMenus";
import { useAuth } from "@/lib/AuthContext";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export default function AppLayout() {
  const { loading: loadingMenus, menuTree } = useMenus();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Debug: Log menu tree when it changes
  useEffect(() => {
    if (menuTree && menuTree.length > 0) {
      console.log("=== SIDEBAR MENU TREE ===");
      const logTree = (nodes, depth = 0) => {
        nodes.forEach((node) => {
          console.log(
            `${"  ".repeat(depth)}${node.menu_key} → ${node.route_path || "NO ROUTE"}`,
          );
          if (node.children?.length) logTree(node.children, depth + 1);
        });
      };
      logTree(menuTree);
    }
  }, [menuTree]);

  const handleLogout = () => logout();

  const navItem = (to, label, icon, extraStyle) => {
    const Icon = icon;
    const active = location.pathname === to;
    return (
      <Link
        key={to}
        to={to}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Navigating to:", to); // Debug
          setOpen(false);
          navigate(to);
        }}
        style={extraStyle}
        className={
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer " +
          (active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")
        }
      >
        <Icon className="w-4 h-4" /> {label}
      </Link>
    );
  };

  const renderMenuNode = (node, depth) => {
    const hasChildren = node.children && node.children.length > 0;

    if (!hasChildren) {
      if (!node.route_path) {
        console.log("No route for:", node.menu_key); // Debug
        return null;
      }
      const extraStyle =
        depth > 1 ? { paddingLeft: `${12 + (depth - 1) * 12}px` } : undefined;
      return navItem(
        node.route_path,
        node.display_name,
        iconForMenu(node.icon),
        extraStyle,
      );
    }

    return (
      <div key={node.id} className={depth === 0 ? "pt-4" : "pt-2"}>
        <p
          className="px-3 text-[11px] uppercase tracking-wider text-sidebar-foreground/50 mb-1"
          style={
            depth > 0 ? { paddingLeft: `${12 + depth * 12}px` } : undefined
          }
        >
          {node.display_name}
        </p>
        <div className="space-y-1">
          {node.children.map((child) => renderMenuNode(child, depth + 1))}
        </div>
      </div>
    );
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform " +
          (open ? "translate-x-0" : "-translate-x-full lg:translate-x-0")
        }
      >
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
          <img
            src="/public/LogoPS360.png"
            alt="ERP Reports"
            className="w-48 h-auto object-contain"
          />
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-1">
          <Link
            to="/"
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              navigate("/");
            }}
            className={
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer " +
              (location.pathname === "/"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")
            }
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>

          {/* Dynamic menu items */}
          {menuTree && menuTree.length > 0 ? (
            menuTree.map((node) => renderMenuNode(node, 0))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {loadingMenus ? "Loading menus..." : "No menus available"}
            </div>
          )}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          {/* <div className="px-3 py-1 text-xs text-sidebar-foreground/60 truncate">
            {user?.full_name || user?.username}
          </div> */}
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-16 shrink-0 flex items-center gap-3 px-4 border-b border-border lg:px-8 no-print">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <span className="font-heading font-medium">Reporting Module</span>
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {loadingMenus ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : (
            <Outlet />
          )}
        </main>

        <footer className="shrink-0 py-5 px-4 lg:px-8 border-t border-border text-center text-sm font-medium text-muted-foreground no-print">
          © {currentYear} Powered by Powersoft360. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
