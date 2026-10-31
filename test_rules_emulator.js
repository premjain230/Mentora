/**
 * Firestore security-rule regression tests (real emulator, no production data).
 *
 * Run with:
 *   npm run test:rules
 *
 * Requires the Firebase CLI (firebase-tools) and Java on PATH.
 */

const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} = require("firebase/firestore");

const PROJECT_ID = "demo-learning-allied";
const HOST = "127.0.0.1";
const PORT = 8080;

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: HOST,
      port: PORT,
      rules: fs.readFileSync(path.join(__dirname, "firestore.rules"), "utf8"),
    },
  });

  try {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "users/alice"), {
        uid: "alice",
        displayName: "Alice",
        email: "alice@example.com",
        plan: "pro",
        role: "student",
      });
      await setDoc(doc(db, "users/bob"), {
        uid: "bob",
        displayName: "Bob",
        email: "bob@example.com",
        plan: "free",
      });
      await setDoc(doc(db, "entitlements/alice"), {
        plan: "pro",
        subscriptionExpiresAt: new Date(Date.now() + 86400000),
      });
      await setDoc(doc(db, "usage/alice"), {
        date: "2026-10-31",
        dailyChatCount: 3,
        dailyAnalysisCount: 1,
        plannerUsageMinutes: 10,
      });
      await setDoc(doc(db, "proRequests/alice"), {
        uid: "alice",
        email: "alice@example.com",
        requestedAt: new Date(),
        status: "pending",
      });
    });

    const alice = testEnv
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore();
    const bob = testEnv
      .authenticatedContext("bob", { email: "bob@example.com" })
      .firestore();
    const carol = testEnv
      .authenticatedContext("carol", { email: "carol@example.com" })
      .firestore();
    const anon = testEnv.unauthenticatedContext().firestore();

    console.log("\n[users] creation hardening");

    await test("new user can create own profile with free plan + student role", async () => {
      await assertSucceeds(
        setDoc(doc(carol, "users/carol"), {
          uid: "carol",
          displayName: "Carol",
          email: "carol@example.com",
          role: "JEE Aspirant",
          goal: "Crack JEE",
          exam: "JEE",
          plan: "free",
          createdAt: serverTimestamp(),
        })
      );
    });

    await test("SECURITY: cannot self-create with plan: pro", async () => {
      await assertFails(
        setDoc(doc(carol, "users/carol-pro"), {
          uid: "carol",
          displayName: "Carol",
          plan: "pro",
        })
      );
    });

    await test("SECURITY: cannot self-create with isPro: true", async () => {
      await assertFails(
        setDoc(doc(carol, "users/carol-ispro"), {
          uid: "carol",
          displayName: "Carol",
          isPro: true,
        })
      );
    });

    await test("SECURITY: cannot self-create with role: admin", async () => {
      await assertFails(
        setDoc(doc(carol, "users/carol-admin"), {
          uid: "carol",
          displayName: "Carol",
          role: "admin",
        })
      );
    });

    await test("SECURITY: cannot self-create with referralRewards", async () => {
      await assertFails(
        setDoc(doc(carol, "users/carol-referral"), {
          uid: "carol",
          displayName: "Carol",
          referralRewards: { bonusChats: 1000, proDays: 3650 },
        })
      );
    });

    await test("cannot create a profile for another uid", async () => {
      await assertFails(
        setDoc(doc(carol, "users/victim"), {
          uid: "victim",
          displayName: "Victim",
        })
      );
    });

    await test("cannot create with an email that differs from the token", async () => {
      await assertFails(
        setDoc(doc(carol, "users/carol-email"), {
          uid: "carol",
          displayName: "Carol",
          email: "attacker@example.com",
        })
      );
    });

    console.log("\n[users] update hardening");

    await test("owner can update displayName / profile fields", async () => {
      await assertSucceeds(
        updateDoc(doc(alice, "users/alice"), { displayName: "Alice Updated", exam: "NEET" })
      );
    });

    await test("SECURITY: owner cannot set plan: pro", async () => {
      await assertFails(updateDoc(doc(bob, "users/bob"), { plan: "pro" }));
    });

    await test("SECURITY: owner cannot set isPro / subscription status", async () => {
      await assertFails(updateDoc(doc(bob, "users/bob"), { isPro: true }));
      await assertFails(updateDoc(doc(bob, "users/bob"), { subscriptionStatus: "active" }));
      await assertFails(
        updateDoc(doc(bob, "users/bob"), { subscriptionExpiresAt: "2099-01-01T00:00:00Z" })
      );
    });

    await test("SECURITY: owner cannot grant themselves admin role", async () => {
      await assertFails(updateDoc(doc(bob, "users/bob"), { role: "admin" }));
      await assertFails(updateDoc(doc(bob, "users/bob"), { isAdmin: true }));
    });

    await test("SECURITY: owner cannot edit referralRewards", async () => {
      await assertFails(
        updateDoc(doc(bob, "users/bob"), { referralRewards: { bonusChats: 500 } })
      );
    });

    await test("owner cannot change uid or email", async () => {
      await assertFails(updateDoc(doc(bob, "users/bob"), { uid: "alice" }));
      await assertFails(updateDoc(doc(bob, "users/bob"), { email: "other@example.com" }));
    });

    await test("non-owner cannot read or write another profile", async () => {
      await assertFails(getDoc(doc(bob, "users/alice")));
      await assertFails(updateDoc(doc(bob, "users/alice"), { displayName: "Hacked" }));
      await assertFails(getDoc(doc(anon, "users/alice")));
    });

    await test("LEGIT: profile personality/letter merge still works", async () => {
      await assertSucceeds(
        setDoc(
          doc(bob, "users/bob"),
          {
            uid: "bob",
            email: "bob@example.com",
            displayName: "Bob",
            personality: "explorer",
            futureMeLetter: "Dear future me",
            futureMeLetterDate: "2026-10-31",
            topics: ["Physics"],
            updatedAt: Date.now(),
          },
          { merge: true }
        )
      );
    });

    await test("LEGIT: Google sign-in merge on an existing Pro profile is allowed", async () => {
      await assertSucceeds(
        setDoc(
          doc(alice, "users/alice"),
          {
            uid: "alice",
            displayName: "Alice Google",
            email: "alice@example.com",
            updatedAt: Date.now(),
          },
          { merge: true }
        )
      );
    });

    await test("LEGIT: planner-db saveExamProfile merge is allowed", async () => {
      await assertSucceeds(
        setDoc(
          doc(bob, "users/bob"),
          {
            uid: "bob",
            name: "Bob",
            studentName: "Bob",
            examType: "JEE",
            targetScore: "99 percentile",
            subjects: ["Physics", "Maths"],
            dailyHours: 4,
            startDate: "2026-10-31",
            examDate: "2027-04-01",
            weakTopics: ["Optics"],
            onboardingComplete: true,
            updatedAt: Date.now(),
          },
          { merge: true }
        )
      );
    });

    console.log("\n[entitlements] server-owned");

    await test("owner can read their entitlement record", async () => {
      await assertSucceeds(getDoc(doc(alice, "entitlements/alice")));
    });

    await test("SECURITY: clients cannot create or modify entitlements", async () => {
      await assertFails(
        setDoc(doc(bob, "entitlements/bob"), { plan: "pro" })
      );
      await assertFails(
        updateDoc(doc(bob, "entitlements/alice"), { plan: "pro" })
      );
      await assertFails(
        setDoc(doc(alice, "entitlements/alice"), { plan: "pro" })
      );
    });

    await test("non-owner cannot read another entitlement record", async () => {
      await assertFails(getDoc(doc(bob, "entitlements/alice")));
    });

    console.log("\n[entitlementAudit] server-only");

    await test("SECURITY: clients cannot read or write entitlement audit logs", async () => {
      await assertFails(
        setDoc(doc(alice, "entitlementAudit/audit1"), {
          action: "grant",
          targetUid: "alice",
        })
      );
      await assertFails(getDoc(doc(alice, "entitlementAudit/audit1")));
      await assertFails(getDoc(doc(bob, "entitlementAudit/audit1")));
    });

    console.log("\n[usage] read-only counters");

    await test("owner can read usage", async () => {
      await assertSucceeds(getDoc(doc(alice, "usage/alice")));
    });

    await test("SECURITY: clients cannot reset usage counters", async () => {
      await assertFails(
        updateDoc(doc(alice, "usage/alice"), { dailyChatCount: 0 })
      );
      await assertFails(
        setDoc(doc(bob, "usage/bob"), { date: "2026-10-31", dailyChatCount: 0 })
      );
      await assertFails(deleteDoc(doc(alice, "usage/alice")));
    });

    console.log("\n[proRequests] immutable intent");

    await test("valid pending request is accepted", async () => {
      await assertSucceeds(
        setDoc(doc(carol, "proRequests/carol"), {
          uid: "carol",
          email: "carol@example.com",
          contactEmail: "carol@example.com",
          contactName: "Carol",
          message: "Please upgrade me",
          requestedAt: serverTimestamp(),
          status: "pending",
        })
      );
    });

    await test("legacy payload (uid/email/status/requestedAt) is accepted", async () => {
      const dave = testEnv
        .authenticatedContext("dave", { email: "dave@example.com" })
        .firestore();
      await assertSucceeds(
        setDoc(doc(dave, "proRequests/dave"), {
          uid: "dave",
          email: "dave@example.com",
          requestedAt: serverTimestamp(),
          status: "pending",
        })
      );
    });

    await test("SECURITY: cannot submit an already-approved request", async () => {
      await assertFails(
        setDoc(doc(carol, "proRequests/carol-approved"), {
          uid: "carol",
          email: "carol@example.com",
          requestedAt: serverTimestamp(),
          status: "approved",
        })
      );
    });

    await test("SECURITY: cannot smuggle entitlement fields into the request", async () => {
      await assertFails(
        setDoc(doc(carol, "proRequests/carol-extra"), {
          uid: "carol",
          email: "carol@example.com",
          requestedAt: serverTimestamp(),
          status: "pending",
          plan: "pro",
        })
      );
    });

    await test("SECURITY: request email must match the token", async () => {
      await assertFails(
        setDoc(doc(carol, "proRequests/carol-spoof"), {
          uid: "carol",
          email: "admin@example.com",
          requestedAt: serverTimestamp(),
          status: "pending",
        })
      );
    });

    await test("SECURITY: requests are immutable", async () => {
      await assertFails(
        updateDoc(doc(alice, "proRequests/alice"), { status: "approved" })
      );
      await assertFails(deleteDoc(doc(alice, "proRequests/alice")));
    });

    console.log("\n[cross-user isolation] spot checks");

    await test("tasks: owners only, cannot claim another userId", async () => {
      await assertSucceeds(
        setDoc(doc(alice, "tasks/t1"), {
          userId: "alice",
          planId: "p1",
          status: "pending",
          durationMinutes: 30,
          subject: "Physics",
          topic: "Kinematics",
        })
      );
      await assertFails(getDoc(doc(bob, "tasks/t1")));
      await assertFails(
        setDoc(doc(bob, "tasks/t2"), {
          userId: "alice",
          planId: "p1",
          status: "pending",
          durationMinutes: 30,
          subject: "Physics",
          topic: "Kinematics",
        })
      );
    });

    await test("SECURITY: arenaProgress is read-only for clients", async () => {
      await assertFails(
        setDoc(doc(alice, "users/alice/arenaProgress/physics"), {
          chapter: 1,
          completed: true,
        })
      );
      await assertFails(
        setDoc(doc(alice, "arenaProgress/physics"), { completed: true })
      );
    });

    await test("SECURITY: arenaSessions (answer keys) are server-only", async () => {
      await assertFails(
        setDoc(doc(alice, "users/alice/arenaSessions/s1"), {
          uid: "alice",
          status: "active",
          questions: [{ q: "2+2?", options: ["3", "4"], answer: "B" }],
          answers: [],
        })
      );
      await assertFails(getDoc(doc(alice, "users/alice/arenaSessions/s1")));
      await assertFails(
        updateDoc(doc(alice, "users/alice/arenaSessions/s1"), {
          answers: [{ index: 0, choice: 1 }],
        })
      );
    });
  } finally {
    await testEnv.cleanup();
  }

  console.log(`\nRules tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Rules test harness failed:", err);
  process.exitCode = 1;
});
