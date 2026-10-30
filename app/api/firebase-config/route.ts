import { NextRequest, NextResponse } from "next/server";

/**
 * Public Firebase Web SDK configuration.
 *
 * Firebase web config values (apiKey, appId, senderId) are not secrets — they
 * identify the project to Google's identity service. They are still served from
 * the server so the values are not committed to source control.
 *
 * This handler is intentionally self-contained. It used to delegate to the
 * legacy CommonJS function in `/api/firebase-config.js`, which meant Vercel
 * built two functions for the same URL (`/api/firebase-config`). Whichever
 * build artefact won the route table was unpredictable and production ended
 * up serving a POST-only handler, producing `405 Method Not Allowed` for the
 * browser's GET request. Keeping the endpoint in one place removes that
 * collision for good.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = new Set([
  "https://www.learningallied.world",
  "https://learningallied.world",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
]);

const REQUIRED_KEYS = ["apiKey", "authDomain", "projectId"] as const;

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
};

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://www.learningallied.world";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Read either the full JSON env var or the individual FIREBASE_* variables. */
function readFirebaseConfig(): FirebaseWebConfig | null {
  const raw = process.env.FIREBASE_CONFIG;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const fromJson = {
        apiKey: String(parsed.apiKey ?? ""),
        authDomain: String(parsed.authDomain ?? ""),
        projectId: String(parsed.projectId ?? ""),
        storageBucket: String(parsed.storageBucket ?? ""),
        messagingSenderId: String(parsed.messagingSenderId ?? ""),
        appId: String(parsed.appId ?? ""),
        measurementId: String(parsed.measurementId ?? ""),
      };
      if (REQUIRED_KEYS.every((key) => fromJson[key])) return fromJson;
      console.error(
        "[firebase-config] FIREBASE_CONFIG is missing required keys:",
        REQUIRED_KEYS.filter((key) => !fromJson[key]).join(", ")
      );
    } catch (error) {
      console.error(
        "[firebase-config] FIREBASE_CONFIG contains invalid JSON:",
        error instanceof Error ? error.message : error
      );
    }
  }

  const config: FirebaseWebConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain:
      process.env.FIREBASE_AUTH_DOMAIN || "mentora-c6dca.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "mentora-c6dca",
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      "mentora-c6dca.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.FIREBASE_APP_ID || "",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "",
  };

  if (REQUIRED_KEYS.every((key) => config[key])) return config;

  console.error(
    "[firebase-config] Firebase web configuration is incomplete. Missing:",
    REQUIRED_KEYS.filter((key) => !config[key])
      .map((key) => `FIREBASE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`)
      .join(", ")
  );
  return null;
}

export async function GET(req: NextRequest) {
  const config = readFirebaseConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Firebase configuration is unavailable." },
      {
        status: 500,
        headers: {
          ...corsHeaders(req),
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  return NextResponse.json(config, {
    status: 200,
    headers: {
      ...corsHeaders(req),
      // Public values, but never cache them across deployments or regions.
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}
