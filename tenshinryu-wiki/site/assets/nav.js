(function () {
  const toggle = document.querySelector(".nav-toggle");
  const panel = document.getElementById("site-nav-panel");
  if (toggle && panel) {
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      const open = panel.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!panel.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
        panel.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.querySelectorAll(".lang-menu, .nav-dropdown").forEach(function (menu) {
    menu.addEventListener("toggle", function () {
      if (!menu.open) return;
      document.querySelectorAll(".lang-menu, .nav-dropdown").forEach(function (other) {
        if (other !== menu) other.removeAttribute("open");
      });
    });
  });

  const article = document.querySelector("article.page-content");
  const tocNav = document.getElementById("page-toc");
  if (!article || !tocNav) return;

  const headings = article.querySelectorAll("h2, h3");
  if (headings.length < 3) {
    tocNav.closest(".page-sidebar")?.remove();
    return;
  }

  const list = document.createElement("ul");
  headings.forEach(function (h, i) {
    if (!h.id) {
      h.id = "section-" + i;
    }
    const li = document.createElement("li");
    li.className = h.tagName === "H3" ? "toc-h3" : "toc-h2";
    const a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    list.appendChild(li);
  });
  tocNav.appendChild(list);
})();
