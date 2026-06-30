(function () {
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  if (!input || !results) return;

  const lang = window.WIKI_LANG || "en";
  let index = [];
  let loaded = false;

  async function loadIndex() {
    if (loaded) return;
    try {
      const res = await fetch("/assets/search-index.json");
      index = await res.json();
      loaded = true;
    } catch (_) {
      index = [];
    }
  }

  function score(item, q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    let s = item.boost || 0;
    const title = item.title.toLowerCase();
    const text = item.text.toLowerCase();
    for (const t of terms) {
      if (title.includes(t)) s += 10;
      if (text.includes(t)) s += 1;
    }
    return s;
  }

  function render(items) {
    results.innerHTML = "";
    if (!items.length) {
      results.innerHTML =
        '<div class="hint" style="padding:0.75rem">' +
        (lang === "ja" ? "該当なし" : "No results") +
        "</div>";
      results.classList.add("open");
      return;
    }
    for (const item of items.slice(0, 12)) {
      const a = document.createElement("a");
      a.href = item.url;
      a.innerHTML =
        "<strong>" +
        item.title +
        '</strong><span class="hint"> ' +
        item.text.slice(0, 60) +
        "…</span>";
      results.appendChild(a);
    }
    results.classList.add("open");
  }

  input.addEventListener("focus", loadIndex);

  let timer;
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(async function () {
      await loadIndex();
      const q = input.value.trim();
      if (q.length < 2) {
        results.classList.remove("open");
        return;
      }
      const hits = index
        .filter(function (item) {
          return item.lang === lang && item.section !== "sources";
        })
        .map(function (item) {
          return { item: item, s: score(item, q) };
        })
        .filter(function (x) {
          return x.s > 0;
        })
        .sort(function (a, b) {
          return b.s - a.s;
        })
        .map(function (x) {
          return x.item;
        });
      render(hits);
    }, 120);
  });

  document.addEventListener("click", function (e) {
    if (!results.contains(e.target) && e.target !== input) {
      results.classList.remove("open");
    }
  });
})();
