// Unified avatar & greeting — gmail pic everywhere (topbar + sidebar), no pravatar drift
import { auth } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "../firebase-config.js";

async function loadPlan(user){
  try{
    const snap = await getDoc(doc(db, "users", user.uid));
    if(snap.exists()){
      const plan = snap.data().plan;
      const planEl = document.getElementById("userPlan");
      const badgeEl = document.getElementById("planBadge");
      const label = (plan || "free").charAt(0).toUpperCase() + (plan || "free").slice(1) + " plan";
      if(planEl) planEl.textContent = label;
      if(badgeEl){
        if(plan === "pro"){ badgeEl.style.display = ""; }
        else { badgeEl.style.display = "none"; }
      }
    }
  }catch(e){
    console.warn("[avatar-sync] could not load plan:", e);
  }
}

function applyAvatar(user){
  const name = user?.displayName || user?.email?.split("@")[0] || "Student";
  const first = (user?.displayName || name).split(" ")[0] || "there";
  const topAv = document.getElementById("topbarAvatar");
  const greet = document.getElementById("greetingName");
  const sideAv = document.getElementById("userAvatar") || document.getElementById("sidebarAvatar");
  const sideName = document.getElementById("userName") || document.getElementById("sidebarName");
  const sidePlan = document.getElementById("userPlan");
  if(sideName) sideName.textContent = name;
  if(greet) greet.textContent = first;
  if(sideAv){
    if(user?.photoURL){
      sideAv.textContent = "";
      // avoid stacking multiple imgs on re-auth
      const existing = sideAv.querySelector("img");
      if(existing) existing.remove();
      const img = document.createElement("img");
      img.src = user.photoURL;
      img.alt = name;
      img.style.cssText = "width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;";
      img.onerror = () => { img.remove(); sideAv.textContent = name.charAt(0).toUpperCase(); };
      sideAv.appendChild(img);
      sideAv.style.overflow = "hidden";
    } else {
      // no photo: show initial, remove any prior img
      const existing = sideAv.querySelector("img");
      if(existing) existing.remove();
      sideAv.textContent = name.charAt(0).toUpperCase();
    }
  }
  if(topAv){
    if(user?.photoURL){
      topAv.src = user.photoURL;
      topAv.alt = name;
      topAv.style.background = "var(--bg-card)";
    } else {
      // fallback: hide or show initial in place of img — keep placeholder but not pravatar
      topAv.removeAttribute("src");
      topAv.alt = name;
      // if topAv is img, replace with div initial if no photo? Keep img hidden
      topAv.style.display = "none";
      // create fallback div if not exists
      let fb = document.getElementById("topbarAvatarFallback");
      if(!fb){
        fb = document.createElement("div");
        fb.id = "topbarAvatarFallback";
        fb.style.cssText = "width:32px;height:32px;border-radius:50%;background:var(--bg-card);border:1px solid var(--border);display:grid;place-items:center;font-size:13px;font-weight:700;color:var(--text-primary);";
        topAv.parentElement?.insertBefore(fb, topAv);
      }
      fb.textContent = name.charAt(0).toUpperCase();
      fb.style.display = "grid";
      return;
    }
    // ensure fallback hidden when photo exists
    const fb = document.getElementById("topbarAvatarFallback");
    if(fb) fb.style.display = "none";
    topAv.style.display = "";
  }
}

if(auth){
  onAuthStateChanged(auth, (user)=>{
    if(!user) return;
    // wait for DOM
    if(document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", ()=>{ applyAvatar(user); loadPlan(user); });
    } else {
      applyAvatar(user);
      loadPlan(user);
    }
    // also handle late DOM (topbar may be injected later)
    setTimeout(()=>{ applyAvatar(user); loadPlan(user); }, 400);
  });
}
// Also try immediate for already signed-in (firebase may have cached user)
try{
  const u = auth?.currentUser;
  if(u){ applyAvatar(u); loadPlan(u); }
}catch{}

// Fix any leftover pravatar URLs
document.addEventListener("DOMContentLoaded", ()=>{
  document.querySelectorAll('img[src*="pravatar"]').forEach(img=>{
    img.src = "";
    img.style.display = "none";
  });
});
