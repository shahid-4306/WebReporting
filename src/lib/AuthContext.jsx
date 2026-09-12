import { db } from "@/api/base44Client";
import React, { createContext, useState, useContext, useEffect } from 'react';

import { clearLookupsCache, getCacheOwner, setCacheOwner } from '@/lib/lookupsCache';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAppState();
  }, []);

  // Checks whether the current visitor is signed in by asking the SDK for
  // the current user. `db.auth.me()` resolves with the user when a valid
  // session exists and rejects (401/403) otherwise, so we can drive the
  // whole auth/error state machine from that single call.
  const checkAppState = async () => {
    setIsLoadingPublicSettings(true);
    setAuthError(null);
    try {
      await checkUserAuth();
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingAuth(false);
    } finally {
      setIsLoadingPublicSettings(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await db.auth.me();
      // Discard any setup cache left by a previous user on this browser so
      // the new user fetches their own company list / lookups. This runs before
      // any authenticated page mounts, so useLookups reads a fresh cache.
      if (currentUser && currentUser.id && getCacheOwner() !== currentUser.id) {
        clearLookupsCache();
        setCacheOwner(currentUser.id);
      }
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);

      // A plain 401 just means "not logged in yet" — that's the normal
      // state for a guest visiting a public page (e.g. /login), so it must
      // NOT be surfaced as an authError (that would force-redirect even
      // public routes and could loop). Only genuinely unexpected failures
      // (e.g. the app rejecting this user specifically, or a network/
      // server error) are surfaced so the UI can show something useful.
      if (error.status === 403 && error?.response?.data?.extra_data?.reason === 'user_not_registered') {
        setAuthError({
          type: 'user_not_registered',
          message: 'User not registered for this app'
        });
      } else if (error.status && error.status !== 401) {
        setAuthError({
          type: 'unknown',
          message: error.message || 'Failed to verify your session'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      db.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      db.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    db.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};