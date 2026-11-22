export function createFloralIntroScene({ canvas, onComplete }) {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = null;
  let completeTimer = null;
  let startTime = 0;
  let bokehCircles = [];
  let flowers = [];
  let pollen = [];

  const PALETTE = [
    { petal: "#e5a93b", center: "#9e6616", glow: "rgba(235, 185, 86, 0.25)" },
    { petal: "#97c1b9", center: "#5b8980", glow: "rgba(151, 193, 185, 0.28)" },
    { petal: "#e89f8b", center: "#b85d47", glow: "rgba(232, 159, 139, 0.24)" },
    { petal: "#f0d27a", center: "#b38725", glow: "rgba(240, 210, 122, 0.26)" },
    { petal: "#c4d6b0", center: "#79945d", glow: "rgba(196, 214, 176, 0.25)" },
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedItems() {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const diag = Math.hypot(width, height) * 0.56;

    bokehCircles = Array.from({ length: 34 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = (0.1 + Math.random() * 0.9) * diag;
      const tone = PALETTE[i % PALETTE.length];
      return {
        x: cx + Math.cos(angle) * dist * 0.88,
        y: cy + Math.sin(angle) * dist * 0.65,
        radius: 26 + Math.random() * 68,
        delay: 120 + (dist / diag) * 1450 + Math.random() * 250,
        color: tone.glow,
      };
    });

    flowers = Array.from({ length: 22 }, (_, i) => {
      const ring = i < 4 ? 0.16 : i < 11 ? 0.44 : 0.78;
      const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.5;
      const dist = ring * diag * (0.75 + Math.random() * 0.35);
      const tone = PALETTE[i % PALETTE.length];
      return {
        x: cx + Math.cos(angle) * dist * 0.85,
        y: cy + Math.sin(angle) * dist * 0.6,
        size: 16 + Math.random() * 34,
        petals: i % 2 === 0 ? 8 : 6,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.008,
        delay: i === 0 ? 220 : 280 + ring * 1300 + Math.random() * 320,
        tone,
        softBlur: Math.random() > 0.45,
      };
    });

    pollen = Array.from({ length: 42 }, () => ({
      x: width * (0.25 + Math.random() * 0.5),
      y: height * (0.25 + Math.random() * 0.5),
      vx: (Math.random() - 0.5) * 1.4,
      vy: -0.6 - Math.random() * 1.6,
      r: 1.5 + Math.random() * 2.8,
      color: Math.random() > 0.5 ? "#d8a836" : "#89b77c",
    }));
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function drawFlower(f, scale, globalFade) {
    if (scale <= 0.01) return;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.scale(scale, scale);
    ctx.globalAlpha = (f.softBlur ? 0.58 : 0.85) * globalFade;

    if (f.softBlur) {
      ctx.beginPath();
      ctx.arc(0, 0, f.size * 1.25, 0, Math.PI * 2);
      ctx.fillStyle = f.tone.glow;
      ctx.fill();
    }

    for (let p = 0; p < f.petals; p++) {
      ctx.save();
      ctx.rotate((p / f.petals) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -f.size * 0.56, f.size * 0.34, f.size * 0.54, 0, 0, Math.PI * 2);
      ctx.fillStyle = f.tone.petal;
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, f.size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = f.tone.center;
    ctx.fill();

    ctx.restore();
  }

  function tick(now) {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, width, height);

    // Cream warm paper backdrop
    const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.5, 40, width * 0.5, height * 0.5, Math.max(width, height) * 0.72);
    bgGrad.addColorStop(0, "#faf6ee");
    bgGrad.addColorStop(1, "#ece5d8");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Fade into dark starry reveal around 2.85s - 3.65s
    const fadeOutProgress = Math.max(0, Math.min(1, (elapsed - 2800) / 800));
    const flowerAlpha = 1 - fadeOutProgress * 0.75;

    for (const b of bokehCircles) {
      const p = Math.max(0, Math.min(1, (elapsed - b.delay) / 700));
      if (p <= 0) continue;
      const r = b.radius * (0.4 + 0.6 * easeOutBack(Math.min(p, 1)));
      ctx.save();
      ctx.globalAlpha = Math.min(1, p) * flowerAlpha;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.restore();
    }

    for (const f of flowers) {
      const p = Math.max(0, Math.min(1, (elapsed - f.delay) / 680));
      if (p <= 0) continue;
      f.rot += f.rotSpeed;
      const scale = easeOutBack(p);
      drawFlower(f, scale, flowerAlpha);
    }

    // Center golden pollen burst starting around 2.0s
    if (elapsed > 1950) {
      const burstAlpha = Math.min(1, (elapsed - 1950) / 350) * (1 - fadeOutProgress * 0.5);
      for (const dot of pollen) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        ctx.save();
        ctx.globalAlpha = burstAlpha * 0.85;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.fill();
        ctx.restore();
      }
    }

    // Soft dark cosmic veil fading in at end so Scene 1 transition is seamless
    if (fadeOutProgress > 0) {
      ctx.fillStyle = `rgba(22, 10, 18, ${(fadeOutProgress * 0.92).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }

    rafId = requestAnimationFrame(tick);
  }

  function start() {
    cleanup();
    resize();
    seedItems();
    window.addEventListener("resize", resize);
    startTime = performance.now();
    rafId = requestAnimationFrame(tick);
    completeTimer = setTimeout(() => {
      cleanup();
      onComplete?.();
    }, 3650);
  }

  function cleanup() {
    window.removeEventListener("resize", resize);
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (completeTimer) {
      clearTimeout(completeTimer);
      completeTimer = null;
    }
  }

  return { start, cleanup };
}
