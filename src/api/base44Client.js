import { mockDb } from './mockBackend';
import { apiClient } from './apiClient';

// This app's data client. Two modes:
//
// REAL BACKEND MODE (default once configured): talks to the standalone
// Express/SQL Server API in /backend. Set VITE_API_BASE_URL in .env.local,
// e.g. VITE_API_BASE_URL=http://localhost:4000/api — see backend/README.md.
//
// DEMO MODE (fallback, unchanged from before): when VITE_API_BASE_URL is not
// set, the app uses a local, in-browser mock backend (src/api/mockBackend.js)
// with fake data — no backend or SQL Server needed. Data is kept in
// localStorage so it persists across refreshes.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const isDemoMode = !apiBaseUrl;

export const base44 = isDemoMode ? mockDb : apiClient;

if (isDemoMode && typeof window !== 'undefined') {
  console.info(
    '[demo mode] No VITE_API_BASE_URL set — using the local mock backend with fake data. ' +
      'Set VITE_API_BASE_URL in .env.local to connect the real backend (see /backend).'
  );
}

// Most of this app's code refers to the client as `db` — keep both names
// available so every import style used across the app resolves correctly.
export const db = base44;

export default base44;
