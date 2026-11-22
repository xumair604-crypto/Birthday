import { soundEngine } from "../audio.js";
import { CONFIG } from "../config.js";

export function createBalloonsScene({ section, confettiCanvas, rackEl, stackEl, closingEl, onComplete }) {
  const ctx = confettiCanvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = null;
  let timers = [];
  let particles = [];
  let poppedCount = 0;
  let allPopped = false;

  const VERTICAL_OFFSETS = [0, 32, 14, -4, 24];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    confettiCanvas.width = Math.floor(width * dpr);
    confettiCanvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnPopBurst(cx, cy, colorSet) {
    const colors = [colorSet.base, colorSet.light, "#f6c95c", "#ffffff"];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 2.2 + Math.random() * 5.2;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 3.5 + Math.random() * 4.5,
        color: colors[i % colors.length],
        alpha: 1,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
      });
    }
    if (!rafId) {
      rafId = requestAnimationFrame(tickParticles);
    }
  }

  function tickParticles() {
    ctx.clearRect(0, 0, width, height);
    particles = particles.filter((p) => p.alpha > 0.02);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16;
      p.vx *= 0.985;
      p.rot += p.rotSpeed;
      p.alpha *= 0.965;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75);
      ctx.restore();
    }
    if (particles.length > 0) {
      rafId = requestAnimationFrame(tickParticles);
    } else {
      rafId = null;
    }
  }

  function buildBalloons() {
    rackEl.innerHTML = "";
    rackEl.classList.remove("is-collapsed");
    stackEl.innerHTML = "";
    closingEl.classList.remove("is-visible");
    poppedCount = 0;
    allPopped = false;
    particles = [];
    ctx.clearRect(0, 0, width, height);

    CONFIG.balloonColors.forEach((b, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "balloon-item";
      btn.setAttribute("aria-label", `Pop balloon ${idx + 1}`);
      btn.style.marginTop = `${VERTICAL_OFFSETS[idx]}px`;
      btn.style.setProperty("--bob-dur", `${3.2 + (idx % 3) * 0.45}s`);
      btn.style.setProperty("--bob-delay", `${idx * 0.28}s`);

      const gradId = `bGrad-${idx}`;
      btn.innerHTML = `
        <svg class="balloon-svg" viewBox="0 0 64 148" fill="none">
          <defs>
            <radialGradient id="${gradId}" cx="34%" cy="28%" r="72%">
              <stop offset="0%" stop-color="${b.light}" />
              <stop offset="42%" stop-color="${b.base}" />
              <stop offset="100%" stop-color="${b.dark}" />
            </radialGradient>
          </defs>
          <path class="balloon-string-path" d="M32 76 Q 27 96, 34 114 T 30 144" stroke="${b.string}" stroke-width="1.5" stroke-opacity="0.7" fill="none" />
          <path d="M29 74 L35 74 L32 79 Z" fill="${b.dark}" />
          <ellipse cx="32" cy="40" rx="26" ry="33" fill="url(#${gradId})" />
          <ellipse cx="22" cy="24" rx="5.5" ry="9.5" transform="rotate(-24 22 24)" fill="#ffffff" fill-opacity="0.42" />
        </svg>
      `;

      btn.addEventListener("click", () => handlePop(btn, b));
      rackEl.appendChild(btn);
    });
  }

  function appendReasonCard(index) {
    const card = document.createElement("div");
    card.className = "reason-card";
    card.innerHTML = `
      <p class="reason-tag">REASON NO. ${index + 1} ✨</p>
      <p class="reason-text">${CONFIG.reasons[index]}</p>
      <span class="reason-spark" aria-hidden="true">✦</span>
    `;
    stackEl.appendChild(card);
  }

  function handlePop(btn, colorSet) {
    if (btn.classList.contains("is-popped")) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + 42;

    btn.classList.add("is-popped");
    soundEngine.playBalloonPop(poppedCount);
    spawnPopBurst(cx, cy, colorSet);

    appendReasonCard(poppedCount);
    poppedCount += 1;

    const collapseTimer = setTimeout(() => {
      btn.classList.add("is-gone");
    }, 260);
    timers.push(collapseTimer);

    if (poppedCount >= CONFIG.reasons.length && !allPopped) {
      allPopped = true;
      const t1 = setTimeout(() => {
        rackEl.classList.add("is-collapsed");
        closingEl.classList.add("is-visible");
      }, 360);

      const t2 = setTimeout(() => {
        cleanup();
        onComplete?.();
      }, 2800);

      timers.push(t1, t2);
    }
  }

  function handleEarlyAdvance(e) {
    if (!allPopped) return;
    if (e.target.closest(".balloon-item")) return;
    cleanup();
    onComplete?.();
  }

  function start() {
    cleanup();
    resize();
    buildBalloons();
    window.addEventListener("resize", resize);
    section.addEventListener("click", handleEarlyAdvance);
  }

  function cleanup() {
    window.removeEventListener("resize", resize);
    section.removeEventListener("click", handleEarlyAdvance);
    timers.forEach((t) => clearTimeout(t));
    timers = [];
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return { start, cleanup };
}
