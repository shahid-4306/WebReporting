// Real HTTP client for the standalone Express/SQL Server backend
// (see /backend). Deliberately mirrors the shape of src/api/mockBackend.js
// (auth, entities, functions.invoke, users) so every existing page/hook in
// this app — AuthContext, useReportAccess, useLookups, UserManagement,
// Login/Register/ForgotPassword/ResetPassword, Dashboard, ReportPage — keeps
// working unchanged; only what's underneath `db` changed.

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api").replace(/\/$/, "");
const TOKEN_KEY = "sonex_access_token";

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}
function setTokenInternal(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    /* ignore */
  }
}

function apiError(message, status, extra) {
  const err = new Error(message);
  err.status = status;
  err.response = { status, data: { error: message, ...extra } };
  return err;
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw apiError("Could not reach the server. Check your connection and try again.", 0);
  }

  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    /* empty body */
  }

  if (!res.ok) {
    throw apiError((json && json.error) || `Request failed (${res.status})`, res.status);
  }
  return json;
}

export const apiClient = {
  auth: {
    async me() {
      return request("/auth/me");
    },
    async isAuthenticated() {
      if (!getToken()) return false;
      try {
        await request("/auth/me");
        return true;
      } catch (e) {
        return false;
      }
    },
    // Authenticates against the real ERP login table (USER_CODE /
    // USER_PASSWORD) — no email/self-registration/OTP/Google in this mode,
    // see backend/routes/auth.routes.js.
    async loginViaUsernamePassword(username, password) {
      const result = await request("/auth/login", { method: "POST", body: { username, password }, auth: false });
      setTokenInternal(result.access_token);
      return result;
    },
    setToken(token) {
      setTokenInternal(token);
    },
    logout(returnUrl) {
      setTokenInternal(null);
      if (returnUrl) window.location.href = returnUrl;
    },
    redirectToLogin(returnTo) {
      const q = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
      window.location.href = `/login${q}`;
    },
  },

  entities: {
    User: {
      async list() {
        return request("/users");
      },
    },
    ReportAccess: {
      async list() {
        return request("/report-access");
      },
      async filter(query) {
        const all = await request("/report-access");
        return all.filter((r) => Object.entries(query || {}).every(([k, v]) => r[k] === v));
      },
      async create(payload) {
        return request("/report-access", { method: "POST", body: payload });
      },
      async update(id, payload) {
        return request(`/report-access/${id}`, { method: "PUT", body: payload });
      },
    },
  },

  functions: {
    async invoke(name, params = {}) {
      const data = await request(`/functions/${name}`, { method: "POST", body: params });
      return data; // already shaped as { data: ... } by the backend
    },
  },

  users: {
    async updateRoleId(userId, roleId) {
      return request(`/users/${userId}/role-id`, { method: "PATCH", body: { role_id: roleId } });
    },
    async update(userId, payload) {
      return request(`/users/${userId}`, { method: "PUT", body: payload });
    },
    async setActive(userId, active) {
      return request(`/users/${userId}/status`, { method: "PATCH", body: { active } });
    },
  },

  // Menu-Based Role Access Control (RBAC): the Menu Master tree, Roles, and
  // the Role<->Menu permission assignments. `menus.my()` is what the
  // dynamic sidebar reads; the rest power the admin Role Management screen.
  menus: {
    async my() {
      return request("/menus/my");
    },
    async list() {
      return request("/menus");
    },
    async create(payload) {
      return request("/menus", { method: "POST", body: payload });
    },
    async update(id, payload) {
      return request(`/menus/${id}`, { method: "PUT", body: payload });
    },
    async remove(id) {
      return request(`/menus/${id}`, { method: "DELETE" });
    },
  },

  roles: {
    async list() {
      return request("/roles");
    },
    async create(payload) {
      return request("/roles", { method: "POST", body: payload });
    },
    async update(id, payload) {
      return request(`/roles/${id}`, { method: "PUT", body: payload });
    },
    async remove(id) {
      return request(`/roles/${id}`, { method: "DELETE" });
    },
    async setPermissions(id, menuIds) {
      return request(`/roles/${id}/permissions`, { method: "PUT", body: { menu_ids: menuIds } });
    },
  },
};

export default apiClient;
