(function () {
  const canvas = document.getElementById("graph-canvas");
  if (!canvas) return;

  const lang = window.WIKI_LANG || "en";
  const ctx = canvas.getContext("2d");
  let nodes = [];
  let links = [];
  let hovered = null;
  let dragged = null;
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let lastX = 0;
  let lastY = 0;

  const COLORS = {
    overview: "#8b2635",
    history: "#5c4a72",
    arts: "#2d6a4f",
    techniques: "#bc6c25",
    concepts: "#0077b6",
    people: "#9b2226",
    guides: "#6a4c93",
    sources: "#6c757d",
    reiho: "#4a5759",
    philosophy: "#386641",
    other: "#888",
  };

  const LINK_LEN = 130;
  const LABEL_FONT = "10px system-ui, -apple-system, sans-serif";

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const h = Math.max(420, window.innerHeight - rect.top - 24);
    canvas.style.height = h + "px";
    canvas.width = rect.width * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function screenToWorld(x, y) {
    return { x: (x - panX) / scale, y: (y - panY) / scale };
  }

  function nodeRadius(n) {
    return 5 + Math.min(n.degree || 0, 10) * 0.5;
  }

  function displayLabel(n, full) {
    if (full || (hovered === n && n.title !== n.label)) return n.title;
    return n.label || n.title;
  }

  function labelMetrics(n, text) {
    ctx.font = hovered === n ? "bold " + LABEL_FONT : LABEL_FONT;
    const w = ctx.measureText(text).width;
    const h = 12;
    const r = nodeRadius(n);
    const x = n.x - w / 2;
    const y = n.y + r + 5;
    return { x, y, w, h, text };
  }

  function tick() {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h / 2;

    for (const n of nodes) {
      n.vx = (n.vx || 0) * 0.82;
      n.vy = (n.vy || 0) * 0.82;
    }

    for (const l of links) {
      const a = l.source;
      const b = l.target;
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - LINK_LEN) * 0.025;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const rep = 1400 / (dist * dist);
        const fx = (dx / dist) * rep;
        const fy = (dy / dist) * rep;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    for (const n of nodes) {
      if (n === dragged) continue;
      n.vx += (cx - n.x) * 0.0008;
      n.vy += (cy - n.y) * 0.0008;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  function drawLabel(n) {
    const text = displayLabel(n, false);
    const m = labelMetrics(n, text);
    const color = COLORS[n.group] || COLORS.other;
    const pad = 2;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(m.x - pad, m.y - 1, m.w + pad * 2, m.h + 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = n === hovered || n === dragged ? "bold " + LABEL_FONT : LABEL_FONT;
    ctx.fillStyle = n === hovered || n === dragged ? color : "#2a2a2a";
    ctx.fillText(text, m.x, m.y);
    n._labelBox = m;
  }

  function draw() {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    ctx.strokeStyle = "rgba(0,0,0,0.07)";
    ctx.lineWidth = 1;
    for (const l of links) {
      const a = l.source;
      const b = l.target;
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (const n of nodes) {
      const r = nodeRadius(n);
      const color = COLORS[n.group] || COLORS.other;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n === hovered || n === dragged ? color : color + "dd";
      ctx.fill();
      if (n === hovered || n === dragged) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    for (const n of nodes) {
      drawLabel(n);
    }

    if (hovered && hovered.title !== hovered.label) {
      const full = displayLabel(hovered, true);
      const m = labelMetrics(hovered, full);
      const color = COLORS[hovered.group] || COLORS.other;
      const pad = 3;
      ctx.fillStyle = "rgba(255,255,255,0.98)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.fillRect(m.x - pad, m.y - 2, m.w + pad * 2, m.h + 4);
      ctx.strokeRect(m.x - pad, m.y - 2, m.w + pad * 2, m.h + 4);
      ctx.font = "bold " + LABEL_FONT;
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(full, m.x, m.y);
    }

    ctx.restore();
  }

  function loop() {
    tick();
    draw();
    requestAnimationFrame(loop);
  }

  function hitTest(mx, my) {
    const w = screenToWorld(mx, my);
    let best = null;
    let bestD = Infinity;
    for (const n of nodes) {
      const dx = n.x - w.x;
      const dy = n.y - w.y;
      const dNode = Math.sqrt(dx * dx + dy * dy);
      const r = nodeRadius(n) + 6;
      if (dNode < r && dNode < bestD) {
        best = n;
        bestD = dNode;
        continue;
      }
      const box = n._labelBox;
      if (box && w.x >= box.x - 4 && w.x <= box.x + box.w + 4 && w.y >= box.y - 2 && w.y <= box.y + box.h + 4) {
        const dLabel = Math.sqrt((w.x - (box.x + box.w / 2)) ** 2 + (w.y - (box.y + box.h / 2)) ** 2);
        if (dLabel < bestD) {
          best = n;
          bestD = dLabel;
        }
      }
    }
    return best;
  }

  function buildLegend() {
    const el = document.getElementById("graph-legend");
    if (!el) return;
    const used = [...new Set(nodes.map((n) => n.group))].sort();
    el.innerHTML = used
      .map(
        (g) =>
          '<span class="legend-item"><span class="legend-dot" style="background:' +
          (COLORS[g] || COLORS.other) +
          '"></span>' +
          g +
          "</span>"
      )
      .join("");
  }

  canvas.addEventListener("mousemove", function (e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (isPanning) {
      panX += e.clientX - lastX;
      panY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      return;
    }
    if (dragged) {
      const w = screenToWorld(mx, my);
      dragged.x = w.x - offsetX;
      dragged.y = w.y - offsetY;
      dragged.vx = 0;
      dragged.vy = 0;
      return;
    }
    hovered = hitTest(mx, my);
    canvas.style.cursor = hovered ? "pointer" : "grab";
  });

  canvas.addEventListener("mousedown", function (e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const n = hitTest(mx, my);
    if (n) {
      dragged = n;
      const w = screenToWorld(mx, my);
      offsetX = w.x - n.x;
      offsetY = w.y - n.y;
      canvas.style.cursor = "grabbing";
    } else if (e.button === 0) {
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = "grabbing";
    }
  });

  window.addEventListener("mouseup", function () {
    dragged = null;
    isPanning = false;
    canvas.style.cursor = hovered ? "pointer" : "grab";
  });

  canvas.addEventListener("click", function (e) {
    const rect = canvas.getBoundingClientRect();
    const n = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (n && n.url) window.location.href = n.url;
  });

  canvas.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newScale = Math.min(3, Math.max(0.35, scale * factor));
      panX = mx - (mx - panX) * (newScale / scale);
      panY = my - (my - panY) * (newScale / scale);
      scale = newScale;
    },
    { passive: false }
  );

  window.addEventListener("resize", resize);

  fetch("/assets/graph-" + lang + ".json")
    .then((r) => r.json())
    .then(function (data) {
      const nodeMap = {};
      const w = canvas.parentElement.getBoundingClientRect().width;
      const h = Math.max(420, window.innerHeight - 200);
      data.nodes.forEach(function (d, i) {
        const angle = (i / data.nodes.length) * Math.PI * 2;
        const radius = Math.min(w, h) * 0.35;
        nodeMap[d.id] = {
          id: d.id,
          title: d.title,
          label: d.label || d.title,
          url: d.url,
          group: d.group || "other",
          x: w / 2 + Math.cos(angle) * radius,
          y: h / 2 + Math.sin(angle) * radius,
          degree: 0,
        };
      });
      links = data.links.map(function (l) {
        return {
          source: nodeMap[l.source],
          target: nodeMap[l.target],
        };
      });
      links.forEach(function (l) {
        if (l.source) l.source.degree = (l.source.degree || 0) + 1;
        if (l.target) l.target.degree = (l.target.degree || 0) + 1;
      });
      nodes = Object.values(nodeMap);
      resize();
      buildLegend();
      loop();
    })
    .catch(function () {
      ctx.font = "14px system-ui";
      ctx.fillText("Could not load graph data.", 20, 40);
    });
})();
