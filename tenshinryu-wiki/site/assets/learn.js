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
  },
  "pt": {
    "index": "Índice do curso",
    "finish": "Concluir o curso",
    "badges": [
      "✓ aprovado",
      "bloqueado",
      "começar"
    ],
    "lockedTitle": "Seja aprovado primeiro no passo anterior",
    "progress": "Progresso neste dispositivo: {done} de {total} passos aprovados.",
    "resetConfirm": "Apagar o progresso deste curso neste dispositivo?",
    "passed": "✓ Passo {step} aprovado.",
    "nextUnlocked": "O próximo passo está liberado logo abaixo.",
    "completeUnlocked": "A página final está liberada logo abaixo.",
    "retake": "Refazer a verificação",
    "stepLocked": "A verificação deste passo está bloqueada. Seja aprovado primeiro no passo {prev}. O texto continua acessível.",
    "checkTitle": "Verificação: passo {step} de {total}",
    "checkNote": "É preciso acertar todas as {n} respostas. Elas estão no guia e nas fontes. Tentativas ilimitadas.",
    "correct": "Correto: ",
    "dataError": "Não foi possível carregar as perguntas.",
    "continue": "Continuar para o passo {step}",
    "score": "{correct} respostas corretas de {n}.",
    "wrong": "Não é esta a resposta. Releia e escolha outra opção."
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

  /* ---------- Account strings (sign-in, server-side progress) ---------- */
  var ACCT = {
    en: {
      gateTitle: "Sign in to take the checks",
      gateBody: "The reading is open to everyone. To take a step's check and keep your progress, sign in. Your progress is saved to your account, so it follows you across devices.",
      google: "Continue with Google", apple: "Continue with Apple",
      signedInAs: "Signed in as {name}", signOut: "Sign out", badgeSignIn: "sign in",
      loading: "Loading your progress…",
      saveError: "Could not save your progress. Check your connection and try again.",
      loadError: "Could not load your progress. Reload the page to try again.",
      signInError: "Sign-in did not complete. Try again.",
      progress: "Your progress: {done} of {total} steps passed.",
      resetConfirm: "Reset your saved progress for this track? This cannot be undone.",
      completeGate: "Sign in and pass all {total} steps to open this page."
    },
    ja: {
      gateTitle: "確認テストを受けるにはサインインしてください",
      gateBody: "本文は誰でも読めます。確認テストを受けて進捗を残すには、サインインが必要です。進捗はアカウントに保存されるので、端末を変えても続きから学べます。",
      google: "Googleで続ける", apple: "Appleで続ける",
      signedInAs: "{name} としてサインイン中", signOut: "サインアウト", badgeSignIn: "サインイン",
      loading: "進捗を読み込んでいます…",
      saveError: "進捗を保存できませんでした。接続を確認して、もう一度お試しください。",
      loadError: "進捗を読み込めませんでした。ページを再読み込みしてください。",
      signInError: "サインインが完了しませんでした。もう一度お試しください。",
      progress: "あなたの進捗: 全{total}ステップ中 {done} 合格",
      resetConfirm: "このトラックの保存済みの進捗をリセットしますか? 元に戻せません。",
      completeGate: "サインインして全{total}ステップに合格すると、このページが開きます。"
    },
    de: {
      gateTitle: "Anmelden, um die Fragen zu beantworten",
      gateBody: "Der Lesetext steht allen offen. Um die Verständnisfragen eines Schritts zu beantworten und deinen Fortschritt zu behalten, melde dich an. Der Fortschritt wird in deinem Konto gespeichert und folgt dir auf jedes Gerät.",
      google: "Weiter mit Google", apple: "Weiter mit Apple",
      signedInAs: "Angemeldet als {name}", signOut: "Abmelden", badgeSignIn: "anmelden",
      loading: "Dein Fortschritt wird geladen…",
      saveError: "Der Fortschritt konnte nicht gespeichert werden. Prüfe die Verbindung und versuche es erneut.",
      loadError: "Der Fortschritt konnte nicht geladen werden. Lade die Seite neu.",
      signInError: "Die Anmeldung wurde nicht abgeschlossen. Versuche es erneut.",
      progress: "Dein Fortschritt: {done} von {total} Schritten bestanden.",
      resetConfirm: "Den gespeicherten Fortschritt dieses Kurses zurücksetzen? Das lässt sich nicht rückgängig machen.",
      completeGate: "Melde dich an und bestehe alle {total} Schritte, um diese Seite zu öffnen."
    },
    el: {
      gateTitle: "Συνδεθείτε για να απαντήσετε στους ελέγχους",
      gateBody: "Το κείμενο είναι ανοιχτό σε όλους. Για να απαντήσετε στον έλεγχο ενός βήματος και να κρατήσετε την πρόοδό σας, συνδεθείτε. Η πρόοδος αποθηκεύεται στον λογαριασμό σας και σας ακολουθεί σε κάθε συσκευή.",
      google: "Συνέχεια με Google", apple: "Συνέχεια με Apple",
      signedInAs: "Συνδεδεμένος ως {name}", signOut: "Αποσύνδεση", badgeSignIn: "σύνδεση",
      loading: "Φόρτωση της προόδου σας…",
      saveError: "Δεν ήταν δυνατή η αποθήκευση της προόδου. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.",
      loadError: "Δεν ήταν δυνατή η φόρτωση της προόδου. Ανανεώστε τη σελίδα.",
      signInError: "Η σύνδεση δεν ολοκληρώθηκε. Δοκιμάστε ξανά.",
      progress: "Η πρόοδός σας: {done} από {total} βήματα με επιτυχία.",
      resetConfirm: "Να μηδενιστεί η αποθηκευμένη πρόοδος αυτού του κύκλου; Η ενέργεια δεν αναιρείται.",
      completeGate: "Συνδεθείτε και περάστε και τα {total} βήματα για να ανοίξει αυτή η σελίδα."
    },
    es: {
      gateTitle: "Inicie sesión para hacer las pruebas",
      gateBody: "La lectura está abierta a todos. Para hacer la prueba de un paso y conservar su progreso, inicie sesión. El progreso se guarda en su cuenta y le acompaña en cualquier dispositivo.",
      google: "Continuar con Google", apple: "Continuar con Apple",
      signedInAs: "Sesión iniciada como {name}", signOut: "Cerrar sesión", badgeSignIn: "iniciar sesión",
      loading: "Cargando su progreso…",
      saveError: "No se pudo guardar su progreso. Compruebe la conexión e inténtelo de nuevo.",
      loadError: "No se pudo cargar su progreso. Recargue la página.",
      signInError: "El inicio de sesión no se completó. Inténtelo de nuevo.",
      progress: "Su progreso: {done} de {total} pasos superados.",
      resetConfirm: "¿Borrar el progreso guardado de este curso? No se puede deshacer.",
      completeGate: "Inicie sesión y supere los {total} pasos para abrir esta página."
    },
    fr: {
      gateTitle: "Connectez-vous pour passer les questionnaires",
      gateBody: "La lecture est ouverte à tous. Pour passer le questionnaire d'une étape et conserver votre progression, connectez-vous. Elle est enregistrée dans votre compte et vous suit d'un appareil à l'autre.",
      google: "Continuer avec Google", apple: "Continuer avec Apple",
      signedInAs: "Connecté en tant que {name}", signOut: "Se déconnecter", badgeSignIn: "connexion",
      loading: "Chargement de votre progression…",
      saveError: "Impossible d'enregistrer votre progression. Vérifiez la connexion et réessayez.",
      loadError: "Impossible de charger votre progression. Rechargez la page.",
      signInError: "La connexion n'a pas abouti. Réessayez.",
      progress: "Votre progression : {done} étapes réussies sur {total}.",
      resetConfirm: "Effacer la progression enregistrée de ce parcours ? Cette action est définitive.",
      completeGate: "Connectez-vous et réussissez les {total} étapes pour ouvrir cette page."
    },
    it: {
      gateTitle: "Accedi per svolgere le verifiche",
      gateBody: "Il testo è aperto a tutti. Per svolgere la verifica di un passo e conservare i tuoi progressi, accedi. I progressi sono salvati nel tuo account e ti seguono su ogni dispositivo.",
      google: "Continua con Google", apple: "Continua con Apple",
      signedInAs: "Accesso eseguito come {name}", signOut: "Esci", badgeSignIn: "accedi",
      loading: "Caricamento dei tuoi progressi…",
      saveError: "Impossibile salvare i progressi. Controlla la connessione e riprova.",
      loadError: "Impossibile caricare i progressi. Ricarica la pagina.",
      signInError: "L'accesso non è stato completato. Riprova.",
      progress: "I tuoi progressi: {done} passi superati su {total}.",
      resetConfirm: "Azzerare i progressi salvati di questo percorso? L'azione non si può annullare.",
      completeGate: "Accedi e supera tutti i {total} passi per aprire questa pagina."
    },
    pt: {
      gateTitle: "Entre para fazer as verificações",
      gateBody: "O texto é aberto a todos. Para fazer a verificação de um passo e guardar o seu progresso, entre na sua conta. O progresso fica salvo na sua conta e acompanha você em qualquer dispositivo.",
      google: "Continuar com o Google", apple: "Continuar com a Apple",
      signedInAs: "Conectado como {name}", signOut: "Sair", badgeSignIn: "entrar",
      loading: "Carregando o seu progresso…",
      saveError: "Não foi possível salvar o progresso. Verifique a conexão e tente de novo.",
      loadError: "Não foi possível carregar o progresso. Recarregue a página.",
      signInError: "A entrada não foi concluída. Tente de novo.",
      progress: "O seu progresso: {done} de {total} passos aprovados.",
      resetConfirm: "Apagar o progresso salvo deste curso? Esta ação não pode ser desfeita.",
      completeGate: "Entre e seja aprovado em todos os {total} passos para abrir esta página."
    }
  };

  var lang = (document.documentElement.getAttribute("lang") || "").split("-")[0];
  if (!STR[lang]) {
    var m = location.pathname.match(/^\/([a-z]{2})\//);
    lang = (m && STR[m[1]]) ? m[1] : "en";
  }
  var S = STR[lang];
  var A = ACCT[lang] || ACCT.en;

  function trackBase() {
    var m = location.pathname.match(/^(\/[a-z]{2}\/learn\/[^\/]+)/);
    return m ? m[1] : "/en/learn/foundations";
  }
  function nextHref() {
    var nl = document.querySelector(".learn-stepnav .learn-next");
    return nl ? nl.getAttribute("href") : trackBase();
  }
  function hasPassed(p, n) { return p.indexOf(n) !== -1; }

  /* ---------- Where we are on the page ---------- */
  var idx = document.getElementById("learn-track-index");
  var box = document.querySelector(".learn-check");
  var comp = document.getElementById("learn-complete");
  if (!idx && !box && !comp) return;

  var trackEl = idx || box || comp;
  var TRACK = trackEl.getAttribute("data-track");
  var TOTAL = parseInt(trackEl.getAttribute("data-total"), 10);

  /* ---------- State ---------- */
  var AUTH = null;       // auth.js module once loaded
  var state = "loading"; // loading | out | in | error
  var user = null;
  var passed = [];

  function localKey() { return "tw-learn:" + TRACK; }
  function readLocal() {
    try {
      var d = JSON.parse(localStorage.getItem(localKey()));
      if (d && Array.isArray(d.passed)) return d.passed;
    } catch (e) {}
    return [];
  }
  function clearLocal() { try { localStorage.removeItem(localKey()); } catch (e) {} }

  function api(method, path, body) {
    return AUTH.getToken().then(function (tok) {
      if (!tok) throw new Error("no token");
      var opts = { method: method, headers: { "Authorization": "Bearer " + tok } };
      if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
      return fetch(path, opts).then(function (r) {
        if (!r.ok) { var e = new Error("http " + r.status); e.status = r.status; throw e; }
        return r.json();
      });
    });
  }

  function loadProgress() {
    var local = readLocal();
    var first = local.length
      ? api("POST", "/api/progress/import", { track: TRACK, passed: local })
          .then(function (r) { clearLocal(); return r; })
      : api("GET", "/api/progress?track=" + encodeURIComponent(TRACK));
    return first.then(function (r) { passed = r.passed || []; state = "in"; });
  }

  function savePass(step) {
    return api("POST", "/api/progress", { track: TRACK, step: step })
      .then(function (r) { passed = r.passed || passed; });
  }

  /* ---------- Small DOM helpers ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fmt(s, vals) { return s.replace(/\{([a-z]+)\}/g, function (_, k) { return String(vals[k]); }); }

  function authButtons(msgEl) {
    var row = el("p", "learn-auth-buttons");
    [["google", A.google, "signInGoogle"], ["apple", A.apple, "signInApple"]].forEach(function (b) {
      var btn = el("button", "learn-auth-btn learn-auth-" + b[0], b[1]);
      btn.type = "button";
      btn.addEventListener("click", function () {
        msgEl.textContent = "";
        AUTH[b[2]]().catch(function (e) {
          var c = e && e.code;
          if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return;
          msgEl.textContent = A.signInError;
        });
      });
      row.appendChild(btn);
    });
    return row;
  }

  function gateBox() {
    var wrap = el("div", "learn-check-box learn-gate");
    wrap.appendChild(el("p", "learn-check-title", A.gateTitle));
    wrap.appendChild(el("p", "learn-check-note", A.gateBody));
    var msg = el("p", "learn-banner learn-try");
    wrap.appendChild(authButtons(msg));
    wrap.appendChild(msg);
    return wrap;
  }

  function accountBar() {
    var bar = el("p", "learn-account");
    bar.appendChild(el("span", "learn-account-name",
      fmt(A.signedInAs, { name: (user && (user.displayName || user.email)) || "" })));
    var out = el("button", "learn-signout", A.signOut);
    out.type = "button";
    out.addEventListener("click", function () { AUTH.signOutUser(); });
    bar.appendChild(document.createTextNode(" · "));
    bar.appendChild(out);
    return bar;
  }

  function noticeBox(text) {
    var wrap = el("div", "learn-check-box");
    wrap.appendChild(el("p", "learn-locked", text));
    return wrap;
  }

  /* ---------- Render ---------- */
  var bars = [];
  function clearBars() { bars.forEach(function (b) { if (b.parentNode) b.parentNode.removeChild(b); }); bars = []; }
  function placeBar(anchor) {
    if (state !== "in" || !anchor || !anchor.parentNode) return;
    var b = accountBar();
    anchor.parentNode.insertBefore(b, anchor);
    bars.push(b);
  }

  function render() {
    clearBars();
    if (idx) renderIndex();
    if (box) renderStep();
    if (comp) renderComplete();
  }

  function renderIndex() {
    var gate = document.getElementById("learn-gate-slot");
    if (!gate) { gate = el("div"); gate.id = "learn-gate-slot"; idx.parentNode.insertBefore(gate, idx); }
    gate.innerHTML = "";
    if (state === "out") gate.appendChild(gateBox());
    if (state === "loading") gate.appendChild(noticeBox(A.loading));
    if (state === "error") gate.appendChild(noticeBox(A.loadError));
    placeBar(gate);
    var open = state === "in";
    Array.prototype.forEach.call(idx.querySelectorAll("li[data-step]"), function (li) {
      var n = parseInt(li.getAttribute("data-step"), 10);
      var old = li.querySelector(".learn-badge");
      if (old) li.removeChild(old);
      li.classList.remove("learn-passed", "learn-open", "learn-locked");
      li.removeAttribute("title");
      var badge = el("span", "learn-badge");
      if (!open) {
        li.classList.add("learn-locked");
        badge.textContent = state === "out" ? A.badgeSignIn : "";
      } else if (hasPassed(passed, n)) { li.classList.add("learn-passed"); badge.textContent = S.badgePassed; }
      else if (n === 1 || hasPassed(passed, n - 1)) { li.classList.add("learn-open"); badge.textContent = S.badgeStart; }
      else { li.classList.add("learn-locked"); badge.textContent = S.badgeLocked; li.setAttribute("title", S.lockedTitle); }
      li.appendChild(badge);
    });
    var done = passed.filter(function (n) { return n >= 1 && n <= TOTAL; }).length;
    var pt = document.getElementById("learn-progress-text");
    if (pt) pt.textContent = (open && done > 0) ? fmt(A.progress, { done: done, total: TOTAL }) : "";
    var reset = document.getElementById("learn-reset");
    if (reset) {
      reset.style.display = open ? "" : "none";
      if (!reset.getAttribute("data-bound")) {
        reset.setAttribute("data-bound", "1");
        reset.addEventListener("click", function () {
          if (state !== "in" || !window.confirm(A.resetConfirm)) return;
          api("DELETE", "/api/progress?track=" + encodeURIComponent(TRACK))
            .then(function () { passed = []; render(); })
            .catch(function () { window.alert(A.saveError); });
        });
      }
    }
  }

  function renderStep() {
    var step = parseInt(box.getAttribute("data-step"), 10);
    var dataEl = box.querySelector("script.learn-quiz-data");
    if (dataEl && !box._quizData) {
      try { box._quizData = JSON.parse(dataEl.textContent); } catch (e) {}
      box._quizScript = dataEl;
    }
    var data = box._quizData || null;
    // Rebuild everything except the stored quiz JSON.
    Array.prototype.slice.call(box.children).forEach(function (c) { if (c !== box._quizScript) box.removeChild(c); });
    if (state === "loading") { box.appendChild(noticeBox(A.loading)); return; }
    if (state === "error") { box.appendChild(noticeBox(A.loadError)); return; }
    if (state === "out") { box.appendChild(gateBox()); return; }
    placeBar(box);
    if (hasPassed(passed, step)) {
      var doneBox = el("div", "learn-check-box");
      doneBox.appendChild(el("p", "learn-passed", S.stepPassed(step, TOTAL)));
      var retakeP = el("p");
      var retake = el("button", "learn-retake", S.retake);
      retake.type = "button";
      retake.addEventListener("click", function () { renderQuiz(box, data, step); });
      retakeP.appendChild(retake);
      doneBox.appendChild(retakeP);
      box.appendChild(doneBox);
    } else if (step > 1 && !hasPassed(passed, step - 1)) {
      var lockBox = el("div", "learn-check-box");
      var lp = el("p", "learn-locked");
      lp.innerHTML = S.stepLocked(step - 1, trackBase());
      lockBox.appendChild(lp);
      box.appendChild(lockBox);
    } else {
      renderQuiz(box, data, step);
    }
  }

  function renderQuiz(box, data, step) {
    if (!data || !data.questions) { box.appendChild(el("p", null, S.dataError)); return; }
    Array.prototype.slice.call(box.children).forEach(function (c) {
      if (c !== box._quizScript && !c.classList.contains("learn-account")) box.removeChild(c);
    });
    var wrap = el("div", "learn-check-box");
    wrap.appendChild(el("p", "learn-check-title", S.checkTitle(step, TOTAL)));
    wrap.appendChild(el("p", "learn-check-note", S.checkNote(data.questions.length)));

    var correct = 0;
    var banner = el("p", "learn-banner");

    data.questions.forEach(function (qq, qi) {
      var qd = el("div", "learn-q");
      qd.appendChild(el("p", "learn-q-text", (qi + 1) + ". " + qq.q));
      var ul = el("div", "learn-choices");
      qq.choices.forEach(function (c, ci) {
        var b = el("button", "learn-choice", c);
        b.type = "button";
        b.addEventListener("click", function () {
          if (qd.classList.contains("learn-q-done")) return;
          if (ci === qq.answer) {
            qd.classList.add("learn-q-done");
            b.classList.add("learn-correct");
            Array.prototype.forEach.call(ul.children, function (x) { x.disabled = true; });
            qd.appendChild(el("p", "learn-ref", S.correctPrefix + qq.ref));
            correct++;
            if (correct === data.questions.length) {
              var done = function () {
                banner.className = "learn-banner learn-pass";
                banner.innerHTML = S.bannerPass(step, TOTAL, nextHref(), trackBase());
              };
              if (hasPassed(passed, step)) done();
              else savePass(step).then(done).catch(function () {
                banner.className = "learn-banner learn-try";
                banner.textContent = A.saveError;
              });
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

  function renderComplete() {
    var doneAll = state === "in";
    if (doneAll) {
      for (var i = 1; i <= TOTAL; i++) { if (!hasPassed(passed, i)) { doneAll = false; break; } }
    }
    var locked = comp.querySelector(".learn-complete-locked");
    var open = comp.querySelector(".learn-complete-open");
    if (locked) locked.style.display = doneAll ? "none" : "";
    if (open) open.style.display = doneAll ? "" : "none";
    var slot = document.getElementById("learn-complete-gate");
    if (!slot) { slot = el("div"); slot.id = "learn-complete-gate"; comp.parentNode.insertBefore(slot, comp); }
    slot.innerHTML = "";
    if (state === "out") {
      if (locked) locked.textContent = fmt(A.completeGate, { total: TOTAL });
      slot.appendChild(gateBox());
    }
    if (state === "in") placeBar(slot);
  }

  /* ---------- Start: load sign-in on demand ---------- */
  render();
  import("/assets/auth.js?v=" + (window.WIKI_ASSET_V || "1")).then(function (mod) {
    AUTH = mod;
    AUTH.onUser(function (u) {
      user = u;
      if (!u) { state = "out"; passed = []; render(); return; }
      state = "loading"; render();
      loadProgress().then(render).catch(function () { state = "error"; render(); });
    });
  }).catch(function () { state = "error"; render(); });
})();
