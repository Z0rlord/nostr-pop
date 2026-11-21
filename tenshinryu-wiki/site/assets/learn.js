/* Tenshinryu Learn — client-side track progress + comprehension checks.
   Progress lives in localStorage on this device only. Nothing is sent anywhere. */
(function () {
  "use strict";

  function key(track) { return "tw-learn:" + track; }
  function load(track) {
    try {
      var d = JSON.parse(localStorage.getItem(key(track)));
      if (d && Array.isArray(d.passed)) return d;
    } catch (e) {}
    return { passed: [] };
  }
  function save(track, p) {
    try { localStorage.setItem(key(track), JSON.stringify(p)); } catch (e) {}
  }
  function hasPassed(p, n) { return p.passed.indexOf(n) !== -1; }
  function nextHref() {
    var nl = document.querySelector(".learn-stepnav .learn-next");
    return nl ? nl.getAttribute("href") : "/en/learn/foundations";
  }

  /* ---------- Track index page ---------- */
  var idx = document.getElementById("learn-track-index");
  if (idx) {
    var track = idx.getAttribute("data-track");
    var total = parseInt(idx.getAttribute("data-total"), 10);
    var prog = load(track);
    Array.prototype.forEach.call(idx.querySelectorAll("li[data-step]"), function (li) {
      var n = parseInt(li.getAttribute("data-step"), 10);
      var state = hasPassed(prog, n) ? "passed" : (n === 1 || hasPassed(prog, n - 1)) ? "open" : "locked";
      li.classList.add("learn-" + state);
      var badge = document.createElement("span");
      badge.className = "learn-badge";
      if (state === "passed") badge.textContent = "✓ passed";
      else if (state === "locked") { badge.textContent = "locked"; li.setAttribute("title", "Pass the previous step to unlock"); }
      else badge.textContent = "start";
      li.appendChild(badge);
    });
    var done = prog.passed.filter(function (n) { return n >= 1 && n <= total; }).length;
    var pt = document.getElementById("learn-progress-text");
    if (pt && done > 0) pt.textContent = "Progress on this device: " + done + " of " + total + " steps passed.";
    var reset = document.getElementById("learn-reset");
    if (reset) reset.addEventListener("click", function () {
      if (window.confirm("Reset your progress for this track on this device?")) {
        save(track, { passed: [] });
        location.reload();
      }
    });
  }

  /* ---------- Step pages ---------- */
  var box = document.querySelector(".learn-check");
  if (box) {
    var track2 = box.getAttribute("data-track");
    var step = parseInt(box.getAttribute("data-step"), 10);
    var total2 = parseInt(box.getAttribute("data-total"), 10);
    var prog2 = load(track2);
    var dataEl = box.querySelector("script.learn-quiz-data");
    var data = null;
    try { data = JSON.parse(dataEl.textContent); } catch (e) {}

    if (hasPassed(prog2, step)) {
      var doneBox = document.createElement("div");
      doneBox.className = "learn-check-box";
      var passedMsg = document.createElement("p");
      passedMsg.className = "learn-passed";
      passedMsg.textContent = "✓ Step " + step + " passed. " +
        (step < total2 ? "The next step is unlocked below." : "The completion page is unlocked below.");
      var retakeP = document.createElement("p");
      var retake = document.createElement("button");
      retake.type = "button";
      retake.className = "learn-retake";
      retake.textContent = "Retake the check";
      retake.addEventListener("click", function () { renderQuiz(box, data, track2, step, total2); });
      retakeP.appendChild(retake);
      doneBox.appendChild(passedMsg);
      doneBox.appendChild(retakeP);
      box.appendChild(doneBox);
    } else if (step > 1 && !hasPassed(prog2, step - 1)) {
      var lockBox = document.createElement("div");
      lockBox.className = "learn-check-box";
      var lp = document.createElement("p");
      lp.className = "learn-locked";
      lp.innerHTML = "This step's check is locked. Pass step " + (step - 1) +
        " first — the steps build on each other. " +
        '<a href="/en/learn/foundations">Back to the track index</a>. ' +
        "(The reading above is always open.)";
      lockBox.appendChild(lp);
      box.appendChild(lockBox);
    } else {
      renderQuiz(box, data, track2, step, total2);
    }
  }

  function renderQuiz(box, data, track, step, total) {
    if (!data || !data.questions) { box.textContent = "Check data failed to load."; return; }
    box.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "learn-check-box";

    var title = document.createElement("p");
    title.className = "learn-check-title";
    title.textContent = "Check — step " + step + " of " + total;
    wrap.appendChild(title);
    var note = document.createElement("p");
    note.className = "learn-check-note";
    note.textContent = "All " + data.questions.length + " correct to pass. Every answer is in the linked chapter; unlimited tries.";
    wrap.appendChild(note);

    var correct = 0;
    var banner = document.createElement("p");
    banner.className = "learn-banner";

    data.questions.forEach(function (qq, qi) {
      var qd = document.createElement("div");
      qd.className = "learn-q";
      var qp = document.createElement("p");
      qp.className = "learn-q-text";
      qp.textContent = (qi + 1) + ". " + qq.q;
      qd.appendChild(qp);
      var ul = document.createElement("div");
      ul.className = "learn-choices";
      qq.choices.forEach(function (c, ci) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "learn-choice";
        b.textContent = c;
        b.addEventListener("click", function () {
          if (qd.classList.contains("learn-q-done")) return;
          if (ci === qq.answer) {
            qd.classList.add("learn-q-done");
            b.classList.add("learn-correct");
            Array.prototype.forEach.call(ul.children, function (x) { x.disabled = true; });
            var ref = document.createElement("p");
            ref.className = "learn-ref";
            ref.textContent = "Correct — " + qq.ref;
            qd.appendChild(ref);
            correct++;
            if (correct === data.questions.length) {
              var p = load(track);
              if (!hasPassed(p, step)) { p.passed.push(step); save(track, p); }
              banner.className = "learn-banner learn-pass";
              banner.innerHTML = "✓ Step " + step + " passed. " +
                (step < total
                  ? '<a href="' + nextHref() + '">Continue to step ' + (step + 1) + " →</a>"
                  : '<a href="/en/learn/foundations/complete">Finish the track →</a>');
            } else {
              banner.className = "learn-banner";
              banner.textContent = correct + " of " + data.questions.length + " correct.";
            }
          } else {
            b.classList.add("learn-wrong");
            b.disabled = true;
            banner.className = "learn-banner learn-try";
            banner.textContent = "Not that one — check the chapter and try another.";
          }
          wrap.appendChild(banner);
        });
        ul.appendChild(b);
      });
      qd.appendChild(ul);
      wrap.appendChild(qd);
    });
    wrap.appendChild(banner);
    box.appendChild(wrap);
  }

  /* ---------- Completion page ---------- */
  var comp = document.getElementById("learn-complete");
  if (comp) {
    var t3 = comp.getAttribute("data-track");
    var total3 = parseInt(comp.getAttribute("data-total"), 10);
    var p4 = load(t3);
    var doneAll = true;
    for (var i = 1; i <= total3; i++) {
      if (!hasPassed(p4, i)) { doneAll = false; break; }
    }
    var locked = comp.querySelector(".learn-complete-locked");
    var open = comp.querySelector(".learn-complete-open");
    if (doneAll) { if (locked) locked.style.display = "none"; }
    else if (open) { open.style.display = "none"; }
  }
})();
