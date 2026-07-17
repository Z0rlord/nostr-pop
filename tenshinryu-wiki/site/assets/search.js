(function () {
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  if (!input || !results) return;

  const lang = window.WIKI_LANG || "en";
  let index = [];
  let loaded = false;

  function normalize(s) {
    return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  }

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

  /** Relevance-first scoring; section boost is a tiny tiebreaker only. */
  function score(item, q) {
    const terms = normalize(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return 0;

    const title = normalize(item.title);
    const text = normalize(item.text);
    let relevance = 0;
    let matched = false;

    for (const t of terms) {
      if (title.includes(t)) {
        relevance += 100;
        matched = true;
      }
      if (text.includes(t)) {
        relevance += 10;
        matched = true;
      }
    }

    if (!matched) return 0;
    return relevance + (item.boost || 0) * 0.01;
  }

  function sectionLabel(item) {
    return item.sectionLabel || item.section || "";
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
      const label = sectionLabel(item);
      a.innerHTML =
        (label
          ? '<span class="search-section">' + label + "</span>"
          : "") +
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
    }, 200);
  });

  document.addEventListener("click", function (e) {
    if (!results.contains(e.target) && e.target !== input) {
      results.classList.remove("open");
    }
  });
})();
