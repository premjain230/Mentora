"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, Firestore } from "firebase/firestore";
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

  const fetchUserData = async (
    currentUser: User,
    firestoreDb?: Firestore,
    forceRefreshToken = false
  ) => {
    try {
      const { db } = await initFirebase();
      const activeDb = firestoreDb || db;
      if (!activeDb) return;
      const [snap, entitlementSnap, tokenResult] = await Promise.all([
        getDoc(doc(activeDb, "users", currentUser.uid)),
        getDoc(doc(activeDb, "entitlements", currentUser.uid)),
        currentUser
          .getIdTokenResult(forceRefreshToken)
          .catch(() => null),
      ]);
      setUserData(snap.exists() ? (snap.data() as UserPlanData) : null);
      setEntitlement(
        entitlementSnap.exists() ? (entitlementSnap.data() as EntitlementData) : null
      );
      setClaims((tokenResult?.claims as EntitlementClaims) || null);
    } catch (e) {
      console.warn("Could not fetch user profile:", e);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    initFirebase().then(({ auth, db }) => {
      if (!auth) {
        setLoading(false);
        return;
      }

      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          await fetchUserData(currentUser, db || undefined);
        } else {
          setUserData(null);
          setClaims(null);
          setEntitlement(null);
        }
        setLoading(false);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
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
      await fetchUserData(user, undefined, true);
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
