"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, Firestore } from "firebase/firestore";
import { initFirebase } from "../lib/firebase";
import { isProUser, UserPlanData } from "../lib/subscription";

interface AuthContextType {
  user: User | null;
  userData: UserPlanData | null;
  isPro: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  isPro: false,
  loading: true,
  signOut: async () => {},
  refreshUserData: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserPlanData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (currentUser: User, firestoreDb?: Firestore) => {
    try {
      const { db } = await initFirebase();
      const activeDb = firestoreDb || db;
      if (!activeDb) return;
      const snap = await getDoc(doc(activeDb, "users", currentUser.uid));
      if (snap.exists()) {
        const data = snap.data() as UserPlanData;
        setUserData(data);
      }
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
      window.location.href = "/login";
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  const isPro = isProUser(userData);

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        isPro,
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
