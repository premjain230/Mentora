/**
 * Syllabus Upload — DRY module extracted from 6 duplicated inline scripts
 * Handles: file validation, snippet extraction, Firestore write, learning profile mirror, learning event
 * Usage: import { initSyllabusUpload } from "./js/syllabus.js"; initSyllabusUpload({auth, db});
 */

export function initSyllabusUpload({ auth, db, emitLearningEvent } = {}) {
  const btn = document.getElementById("syllabusUploadBtn");
  const input = document.getElementById("syllabusFile");
  const prog = document.getElementById("syllabusProgress");
  const label = document.getElementById("syllabusLabel");
  const sub = document.getElementById("syllabusSub");
  const card = document.getElementById("syllabusCard");
  if (!btn || !input) return; // page without syllabus card

  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;border:1px solid var(--border, #2a2d3a);padding:8px 14px;border-radius:999px;font-size:12px;z-index:9999;";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  // Allow clicking card to trigger upload
  if (card) {
    card.addEventListener("click", (e) => {
      if (e.target === btn || e.target === input) return;
      input.click();
    });
  }
  btn.addEventListener("click", () => input.click());

  input.addEventListener("change", async () => {
    const f = input.files?.[0];
    if (!f) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(f.type) && !f.name.match(/\.(pdf|jpe?g|png)$/i)) {
      toast("Only JPG, PNG, PDF");
      input.value = "";
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast("Max 8MB");
      input.value = "";
      return;
    }
    const user = auth?.currentUser;
    if (!user) {
      toast("Please sign in to upload your syllabus");
      return;
    }
    try { await user.getIdToken(true); } catch (e) { console.warn("Token refresh failed", e); }
    if (prog) { prog.style.display = "block"; prog.textContent = `Uploading ${f.name}…`; }
    btn.disabled = true;
    btn.textContent = "…";
    try {
      // Light parse: read first 8k as text snippet for personalisation
      let snippet = "";
      try {
        if (f.type === "application/pdf") {
          snippet = `[PDF ${f.name} ${Math.round(f.size / 1024)}KB] — will personalise after server parse`;
        } else {
          snippet = await new Promise(res => {
            const r = new FileReader();
            r.onload = () => res(String(r.result).slice(0, 3000));
            r.onerror = () => res("");
            r.readAsText(f.slice(0, 8192));
          });
          if (!snippet) snippet = `[Image ${f.name}]`;
        }
      } catch { snippet = ""; }

      const { collection, doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      // Lazy import emitLearningEvent if not provided
      let emit = emitLearningEvent;
      if (!emit) {
        try {
          const mod = await import("./learning/evidence.js");
          emit = mod.emitLearningEvent;
        } catch {}
      }
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const ref = doc(collection(db, "users", user.uid, "syllabus"), id);
      await setDoc(ref, {
        fileName: f.name,
        fileType: f.type || "unknown",
        fileSize: f.size,
        snippet: String(snippet).slice(0, 4000),
        uploadedAt: serverTimestamp(),
        status: "ready"
      });
      // Mirror to learning profile for personalisation
      try {
        const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const profRef = doc(db, "users", user.uid, "learning", "profile");
        const s = await getDoc(profRef);
        const cur = s.exists() ? s.data() : {};
        await setDoc(profRef, {
          syllabus: { fileName: f.name, uploadedAt: new Date().toISOString(), status: "ready" },
          onboardingComplete: cur.onboardingComplete ?? false,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch {}
      try {
        if (emit) await emit(db, user.uid, "syllabus_uploaded", { source: "syllabus", subject: "syllabus", topic: f.name, payload: { fileName: f.name, fileType: f.type, fileSize: f.size } });
      } catch {}
      if (label) label.textContent = f.name.slice(0, 28);
      if (sub) sub.textContent = "Personalised ✓";
      if (prog) prog.textContent = "Saved — personalising your plan";
      toast("Syllabus saved — personalising ✓");
      setTimeout(() => { if (prog) prog.style.display = "none"; }, 2500);
    } catch (e) {
      console.error("Syllabus upload error:", e);
      let msg = e.message || "Unknown error";
      if (msg.includes("Missing or insufficient permissions") || msg.includes("permission")) {
        msg = "We couldn't upload your syllabus. Please check your connection and try signing in again.";
        try { await auth.currentUser?.getIdToken(true); } catch {}
      } else if (msg.includes("network") || msg.includes("offline")) {
        msg = "No internet connection. Please check your connection and try again.";
      }
      if (prog) prog.textContent = msg;
      toast(msg);
    } finally {
      btn.disabled = false;
      btn.textContent = "Upload";
      input.value = "";
    }
  });

  // Show existing syllabus name on load
  (auth?.onAuthStateChanged || (() => {}))?.call?.(auth, async (u) => {
    if (!u) return;
    try {
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap = await getDocs(collection(db, "users", u.uid, "syllabus"));
      if (!snap.empty) {
        const d = snap.docs.sort((a, b) => (b.data().uploadedAt?.toMillis?.() || 0) - (a.data().uploadedAt?.toMillis?.() || 0))[0]?.data();
        if (d?.fileName && label) {
          label.textContent = d.fileName.slice(0, 28);
          if (sub) sub.textContent = "Personalising • tap to update";
        }
      }
    } catch {}
  });
}
