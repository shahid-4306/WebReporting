// import { FileText, Users, ShieldCheck, LayoutDashboard, Folder } from "lucide-react";

// // Icon names here match exactly what AppLayout already imports/uses today
// // (FileText for report items, Users for User Access) plus the two new ones
// // introduced by this system (ShieldCheck for Role Management, Folder as a
// // generic fallback for a menu row with no icon set). Nothing about the
// // existing icon set changes — this only makes the choice per-menu-item
// // data-driven instead of hardcoded per component.
// const ICONS = {
//   FileText,
//   Users,
//   ShieldCheck,
//   LayoutDashboard,
//   Folder,
// };

// export function iconForMenu(iconName) {
//   return ICONS[iconName] || Folder;
// }


import { FileText, Users, ShieldCheck, LayoutDashboard } from "lucide-react";

// Icon names here match exactly what AppLayout already imports/uses today
// (FileText for report items, Users for User Access) plus the two new ones
// introduced by this system (ShieldCheck for Role Management, FileText as a
// generic fallback for a menu row with no icon set). Nothing about the
// existing icon set changes — this only makes the choice per-menu-item
// data-driven instead of hardcoded per component.
const ICONS = {
  FileText,
  Users,
  ShieldCheck,
  LayoutDashboard,
};

export function iconForMenu(iconName) {
  return ICONS[iconName] || FileText;
}