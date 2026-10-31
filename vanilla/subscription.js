import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { createLifecycle } from "./shared/lifecycle.js";
import { isProUserData } from "./shared/plan.js";
import { mountToast } from "./shared/toast.js";

const FREE_LIMITS = {
  chat: 20,
  analysis: 20,
  planner: 30,
};

export function mount(root, ctx) {
  if (!root) return undefined;

  const lifecycle = createLifecycle();
  const toast = mountToast(root, lifecycle);
  const uid = ctx.user?.uid;
  if (!uid) return () => lifecycle.dispose();

  const els = {
    usage: {
      chat: {
        used: root.querySelector("#chatUsed"),
        limit: root.querySelector("#chatLimit"),
        fraction: root.querySelector("#chatFraction"),
        unlimited: root.querySelector("#chatUnlimited"),
        bar: root.querySelector("#chatBar"),
        barWrap: root.querySelector("#chatBarWrap"),
        status: root.querySelector("#chatStatus"),
      },
      analysis: {
        used: root.querySelector("#analysisUsed"),
        limit: root.querySelector("#analysisLimit"),
        fraction: root.querySelector("#analysisFraction"),
        unlimited: root.querySelector("#analysisUnlimited"),
        bar: root.querySelector("#analysisBar"),
        barWrap: root.querySelector("#analysisBarWrap"),
        status: root.querySelector("#analysisStatus"),
      },
      planner: {
        used: root.querySelector("#plannerUsed"),
        limit: root.querySelector("#plannerLimit"),
        fraction: root.querySelector("#plannerFraction"),
        unlimited: root.querySelector("#plannerUnlimited"),
        bar: root.querySelector("#plannerBar"),
        barWrap: root.querySelector("#plannerBarWrap"),
        status: root.querySelector("#plannerStatus"),
      },
    },
    freePlanCard: root.querySelector("#freePlanCard"),
    freePlanBtn: root.querySelector("#freePlanBtn"),
    freePlanLink: root.querySelector("#freePlanLink"),
    proActiveBtn: root.querySelector("#proActiveBtn"),
    proRequestBlock: root.querySelector("#proRequestBlock"),
    requestBtn: root.querySelector("#requestProBtn"),
    contactOptions: root.querySelector("#contactOptions"),
    cfName: root.querySelector("#cfName"),
    cfEmail: root.querySelector("#cfEmail"),
    cfMsg: root.querySelector("#cfMsg"),
    submitRequest: root.querySelector("#submitProRequestBtn"),
    requestStatus: root.querySelector("#proRequestStatus"),
    mailLink: root.querySelector("#proMailLink"),
    faqButtons: root.querySelectorAll(".faq-q"),
  };

  const user = ctx.user;
  const accountEmail = user.email || "";
  const accountName = user.displayName || accountEmail.split("@")[0] || "";

  let isPro = Boolean(ctx.isPro);
  let proRequested = false;
  let requestBusy = false;

  hydrateTopbar(root, user);
  initFaq();
  initRequestFlow();
  loadSubscription();

  return () => lifecycle.dispose();

  function setText(node, value) {
    if (node) node.textContent = value == null ? "" : String(value);
  }

  async function loadSubscription() {
    let claimsPro = false;
    try {
      const tokenResult = await user.getIdTokenResult();
      const claims = tokenResult?.claims || {};
      claimsPro =
        claims.pro === true ||
        claims.admin === true ||
        claims.role === "admin";
    } catch {}

    let data = {};
    try {
      const snap = await getDoc(doc(ctx.db, "users", uid));
      if (snap.exists()) data = snap.data() || {};
    } catch (err) {
      console.warn("[subscription] could not read user plan", err);
    }

    isPro = claimsPro || isProUserData(data) || Boolean(ctx.isPro);

    let usage = {
      dailyChatCount: 0,
      dailyAnalysisCount: 0,
      plannerUsageMinutes: 0,
    };
    let usageUnavailable = false;

    try {
      const snap = await getDoc(doc(ctx.db, "usage", uid));
      if (snap.exists()) {
        const raw = snap.data() || {};
        const today = new Date().toISOString().slice(0, 10);
        if (!raw.date || raw.date === today) {
          usage = {
            dailyChatCount: Number(raw.dailyChatCount) || 0,
            dailyAnalysisCount: Number(raw.dailyAnalysisCount) || 0,
            plannerUsageMinutes: Number(raw.plannerUsageMinutes) || 0,
          };
        }
      }
    } catch (err) {
      console.warn("[subscription] could not read usage", err);
      usageUnavailable = true;
    }

    if (lifecycle.disposed) return;

    renderPlan();
    renderUsage(usage, usageUnavailable);
    prepareRequestForm();

    if (!isPro) {
      checkExistingRequest();
    }
  }

  function renderPlan() {
    els.freePlanCard?.classList.toggle("current-free", !isPro);
    if (els.freePlanBtn) els.freePlanBtn.hidden = isPro;
    if (els.freePlanLink) els.freePlanLink.hidden = !isPro;
    if (els.proActiveBtn) els.proActiveBtn.hidden = !isPro;
    if (els.proRequestBlock) els.proRequestBlock.hidden = isPro;
  }

  function renderUsage(usage, unavailable) {
    setUsageCard("chat", usage.dailyChatCount, "chats", unavailable);
    setUsageCard("analysis", usage.dailyAnalysisCount, "analyses", unavailable);
    setUsageCard(
      "planner",
      usage.plannerUsageMinutes,
      "min",
      unavailable,
      FREE_LIMITS.planner
    );
  }

  function setUsageCard(key, usedValue, unit, unavailable, limitOverride) {
    const parts = els.usage[key];
    if (!parts) return;

    const used = Math.max(0, Number(usedValue) || 0);
    const limit = limitOverride || FREE_LIMITS[key] || 0;

    if (parts.unlimited) parts.unlimited.hidden = !isPro;
    if (parts.fraction) parts.fraction.hidden = isPro;
    if (parts.barWrap) parts.barWrap.hidden = isPro;

    if (isPro) {
      setText(parts.status, "Unlimited");
      setStatusClass(parts.status, "ok");
      return;
    }

    setText(parts.limit, limit);

    if (unavailable) {
      setText(parts.used, "—");
      setText(parts.status, "Usage unavailable right now");
      setStatusClass(parts.status, "");
      if (parts.bar) parts.bar.style.width = "0%";
      parts.bar?.classList.remove("full");
      return;
    }

    setText(parts.used, used);
    const percent = Math.min(100, Math.round((used / limit) * 100));
    if (parts.bar) parts.bar.style.width = `${percent}%`;
    parts.bar?.classList.toggle("full", percent >= 100);

    if (used >= limit) {
      setText(parts.status, "Limit reached");
      setStatusClass(parts.status, "full");
    } else {
      setText(parts.status, `${limit - used} ${unit} remaining today`);
      setStatusClass(parts.status, percent >= 75 ? "warn" : "ok");
    }
  }

  function setStatusClass(node, className) {
    if (!node) return;
    node.classList.remove("ok", "warn", "full");
    if (className) node.classList.add(className);
  }

  function prepareRequestForm() {
    if (els.cfName) els.cfName.value = accountName;
    if (els.cfEmail) els.cfEmail.value = accountEmail;
    if (els.mailLink && accountEmail) {
      const subject = encodeURIComponent("Pro Access Request");
      const body = encodeURIComponent(
        `Hi, I'd like to request Learning Allied Pro access. My email is: ${accountEmail}`
      );
      els.mailLink.href = `mailto:hello@learningallied.com?subject=${subject}&body=${body}`;
    }
  }

  async function checkExistingRequest() {
    try {
      const snap = await getDoc(doc(ctx.db, "proRequests", uid));
      if (!snap.exists() || lifecycle.disposed) return;
      proRequested = true;
      markRequested();
    } catch (err) {
      console.warn("[subscription] could not read Pro request", err);
    }
  }

  function markRequested() {
    if (els.requestBtn) {
      els.requestBtn.textContent = "✓ Request submitted — choose contact method";
    }
    if (els.submitRequest) {
      els.submitRequest.disabled = true;
      els.submitRequest.textContent = "Request submitted";
    }
    if (els.requestStatus) {
      els.requestStatus.hidden = false;
      els.requestStatus.dataset.type = "success";
      els.requestStatus.textContent =
        "You've already requested Pro access. We'll reach out soon.";
    }
  }

  function initRequestFlow() {
    lifecycle.on(els.requestBtn, "click", () => {
      if (!els.contactOptions) return;
      const open = els.contactOptions.classList.toggle("show");
      els.requestBtn.setAttribute("aria-expanded", String(open));
    });

    lifecycle.on(els.submitRequest, "click", () => {
      submitProRequest();
    });
  }

  async function submitProRequest() {
    if (requestBusy || proRequested) return;

    const name = els.cfName?.value.trim() || "";
    const contactEmail = els.cfEmail?.value.trim() || "";
    const message = els.cfMsg?.value.trim() || "";

    if (!name || !contactEmail) {
      showRequestStatus("Please enter your name and email.", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      showRequestStatus("Please enter a valid email address.", "error");
      return;
    }

    requestBusy = true;
    if (els.submitRequest) {
      els.submitRequest.disabled = true;
      els.submitRequest.textContent = "Submitting…";
    }
    showRequestStatus("Submitting your request…", "");

    try {
      await setDoc(doc(ctx.db, "proRequests", uid), {
        uid,
        email: accountEmail || contactEmail,
        contactEmail,
        contactName: name,
        message,
        requestedAt: serverTimestamp(),
        status: "pending",
      });
      if (lifecycle.disposed) return;

      proRequested = true;
      if (els.cfMsg) els.cfMsg.value = "";
      markRequested();
      toast.show("✓ Request submitted! We'll reach out soon.", "success");
    } catch (err) {
      if (lifecycle.disposed) return;
      console.warn("[subscription] Pro request failed", err);
      showRequestStatus(
        "Could not submit your request. Please try again.",
        "error"
      );
      if (els.submitRequest) {
        els.submitRequest.disabled = false;
        els.submitRequest.textContent = "Submit Request";
      }
    } finally {
      requestBusy = false;
    }
  }

  function showRequestStatus(text, type) {
    if (!els.requestStatus) return;
    els.requestStatus.hidden = false;
    els.requestStatus.dataset.type = type;
    els.requestStatus.textContent = text;
  }

  function initFaq() {
    for (const button of els.faqButtons) {
      lifecycle.on(button, "click", () => {
        const item = button.closest(".faq-item");
        if (!item) return;
        const open = item.classList.toggle("open");
        button.setAttribute("aria-expanded", String(open));
      });
    }
  }
}

function hydrateTopbar(root, user) {
  const displayName =
    user.displayName || user.email?.split("@")[0] || "Student";
  const firstName = (user.displayName || displayName).split(" ")[0];

  const greeting = root.querySelector("#greetingName");
  if (greeting) greeting.textContent = firstName;

  const avatar = root.querySelector("#topbarAvatar");
  if (avatar) {
    avatar.alt = displayName;
    if (user.photoURL) avatar.src = user.photoURL;
  }
}
