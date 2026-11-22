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

  // Localized runtime messages for the Japanese-aligned study translations.
  var LOCAL = {
  "de": {
    "index": "Kursübersicht",
    "finish": "Kurs abschließen",
    "badges": [
      "✓ bestanden",
      "gesperrt",
      "beginnen"
    ],
    "lockedTitle": "Bestehe zuerst den vorherigen Schritt",
    "progress": "Fortschritt auf diesem Gerät: {done} von {total} Schritten bestanden.",
    "resetConfirm": "Den Fortschritt dieses Kurses auf diesem Gerät zurücksetzen?",
    "passed": "✓ Schritt {step} bestanden.",
    "nextUnlocked": "Der nächste Schritt ist unten freigeschaltet.",
    "completeUnlocked": "Die Abschlussseite ist unten freigeschaltet.",
    "retake": "Fragen erneut beantworten",
    "stepLocked": "Die Fragen dieses Schritts sind gesperrt. Bestehe zuerst Schritt {prev}. Der Lesetext bleibt zugänglich.",
    "checkTitle": "Verständnisfragen: Schritt {step} von {total}",
    "checkNote": "Alle {n} Antworten müssen richtig sein. Die Antworten stehen in der Lesehilfe und den Quellen. Beliebig viele Versuche.",
    "correct": "Richtig: ",
    "dataError": "Die Fragen konnten nicht geladen werden.",
    "continue": "Weiter zu Schritt {step}",
    "score": "{correct} von {n} richtig.",
    "wrong": "Nicht diese Antwort. Lies noch einmal nach und wähle eine andere."
  },
  "el": {
    "index": "Περιεχόμενα του κύκλου",
    "finish": "Ολοκλήρωση του κύκλου",
    "badges": [
      "✓ επιτυχία",
      "κλειδωμένο",
      "έναρξη"
    ],
    "lockedTitle": "Περάστε πρώτα το προηγούμενο βήμα",
    "progress": "Πρόοδος σε αυτή τη συσκευή: {done} από {total} βήματα με επιτυχία.",
    "resetConfirm": "Να μηδενιστεί η πρόοδος αυτού του κύκλου σε αυτή τη συσκευή;",
    "passed": "✓ Περάσατε το βήμα {step}.",
    "nextUnlocked": "Το επόμενο βήμα είναι πλέον διαθέσιμο παρακάτω.",
    "completeUnlocked": "Η σελίδα ολοκλήρωσης είναι πλέον διαθέσιμη παρακάτω.",
    "retake": "Επανάληψη του ελέγχου",
    "stepLocked": "Ο έλεγχος αυτού του βήματος είναι κλειδωμένος. Περάστε πρώτα το βήμα {prev}. Το κείμενο παραμένει διαθέσιμο.",
    "checkTitle": "Έλεγχος: βήμα {step} από {total}",
    "checkNote": "Χρειάζονται και οι {n} σωστές απαντήσεις. Όλες βρίσκονται στον οδηγό και στις πηγές. Απεριόριστες προσπάθειες.",
    "correct": "Σωστά: ",
    "dataError": "Δεν ήταν δυνατή η φόρτωση των ερωτήσεων.",
    "continue": "Συνέχεια στο βήμα {step}",
    "score": "{correct} από {n} σωστές απαντήσεις.",
    "wrong": "Όχι αυτή η απάντηση. Ξαναδιαβάστε και επιλέξτε άλλη."
  },
  "es": {
    "index": "Índice del curso",
    "finish": "Finalizar el curso",
    "badges": [
      "✓ superado",
      "bloqueado",
      "empezar"
    ],
    "lockedTitle": "Supere primero el paso anterior",
    "progress": "Progreso en este dispositivo: {done} de {total} pasos superados.",
    "resetConfirm": "¿Borrar el progreso de este curso en este dispositivo?",
    "passed": "✓ Paso {step} superado.",
    "nextUnlocked": "El siguiente paso ya está disponible abajo.",
    "completeUnlocked": "La página de finalización ya está disponible abajo.",
    "retake": "Repetir la prueba",
    "stepLocked": "La prueba de este paso está bloqueada. Supere primero el paso {prev}. El texto de lectura sigue disponible.",
    "checkTitle": "Prueba: paso {step} de {total}",
    "checkNote": "Se necesitan las {n} respuestas correctas. Todas están en la guía y las fuentes. Intentos ilimitados.",
    "correct": "Correcto: ",
    "dataError": "No se pudieron cargar las preguntas.",
    "continue": "Continuar al paso {step}",
    "score": "{correct} de {n} respuestas correctas.",
    "wrong": "Esa no es la respuesta. Vuelva a leer y elija otra."
  },
  "fr": {
    "index": "Sommaire du parcours",
    "finish": "Terminer le parcours",
    "badges": [
      "✓ réussi",
      "verrouillé",
      "commencer"
    ],
    "lockedTitle": "Réussissez d'abord l'étape précédente",
    "progress": "Progression sur cet appareil : {done} étapes réussies sur {total}.",
    "resetConfirm": "Effacer la progression de ce parcours sur cet appareil ?",
    "passed": "✓ Étape {step} réussie.",
    "nextUnlocked": "L'étape suivante est débloquée ci-dessous.",
    "completeUnlocked": "La page de fin de parcours est débloquée ci-dessous.",
    "retake": "Refaire le questionnaire",
    "stepLocked": "Le questionnaire est verrouillé. Réussissez d'abord l'étape {prev}. Le texte reste accessible.",
    "checkTitle": "Questionnaire : étape {step} sur {total}",
    "checkNote": "Il faut {n} bonnes réponses. Toutes figurent dans le guide et les sources. Essais illimités.",
    "correct": "Correct : ",
    "dataError": "Impossible de charger les questions.",
    "continue": "Continuer vers l'étape {step}",
    "score": "{correct} bonnes réponses sur {n}.",
    "wrong": "Ce n'est pas cette réponse. Relisez puis choisissez-en une autre."
  },
  "it": {
    "index": "Indice del percorso",
    "finish": "Concludi il percorso",
    "badges": [
      "✓ superato",
      "bloccato",
      "inizia"
    ],
    "lockedTitle": "Supera prima il passo precedente",
    "progress": "Progressi su questo dispositivo: {done} passi superati su {total}.",
    "resetConfirm": "Azzerare i progressi di questo percorso su questo dispositivo?",
    "passed": "✓ Passo {step} superato.",
    "nextUnlocked": "Il passo successivo è sbloccato qui sotto.",
    "completeUnlocked": "La pagina conclusiva è sbloccata qui sotto.",
    "retake": "Ripeti la verifica",
    "stepLocked": "La verifica di questo passo è bloccata. Supera prima il passo {prev}. Il testo rimane accessibile.",
    "checkTitle": "Verifica: passo {step} di {total}",
    "checkNote": "Servono tutte le {n} risposte corrette. Si trovano nella guida e nelle fonti. Tentativi illimitati.",
    "correct": "Corretto: ",
    "dataError": "Impossibile caricare le domande.",
    "continue": "Continua al passo {step}",
    "score": "{correct} risposte corrette su {n}.",
    "wrong": "Non è questa la risposta. Rileggi e scegli un'altra opzione."
  }
};
  function format(s, values) {
    return s.replace(/\{([a-z]+)\}/g, function (_, k) { return String(values[k]); });
  }
  Object.keys(LOCAL).forEach(function (locale) {
    var L = LOCAL[locale];
    STR[locale] = {
      badgePassed: L.badges[0], badgeLocked: L.badges[1], badgeStart: L.badges[2],
      lockedTitle: L.lockedTitle, resetConfirm: L.resetConfirm, retake: L.retake,
      correctPrefix: L.correct, dataError: L.dataError, bannerWrong: L.wrong,
      progress: function (done, total) { return format(L.progress, {done: done, total: total}); },
      stepPassed: function (step, total) { return format(L.passed, {step: step}) + ' ' + (step < total ? L.nextUnlocked : L.completeUnlocked); },
      stepLocked: function (prev, base) { return format(L.stepLocked, {prev: prev}) + ' <a href="' + base + '">' + L.index + '</a>'; },
      checkTitle: function (step, total) { return format(L.checkTitle, {step: step, total: total}); },
      checkNote: function (n) { return format(L.checkNote, {n: n}); },
      bannerPass: function (step, total, nextUrl, base) {
        return format(L.passed, {step: step}) + ' ' + (step < total
          ? '<a href="' + nextUrl + '">' + format(L.continue, {step: step + 1}) + ' →</a>'
          : '<a href="' + base + '/complete">' + L.finish + ' →</a>');
      },
      bannerProgress: function (correct, n) { return format(L.score, {correct: correct, n: n}); }
    };
  });

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
