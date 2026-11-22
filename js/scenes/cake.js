import { soundEngine } from "../audio.js";
import { CONFIG } from "../config.js";

export function createCakeScene({ section, confettiCanvas, els, onComplete }) {
  const ctx = confettiCanvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = null;
  let timers = [];
  let confetti = [];
  let canContinue = false;

  const CONFETTI_COLORS = ["#f6c95c", "#f3849b", "#59d8d3", "#b89cf0", "#ff9e68", "#fff5ea"];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    confettiCanvas.width = Math.floor(width * dpr);
    confettiCanvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnConfettiBurst() {
    confetti = Array.from({ length: 120 }, () => ({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.4,
      w: 5 + Math.random() * 6,
      h: 7 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 2.4,
      vy: 1.6 + Math.random() * 2.6,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.14,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      alpha: 0.9,
    }));
  }

  function tickConfetti() {
    ctx.clearRect(0, 0, width, height);
    for (const c of confetti) {
      c.x += c.vx + Math.sin(c.y * 0.025) * 0.4;
      c.y += c.vy;
      c.rot += c.rotSpeed;
      if (c.y > height + 20) {
        c.y = -15;
        c.x = Math.random() * width;
      }
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.globalAlpha = c.alpha;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
    rafId = requestAnimationFrame(tickConfetti);
  }

  function resetVisuals() {
    els.beam.classList.remove("is-dropping");
    els.plate.classList.remove("is-shown");
    els.layerBottom.classList.remove("is-shown");
    els.filling.classList.remove("is-shown");
    els.layerTop.classList.remove("is-shown");
    els.icing.classList.remove("is-shown");
    els.candle.classList.remove("is-shown");
    els.flameWrap.classList.remove("is-lit");
    els.warmGlow.classList.remove("is-lit");

    els.statusTitle.classList.remove("is-celebrate");
    els.statusTitle.textContent = "Baking something sweet...";
    els.statusSub.textContent = "";
    els.statusSub.classList.remove("is-visible");
    els.tapHint.classList.remove("is-visible");
    confetti = [];
    ctx.clearRect(0, 0, width, height);
  }

  function handleAdvance() {
    if (!canContinue) return;
    cleanup();
    onComplete?.();
  }

  function start() {
    cleanup();
    canContinue = false;
    resize();
    resetVisuals();

    window.addEventListener("resize", resize);
    section.addEventListener("click", handleAdvance);

    const schedule = [
      [150, () => els.beam.classList.add("is-dropping")],
      [350, () => els.plate.classList.add("is-shown")],
      [680, () => { els.layerBottom.classList.add("is-shown"); soundEngine.playCakeDrop(); }],
      [1050, () => els.filling.classList.add("is-shown")],
      [1320, () => { els.layerTop.classList.add("is-shown"); soundEngine.playCakeDrop(); }],
      [1720, () => els.icing.classList.add("is-shown")],
      [2120, () => els.candle.classList.add("is-shown")],
      [2520, () => {
        els.flameWrap.classList.add("is-lit");
        els.warmGlow.classList.add("is-lit");
        els.statusTitle.textContent = `Happy Birthday, ${CONFIG.recipient}!`;
        els.statusTitle.classList.add("is-celebrate");
        els.statusSub.textContent = "Make a wish ✨";
        els.statusSub.classList.add("is-visible");
        soundEngine.playCandleIgnite();
        spawnConfettiBurst();
        if (!rafId) rafId = requestAnimationFrame(tickConfetti);
      }],
      [3200, () => {
        canContinue = true;
        els.tapHint.classList.add("is-visible");
      }],
    ];

    timers = schedule.map(([ms, fn]) => setTimeout(fn, ms));
  }

  function cleanup() {
    window.removeEventListener("resize", resize);
    section.removeEventListener("click", handleAdvance);
    timers.forEach((t) => clearTimeout(t));
    timers = [];
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return { start, cleanup };
}
