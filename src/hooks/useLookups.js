import { db } from "@/api/base44Client";
import { useState, useEffect, useCallback } from "react";

import {
  loadCompaniesCache,
  saveCompaniesCache,
  loadCompanyLookupsCache,
  saveCompanyLookupsCache,
} from "@/lib/lookupsCache";

const EMPTY = { costCenters: [], accounts: [], customers: [], vendors: [], items: [] };

// Returns the ERP setup/lookup tables for a company, backed by a local cache.
// On first use the data is fetched from the database and stored; subsequent
// mounts read from the cache instantly. `refresh()` re-fetches from the
// database and updates the cache.
/**
 * @param {string} [companyCode]
 */
export function useLookups(companyCode) {
  const [companies, setCompanies] = useState(() => {
    const c = loadCompaniesCache();
    return c ? c.data : [];
  });
  const [lookups, setLookups] = useState(EMPTY);
  const [loadingCompanies, setLoadingCompanies] = useState(() => !loadCompaniesCache());
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Companies: show the cached list instantly (if any), then always re-fetch
  // on mount. The company list is user-specific (filtered by permissions), so
  // a stale cache left by a previous user on a shared browser must not be
  // trusted as the final value.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await db.functions.invoke("getLookups", {});
        if (!alive) return;
        const comps = res.data.companies || [];
        saveCompaniesCache(comps);
        setCompanies(comps);
      } catch (e) {
        /* ignore — cached/empty list shown */
      } finally {
        if (alive) setLoadingCompanies(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Per-company lookups: serve from cache, fetch only when no cache exists.
  useEffect(() => {
    if (!companyCode) {
      setLookups(EMPTY);
      return;
    }
    const cached = loadCompanyLookupsCache(companyCode);
    if (cached && cached.data) {
      setLookups(cached.data);
      return;
    }
    let alive = true;
    setLoadingLookups(true);
    (async () => {
      try {
        const res = await db.functions.invoke("getLookups", { companyCode });
        if (!alive) return;
        const data = {
          costCenters: res.data.costCenters || [],
          accounts: res.data.accounts || [],
          customers: res.data.customers || [],
          vendors: res.data.vendors || [],
          items: res.data.items || [],
        };
        saveCompanyLookupsCache(companyCode, data);
        if (alive) setLookups(data);
      } catch (e) {
        /* ignore */
      } finally {
        if (alive) setLoadingLookups(false);
      }
    })();
    return () => { alive = false; };
  }, [companyCode]);

  // Re-fetch companies + the current company's lookups from the database.
  const [refreshError, setRefreshError] = useState("");
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError("");
    try {
      const resC = await db.functions.invoke("getLookups", {});
      const comps = resC.data.companies || [];
      saveCompaniesCache(comps);
      setCompanies(comps);

      if (companyCode) {
        const res = await db.functions.invoke("getLookups", { companyCode });
        const data = {
          costCenters: res.data.costCenters || [],
          accounts: res.data.accounts || [],
          customers: res.data.customers || [],
          vendors: res.data.vendors || [],
          items: res.data.items || [],
        };
        saveCompanyLookupsCache(companyCode, data);
        setLookups(data);
      }
    } catch (e) {
      const err = /** @type {{ response?: { data?: { error?: string } }, message?: string }} */ (e);
      setRefreshError(err.response?.data?.error || err.message || "Failed to refresh setup data");
    } finally {
      setRefreshing(false);
    }
  }, [companyCode]);

  return {
    companies,
    costCenters: lookups.costCenters,
    accounts: lookups.accounts,
    customers: lookups.customers,
    vendors: lookups.vendors,
    items: lookups.items,
    loading: loadingCompanies || loadingLookups,
    refreshing,
    refresh,
    refreshError,
  };
}