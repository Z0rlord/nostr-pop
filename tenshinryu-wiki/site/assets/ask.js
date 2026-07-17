(function () {
  const form = document.getElementById("ask-form");
  const input = document.getElementById("ask-input");
  const result = document.getElementById("ask-result");
  const submitBtn = document.getElementById("ask-submit");
  if (!form || !input || !result) return;

  const lang = window.WIKI_LANG || "en";
  const strings = window.WIKI_ASK_STRINGS || {};
  const loadingText = strings.loading || "Thinking…";
  const errorGeneric = strings.error || "Could not get an answer. Try search instead.";
  const errorRate = strings.errorRate || "Too many questions — please wait and try again.";

  function setLoading(on) {
    if (submitBtn) submitBtn.disabled = on;
    input.disabled = on;
  }

  function renderAnswer(data) {
    result.innerHTML = "";
    result.classList.add("open");

    const answer = document.createElement("div");
    answer.className = "ask-answer";
    answer.textContent = data.answer || "";
    result.appendChild(answer);

    if (data.citations && data.citations.length) {
      const citeHeading = document.createElement("p");
      citeHeading.className = "ask-cite-heading";
      citeHeading.textContent = strings.sources || "Sources";
      result.appendChild(citeHeading);

      const list = document.createElement("ul");
      list.className = "ask-citations";
      for (const c of data.citations) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = c.url;
        a.textContent = c.title;
        li.appendChild(a);
        list.appendChild(li);
      }
      result.appendChild(list);
    }

    if (data.disclaimer) {
      const disc = document.createElement("p");
      disc.className = "ask-disclaimer";
      disc.textContent = data.disclaimer;
      result.appendChild(disc);
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const question = input.value.trim();
    if (question.length < 3) return;

    setLoading(true);
    result.innerHTML =
      '<p class="ask-loading">' + loadingText + "</p>";
    result.classList.add("open");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question, lang: lang }),
      });
      const data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        const msg =
          res.status === 429
            ? errorRate
            : (typeof data.detail === "string" ? data.detail : errorGeneric);
        result.innerHTML = '<p class="ask-error">' + msg + "</p>";
        return;
      }
      renderAnswer(data);
    } catch (_) {
      result.innerHTML = '<p class="ask-error">' + errorGeneric + "</p>";
    } finally {
      setLoading(false);
    }
  });
})();
