// Local (localStorage) cache for ERP setup/lookup tables returned by the
// getLookups backend function: Company Information, Cost Center, Chart
// (accounts/customers/vendors) and Item information.
//
// The companies list is global; the remaining lookups are per company code.

const COMPANIES_KEY = "sonex:lookups:companies";
const companyKey = (code) => `sonex:lookups:co:${code}`;
const OWNER_KEY = "sonex:lookups:owner";

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* storage full or unavailable — ignore */
  }
}

export function loadCompaniesCache() {
  return read(COMPANIES_KEY);
}

export function saveCompaniesCache(data) {
  write(COMPANIES_KEY, { data, ts: Date.now() });
}

export function loadCompanyLookupsCache(companyCode) {
  return read(companyKey(companyCode));
}

export function saveCompanyLookupsCache(companyCode, data) {
  write(companyKey(companyCode), { data, ts: Date.now() });
}

export function clearLookupsCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sonex:lookups:"))
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    /* ignore */
  }
}

// Track which user the cached lookups belong to. When the logged-in user
// changes (e.g. admin logs out and a different user logs in on the same
// browser), the stale cache must be discarded so the new user fetches their
// own company list and setup tables.
export function getCacheOwner() {
  try {
    return localStorage.getItem(OWNER_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function setCacheOwner(userId) {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch (e) {
    /* ignore */
  }
}