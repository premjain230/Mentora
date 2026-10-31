"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { initFirebase } from "@/lib/firebase";

type PageKey = "home";

type VanillaContext = {
  user: any;
  isPro: boolean;
  auth: any;
  db: any;
  navigate: (href: string) => void;
  api: (path: string, init?: RequestInit) => Promise<Response>;
};

type VanillaModule = {
  mount: (root: HTMLElement, ctx: VanillaContext) => (() => void) | void;
};

const loaders: Record<PageKey, () => Promise<VanillaModule>> = {
  home: () => import("@/vanilla/home"),
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
  const { user, isPro } = useAuth();
  const userRef = useRef(user);
  const isProRef = useRef(isPro);
  userRef.current = user;
  isProRef.current = isPro;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !userRef.current) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { auth, db } = await initFirebase();
      const mod = await loaders[page]();
      if (disposed || !hostRef.current || !userRef.current) return;

      const ctx: VanillaContext = {
        user: userRef.current,
        isPro: isProRef.current,
        auth,
        db,
        navigate: (href) => router.push(href),
        api: (path, init) => fetch(path, { ...init, credentials: "same-origin" }),
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
    };
  }, [page, router]);

  return (
    <div ref={hostRef} className="vanilla-page" data-vanilla-page={page}>
      {children}
    </div>
  );
}
