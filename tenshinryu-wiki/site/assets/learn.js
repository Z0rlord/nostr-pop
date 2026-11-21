/* Tenshinryu Learn — client-side track progress + comprehension checks.
   Progress lives in localStorage on this device only. Nothing is sent anywhere.
   UI strings follow the page language (document lang, else path prefix). */
(function () {
  "use strict";

  var STR = {
    en: {
      badgePassed: "✓ passed",
      badgeLocked: "locked",
      badgeStart: "start",
      lockedTitle: "Pass the previous step to unlock",
      progress: function (done, total) { return "Progress on this device: " + done + " of " + total + " steps passed."; },
      resetConfirm: "Reset your progress for this track on this device?",
      stepPassed: function (step, total) {
        return "✓ Step " + step + " passed. " +
          (step < total ? "The next step is unlocked below." : "The completion page is unlocked below.");
      },
      retake: "Retake the check",
      stepLocked: function (prev, base) {
        return "This step's check is locked. Pass step " + prev +
          " first — the steps build on each other. " +
          '<a href="' + base + '">Back to the track index</a>. ' +
          "(The reading above is always open.)";
      },
      checkTitle: function (step, total) { return "Check — step " + step + " of " + total; },
      checkNote: function (n) { return "All " + n + " correct to pass. Every answer is in the linked chapter; unlimited tries."; },
      correctPrefix: "Correct — ",
      dataError: "Check data failed to load.",
      bannerPass: function (step, total, nextUrl, base) {
        return "✓ Step " + step + " passed. " +
          (step < total
            ? '<a href="' + nextUrl + '">Continue to step ' + (step + 1) + " →</a>"
            : '<a href="' + base + '/complete">Finish the track →</a>');
      },
      bannerProgress: function (correct, n) { return correct + " of " + n + " correct."; },
      bannerWrong: "Not that one — check the chapter and try another."
    },
    ja: {
      badgePassed: "✓ 合格",
      badgeLocked: "ロック中",
      badgeStart: "開始",
      lockedTitle: "前のステップに合格すると開きます",
      progress: function (done, total) { return "この端末での進捗: 全" + total + "ステップ中 " + done + " 合格"; },
      resetConfirm: "この端末に保存されたこのトラックの進捗をリセットしますか?",
      stepPassed: function (step, total) {
        return "✓ ステップ" + step + "に合格しました。" +
          (step < total ? "次のステップが下に開きました。" : "修了ページが下に開きました。");
      },
      retake: "もう一度テストを受ける",
      stepLocked: function (prev, base) {
        return "このステップの確認テストはまだ開いていません。まずステップ" + prev +
          "に合格してください。ステップは順に積み上がっていきます。" +
          '<a href="' + base + '">トラック一覧に戻る</a>' +
          "(上の本文はいつでも読めます。)";
      },
      checkTitle: function (step, total) { return "確認テスト — 全" + total + "ステップ中 ステップ" + step; },
      checkNote: function (n) { return "全" + n + "問正解で合格です。答えはすべてリンク先の章にあります。何度でも挑戦できます。"; },
      correctPrefix: "正解 — ",
      dataError: "テストデータを読み込めませんでした。",
      bannerPass: function (step, total, nextUrl, base) {
        return "✓ ステップ" + step + "合格。" +
          (step < total
            ? '<a href="' + nextUrl + '">ステップ' + (step + 1) + "へ進む →</a>"
            : '<a href="' + base + '/complete">修了ページへ →</a>');
      },
      bannerProgress: function (correct, n) { return n + "問中 " + correct + "問正解"; },
      bannerWrong: "違います。章を読み直して、別の選択肢を選んでください。"
    }
  };

  var lang = (document.documentElement.getAttribute("lang") || "").split("-")[0];
  if (!STR[lang]) {
    var m = location.pathname.match(/^\/([a-z]{2})\//);
    lang = (m && STR[m[1]]) ? m[1] : "en";
  }
  var S = STR[lang];

  function trackBase() {
    var m = location.pathname.match(/^(\/[a-z]{2}\/learn\/[^\/]+)/);
    return m ? m[1] : "/en/learn/foundations";
  }

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
    return nl ? nl.getAttribute("href") : trackBase();
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
      if (state === "passed") badge.textContent = S.badgePassed;
      else if (state === "locked") { badge.textContent = S.badgeLocked; li.setAttribute("title", S.lockedTitle); }
      else badge.textContent = S.badgeStart;
      li.appendChild(badge);
    });
    var done = prog.passed.filter(function (n) { return n >= 1 && n <= total; }).length;
    var pt = document.getElementById("learn-progress-text");
    if (pt && done > 0) pt.textContent = S.progress(done, total);
    var reset = document.getElementById("learn-reset");
    if (reset) reset.addEventListener("click", function () {
      if (window.confirm(S.resetConfirm)) {
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
      passedMsg.textContent = S.stepPassed(step, total2);
      var retakeP = document.createElement("p");
      var retake = document.createElement("button");
      retake.type = "button";
      retake.className = "learn-retake";
      retake.textContent = S.retake;
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
      lp.innerHTML = S.stepLocked(step - 1, trackBase());
      lockBox.appendChild(lp);
      box.appendChild(lockBox);
    } else {
      renderQuiz(box, data, track2, step, total2);
    }
  }

  function renderQuiz(box, data, track, step, total) {
    if (!data || !data.questions) { box.textContent = S.dataError; return; }
    box.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "learn-check-box";

    var title = document.createElement("p");
    title.className = "learn-check-title";
    title.textContent = S.checkTitle(step, total);
    wrap.appendChild(title);
    var note = document.createElement("p");
    note.className = "learn-check-note";
    note.textContent = S.checkNote(data.questions.length);
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
            ref.textContent = S.correctPrefix + qq.ref;
            qd.appendChild(ref);
            correct++;
            if (correct === data.questions.length) {
              var p = load(track);
              if (!hasPassed(p, step)) { p.passed.push(step); save(track, p); }
              banner.className = "learn-banner learn-pass";
              banner.innerHTML = S.bannerPass(step, total, nextHref(), trackBase());
            } else {
              banner.className = "learn-banner";
              banner.textContent = S.bannerProgress(correct, data.questions.length);
            }
          } else {
            b.classList.add("learn-wrong");
            b.disabled = true;
            banner.className = "learn-banner learn-try";
            banner.textContent = S.bannerWrong;
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
