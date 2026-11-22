export function createHeartTreeScene({ section, canvas, hintEl, onComplete }) {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = null;
  let readyTimer = null;
  let startTime = 0;
  let canContinue = false;

  let branches = [];
  let canopyHearts = [];
  let fallingPetals = [];

  const HEART_COLORS = [
    "#ff7b93",
    "#f24968",
    "#ff9fb2",
    "#f8b496",
    "#f5cf76",
    "#ffd9c8",
    "#e53d5c",
    "#ff8c7a",
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function buildGeometry() {
    const isMobile = width < 720;
    const cx = isMobile ? width * 0.52 : width * 0.65;
    const baseY = height + 8;
    const crownCenterY = isMobile ? height * 0.56 : height * 0.43;
    const forkY = isMobile ? height * 0.72 : height * 0.62;
    const crownScale = isMobile ? Math.min(width * 0.011, 5.2) : Math.min(height * 0.0145, width * 0.0086, 11.4);

    // Deterministic organic tree branches
    branches = [
      // Main trunk
      {
        x0: cx - 4,
        y0: baseY,
        cx: cx - 8,
        cy: (baseY + forkY) * 0.5,
        x1: cx,
        y1: forkY,
        w0: Math.max(18, crownScale * 2.5),
        w1: Math.max(11, crownScale * 1.35),
        startDelay: 0,
        dur: 680,
      },
      // Left primary bough
      {
        x0: cx - 2,
        y0: forkY + 12,
        cx: cx - crownScale * 6,
        cy: forkY - crownScale * 8,
        x1: cx - crownScale * 11,
        y1: crownCenterY - crownScale * 3,
        w0: crownScale * 1.15,
        w1: crownScale * 0.35,
        startDelay: 420,
        dur: 620,
      },
      // Right primary bough
      {
        x0: cx + 2,
        y0: forkY + 10,
        cx: cx + crownScale * 6,
        cy: forkY - crownScale * 8,
        x1: cx + crownScale * 11,
        y1: crownCenterY - crownScale * 3,
        w0: crownScale * 1.15,
        w1: crownScale * 0.35,
        startDelay: 440,
        dur: 620,
      },
      // Center-left secondary twig
      {
        x0: cx - crownScale * 4,
        y0: forkY - crownScale * 5,
        cx: cx - crownScale * 4.5,
        cy: crownCenterY - crownScale * 5,
        x1: cx - crownScale * 7.5,
        y1: crownCenterY - crownScale * 10.5,
        w0: crownScale * 0.6,
        w1: crownScale * 0.18,
        startDelay: 720,
        dur: 500,
      },
      // Center-right secondary twig
      {
        x0: cx + crownScale * 4,
        y0: forkY - crownScale * 5,
        cx: cx + crownScale * 4.5,
        cy: crownCenterY - crownScale * 5,
        x1: cx + crownScale * 7.5,
        y1: crownCenterY - crownScale * 10.5,
        w0: crownScale * 0.6,
        w1: crownScale * 0.18,
        startDelay: 740,
        dur: 500,
      },
      // Outer-left twig
      {
        x0: cx - crownScale * 7.5,
        y0: crownCenterY + crownScale * 1.5,
        cx: cx - crownScale * 12,
        cy: crownCenterY - crownScale * 2,
        x1: cx - crownScale * 14,
        y1: crownCenterY - crownScale * 6.5,
        w0: crownScale * 0.45,
        w1: crownScale * 0.15,
        startDelay: 820,
        dur: 460,
      },
      // Outer-right twig
      {
        x0: cx + crownScale * 7.5,
        y0: crownCenterY + crownScale * 1.5,
        cx: cx + crownScale * 12,
        cy: crownCenterY - crownScale * 2,
        x1: cx + crownScale * 14,
        y1: crownCenterY - crownScale * 6.5,
        w0: crownScale * 0.45,
        w1: crownScale * 0.15,
        startDelay: 840,
        dur: 460,
      },
    ];

    // Sample ~330 hearts cleanly inside a crisp heart silhouette
    canopyHearts = [];
    const total = 330;
    for (let i = 0; i < total; i++) {
      // Bias slightly toward perimeter so the heart silhouette is razor sharp
      const t = Math.random() * Math.PI * 2;
      const radialBias = i < 95 ? 0.88 + Math.random() * 0.14 : Math.sqrt(Math.random()) * 0.96;
      const hx = 16 * Math.pow(Math.sin(t), 3) * radialBias;
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * radialBias;

      const x = cx + hx * crownScale;
      const y = crownCenterY + hy * crownScale;
      const distNorm = Math.min(1, Math.hypot(x - cx, y - forkY) / (crownScale * 26));

      canopyHearts.push({
        x,
        y,
        size: (0.68 + Math.random() * 0.65) * Math.max(7.5, crownScale * 1.05),
        rot: (Math.random() - 0.5) * 0.65,
        color: HEART_COLORS[i % HEART_COLORS.length],
        delay: 880 + distNorm * 980 + Math.random() * 340,
        swayPhase: Math.random() * Math.PI * 2,
      });
    }

    fallingPetals = Array.from({ length: 16 }, () => ({
      x: cx + (Math.random() - 0.5) * crownScale * 24,
      y: crownCenterY + (Math.random() - 0.3) * crownScale * 12,
      vy: 0.45 + Math.random() * 0.75,
      vx: (Math.random() - 0.5) * 0.4,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      size: 6 + Math.random() * 5,
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      alpha: 0.6 + Math.random() * 0.3,
    }));
  }

  function drawTaperedBranch(b, p) {
    if (p <= 0) return;
    const steps = Math.max(4, Math.floor(20 * p));
    ctx.strokeStyle = "#5c3b2c";
    ctx.lineCap = "round";

    for (let i = 0; i < steps; i++) {
      const t0 = (i / steps) * p;
      const t1 = ((i + 1) / steps) * p;
      const mt0 = 1 - t0;
      const mt1 = 1 - t1;
      const xA = mt0 * mt0 * b.x0 + 2 * mt0 * t0 * b.cx + t0 * t0 * b.x1;
      const yA = mt0 * mt0 * b.y0 + 2 * mt0 * t0 * b.cy + t0 * t0 * b.y1;
      const xB = mt1 * mt1 * b.x0 + 2 * mt1 * t1 * b.cx + t1 * t1 * b.x1;
      const yB = mt1 * mt1 * b.y0 + 2 * mt1 * t1 * b.cy + t1 * t1 * b.y1;

      ctx.beginPath();
      ctx.moveTo(xA, yA);
      ctx.lineTo(xB, yB);
      ctx.lineWidth = b.w0 + (b.w1 - b.w0) * t0;
      ctx.stroke();
    }
  }

  function drawHeartLeaf(x, y, size, color, rot, alpha = 1) {
    if (size <= 0.4) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.42);
    ctx.bezierCurveTo(-size * 0.72, -size * 0.16, -size * 0.62, -size * 0.88, 0, -size * 0.36);
    ctx.bezierCurveTo(size * 0.62, -size * 0.88, size * 0.72, -size * 0.16, 0, size * 0.42);
    ctx.closePath();
    ctx.fill();
    // Tiny inner specular highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.beginPath();
    ctx.arc(-size * 0.18, -size * 0.28, size * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function tick(now) {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, width, height);

    for (const b of branches) {
      const p = Math.max(0, Math.min(1, (elapsed - b.startDelay) / b.dur));
      drawTaperedBranch(b, p);
    }

    for (const h of canopyHearts) {
      const p = Math.max(0, Math.min(1, (elapsed - h.delay) / 480));
      if (p <= 0) continue;
      const pop = easeOutBack(p);
      const sway = Math.sin(now * 0.0018 + h.swayPhase) * 0.06;
      drawHeartLeaf(h.x, h.y, h.size * pop, h.color, h.rot + sway, 0.94);
    }

    if (elapsed > 2100) {
      for (const fp of fallingPetals) {
        fp.y += fp.vy;
        fp.x += fp.vx + Math.sin(now * 0.002 + fp.y * 0.02) * 0.35;
        fp.rot += fp.rotSpeed;
        if (fp.y > height + 20) {
          fp.y = height * 0.35 + Math.random() * 80;
          fp.x = width * (width < 720 ? 0.5 : 0.65) + (Math.random() - 0.5) * 180;
        }
        drawHeartLeaf(fp.x, fp.y, fp.size, fp.color, fp.rot, fp.alpha);
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function handleAdvance() {
    if (!canContinue) return;
    cleanup();
    onComplete?.();
  }

  function start() {
    cleanup();
    canContinue = false;
    hintEl.classList.remove("is-visible");
    resize();
    buildGeometry();

    window.addEventListener("resize", handleResize);
    section.addEventListener("click", handleAdvance);

    startTime = performance.now();
    rafId = requestAnimationFrame(tick);

    readyTimer = setTimeout(() => {
      canContinue = true;
      hintEl.classList.add("is-visible");
    }, 2400);
  }

  function handleResize() {
    resize();
    buildGeometry();
  }

  function cleanup() {
    window.removeEventListener("resize", handleResize);
    section.removeEventListener("click", handleAdvance);
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (readyTimer) {
      clearTimeout(readyTimer);
      readyTimer = null;
    }
  }

  return { start, cleanup };
}
