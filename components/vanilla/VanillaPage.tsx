"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { initFirebase } from "@/lib/firebase";

type PageKey =
  | "home"
  | "chat"
  | "chat-history"
  | "review"
  | "study-session"
  | "quiz"
  | "planner"
  | "profile"
  | "settings"
  | "subscription"
  | "arena";

type VanillaContext = {
  user: any;
  userData: any;
  isPro: boolean;
  auth: any;
  db: any;
  navigate: (href: string) => void;
  api: (path: string, init?: RequestInit) => Promise<Response>;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  showUpgrade: (detail?: Record<string, unknown>) => void;
  getState: () => { user: any; userData: any; isPro: boolean };
};

type VanillaModule = {
  mount: (root: HTMLElement, ctx: VanillaContext) => (() => void) | void;
};

const loaders: Record<PageKey, () => Promise<VanillaModule>> = {
  home: () => import("@/vanilla/home"),
  chat: () => import("@/vanilla/chat"),
  "chat-history": () => import("@/vanilla/chat-history"),
  review: () => import("@/vanilla/review"),
  "study-session": () => import("@/vanilla/study-session"),
  quiz: () => import("@/vanilla/quiz"),
  planner: () => import("@/vanilla/planner"),
  profile: () => import("@/vanilla/profile"),
  settings: () => import("@/vanilla/settings"),
  subscription: () => import("@/vanilla/subscription"),
  arena: () => import("@/vanilla/arena"),
};

export function VanillaPage({
  page,
  children,
}: {
  page: PageKey;
  children: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, userData, isPro, signOut, refreshUserData } = useAuth();
  const userRef = useRef(user);
  const userDataRef = useRef(userData);
  const isProRef = useRef(isPro);
  const signOutRef = useRef(signOut);
  const refreshUserDataRef = useRef(refreshUserData);
  const authRef = useRef<any>(null);
  userRef.current = user;
  userDataRef.current = userData;
  isProRef.current = isPro;
  signOutRef.current = signOut;
  refreshUserDataRef.current = refreshUserData;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !userRef.current) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { auth, db } = await initFirebase();
      const mod = await loaders[page]();
      if (disposed || !hostRef.current || !userRef.current) return;

      authRef.current = auth;
      const authFetch = async (path: string, init: RequestInit = {}) => {
        const current = authRef.current?.currentUser;
        const token = current ? await current.getIdToken() : null;
        const headers = new Headers(init.headers || {});
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(path, { ...init, headers, credentials: "same-origin" });
      };

      const ctx: VanillaContext = {
        user: userRef.current,
        userData: userDataRef.current,
        isPro: isProRef.current,
        auth,
        db,
        navigate: (href) => router.push(href),
        api: (path, init) => fetch(path, { ...init, credentials: "same-origin" }),
        authFetch,
        signOut: () => signOutRef.current(),
        refreshUserData: () => refreshUserDataRef.current(),
        showUpgrade: (detail = {}) => {
          window.dispatchEvent(new CustomEvent("show-upgrade-modal", { detail }));
        },
        getState: () => ({
          user: userRef.current,
          userData: userDataRef.current,
          isPro: isProRef.current,
        }),
      };

      const result = mod.mount(hostRef.current, ctx);
      cleanup = typeof result === "function" ? result : undefined;
    })().catch((err) => {
      console.error(`[vanilla:${page}] mount failed`, err);
    });

    return () => {
      disposed = true;
      try {
        cleanup?.();
      } catch (err) {
        console.error(`[vanilla:${page}] cleanup failed`, err);
      }
      cleanup = undefined;
      authRef.current = null;
    };
  }, [page, router]);

  return (
    <div ref={hostRef} className="vanilla-page" data-vanilla-page={page}>
      {children}
    </div>
  );
}
