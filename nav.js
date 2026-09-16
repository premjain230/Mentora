/* Aquila AI — shared mobile navigation behavior.
   Wire-up for .mnav-btn / .mnav-overlay / .mnav-panel markup. Also handles
   <button class="mnav-link" data-hash="..."> used by the admin dashboard. */
(function () {
  var btn = document.getElementById("mnavBtn");
  var panel = document.getElementById("mnavPanel");
  if (!btn || !panel) return;
  var overlay = document.getElementById("mnavOverlay");

  function open() {
    panel.classList.add("open");
    if (overlay) overlay.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function close() {
    panel.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  btn.addEventListener("click", open);
  if (overlay) overlay.addEventListener("click", close);

  var closeBtn = document.getElementById("mnavClose");
  if (closeBtn) closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });

  panel.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", close);
  });
  panel.querySelectorAll("button.mnav-link").forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.dataset.hash) location.hash = b.dataset.hash;
      close();
    });
  });
})();