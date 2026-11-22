export function createAmbientController(canvas) {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = null;
  let stars = [];
  let sparkles = [];

  function initParticles() {
    const count = Math.min(95, Math.max(55, Math.floor((width * height) / 16000)));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.7 + Math.random() * 1.6,
      alpha: 0.15 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.02,
      vy: -0.05 - Math.random() * 0.14,
      vx: (Math.random() - 0.5) * 0.08,
      tint: Math.random() > 0.45 ? "255, 224, 158" : "255, 240, 232",
    }));

    sparkles = Array.from({ length: 12 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 3.5 + Math.random() * 4.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.018 + Math.random() * 0.022,
      vy: -0.08 - Math.random() * 0.12,
    }));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (stars.length === 0) {
      initParticles();
    }
  }

  function drawFourPointStar(x, y, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = `rgba(248, 206, 114, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.16, -size * 0.16, size, 0);
    ctx.quadraticCurveTo(size * 0.16, size * 0.16, 0, size);
    ctx.quadraticCurveTo(-size * 0.16, size * 0.16, -size, 0);
    ctx.quadraticCurveTo(-size * 0.16, -size * 0.16, 0, -size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, width, height);

    for (const s of stars) {
      s.phase += s.speed;
      s.x += s.vx;
      s.y += s.vy;
      if (s.y < -8) s.y = height + 8;
      if (s.x < -8) s.x = width + 8;
      if (s.x > width + 8) s.x = -8;

      const twinkle = 0.45 + 0.55 * Math.sin(s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.tint}, ${(s.alpha * twinkle).toFixed(3)})`;
      ctx.fill();
    }

    for (const sp of sparkles) {
      sp.phase += sp.speed;
      sp.y += sp.vy;
      if (sp.y < -20) {
        sp.y = height + 20;
        sp.x = Math.random() * width;
      }
      const alpha = Math.max(0.08, 0.48 * (0.5 + 0.5 * Math.sin(sp.phase)));
      drawFourPointStar(sp.x, sp.y, sp.size, alpha);
    }

    rafId = requestAnimationFrame(tick);
  }

  function start() {
    resize();
    window.addEventListener("resize", resize);
    if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function destroy() {
    window.removeEventListener("resize", resize);
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return { start, destroy };
}
