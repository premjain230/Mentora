"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, onSnapshot, Firestore } from "firebase/firestore";
import { initFirebase } from "../lib/firebase";
import {
  resolveIsPro,
  UserPlanData,
  EntitlementClaims,
  EntitlementData,
} from "../lib/subscription";

interface AuthContextType {
  user: User | null;
  userData: UserPlanData | null;
  isPro: boolean;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  isPro: false,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  refreshUserData: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserPlanData | null>(null);
  const [claims, setClaims] = useState<EntitlementClaims | null>(null);
  const [entitlement, setEntitlement] = useState<EntitlementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let authUnsub: (() => void) | undefined;
    let userDocUnsub: (() => void) | undefined;
    let entDocUnsub: (() => void) | undefined;

    initFirebase().then(({ auth, db }) => {
      if (!auth) {
        setLoading(false);
        return;
      }

      authUnsub = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (userDocUnsub) {
          userDocUnsub();
          userDocUnsub = undefined;
        }
        if (entDocUnsub) {
          entDocUnsub();
          entDocUnsub = undefined;
        }

        if (currentUser) {
          // Force-refresh claims to catch newly activated subscriptions
          try {
            const tokenResult = await currentUser.getIdTokenResult(true).catch(() => null);
            setClaims((tokenResult?.claims as EntitlementClaims) || null);
          } catch (_) {}

          if (db) {
            // Real-time synchronization with users/{uid}
            try {
              userDocUnsub = onSnapshot(
                doc(db, "users", currentUser.uid),
                (snap) => {
                  setUserData(snap.exists() ? (snap.data() as UserPlanData) : null);
                  setLoading(false);
                },
                (err) => {
                  console.warn("User doc listener error:", err);
                  setLoading(false);
                }
              );
            } catch (err) {
              console.warn("Could not attach user doc listener:", err);
              setLoading(false);
            }

            // Real-time synchronization with entitlements/{uid}
            try {
              entDocUnsub = onSnapshot(
                doc(db, "entitlements", currentUser.uid),
                (snap) => {
                  setEntitlement(snap.exists() ? (snap.data() as EntitlementData) : null);
                },
                (_) => {
                  setEntitlement(null);
                }
              );
            } catch (_) {
              setEntitlement(null);
            }
          } else {
            setLoading(false);
          }
        } else {
          setUserData(null);
          setClaims(null);
          setEntitlement(null);
          setLoading(false);
        }
      });
    });

    return () => {
      if (authUnsub) authUnsub();
      if (userDocUnsub) userDocUnsub();
      if (entDocUnsub) entDocUnsub();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const { auth } = await initFirebase();
      if (auth) {
        await firebaseSignOut(auth);
      }
      setUser(null);
      setUserData(null);
      setClaims(null);
      setEntitlement(null);
      window.location.href = "/login";
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      try {
        const tokenResult = await user.getIdTokenResult(true).catch(() => null);
        setClaims((tokenResult?.claims as EntitlementClaims) || null);
      } catch (_) {}
    }
  };

  const isPro = resolveIsPro({ claims, entitlement, userData });
  const isAdmin =
    claims?.admin === true ||
    claims?.role === "admin" ||
    (user?.emailVerified === true &&
      user?.email?.toLowerCase() === "premjains106@gmail.com");

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        isPro,
        isAdmin,
        loading,
        signOut: handleSignOut,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
