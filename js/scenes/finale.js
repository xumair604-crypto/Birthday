import { soundEngine } from "../audio.js";

export function createFinaleScene({ section, canvas, els, onReplay }) {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = null;
  let launchTimer = null;
  let heartTimers = [];
  let rockets = [];
  let sparks = [];
  let confetti = [];
  let accepted = false;

  const FIREWORK_PALETTES = [
    ["#f6c95c", "#ffe69e", "#ffffff"],
    ["#ff7797", "#ffb3c7", "#ffe4ec"],
    ["#4ce0db", "#9cf7f3", "#ffffff"],
    ["#c2a4ff", "#e2d4ff", "#fff5ff"],
    ["#ff9b5e", "#ffd099", "#fff4d9"],
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnConfettiShower(count = 90) {
    const colors = ["#49d5d0", "#ff7c97", "#f6c95c", "#b59bf2", "#ff9e64", "#ffffff"];
    const cx = width * 0.5;
    const cy = height * 0.44;
    const batch = Array.from({ length: count }, () => {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const spd = 2.6 + Math.random() * 6.8;
      return {
        x: cx + (Math.random() - 0.5) * 160,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.4,
        w: 4 + Math.random() * 5,
        h: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.18,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
      };
    });
    confetti.push(...batch);
  }

  function createBurst(x, y, playSound = false) {
    const palette = FIREWORK_PALETTES[Math.floor(Math.random() * FIREWORK_PALETTES.length)];
    const count = 48;
    if (playSound) soundEngine.playFireworkBurst();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.14;
      const speed = 1.8 + Math.random() * 4.4;
      sparks.push({
        x,
        y,
        px: x,
        py: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: palette[i % palette.length],
        alpha: 1,
        decay: 0.011 + Math.random() * 0.01,
        size: 1.6 + Math.random() * 1.8,
      });
    }
  }

  function createHeartBurst(x, y, scale = 0.25) {
    const colors = ["#ff7797", "#ffb3c7", "#f6c95c", "#ffe69e", "#ffffff"];
    const points = 42;
    soundEngine.playFireworkBurst();
    for (let i = 0; i < points; i++) {
      const t = (i / points) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(t), 3) * scale;
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale;
      sparks.push({
        x,
        y,
        px: x,
        py: y,
        vx: hx,
        vy: hy,
        color: colors[i % colors.length],
        alpha: 1,
        decay: 0.0085 + Math.random() * 0.006,
        size: 2.2 + Math.random() * 1.5,
      });
    }
  }

  function triggerHeartFireworks() {
    const spots = [
      [width * 0.22, height * 0.26, 0.28],
      [width * 0.78, height * 0.24, 0.28],
      [width * 0.5, height * 0.16, 0.3],
      [width * 0.3, height * 0.56, 0.24],
      [width * 0.72, height * 0.54, 0.24],
    ];
    spots.forEach(([sx, sy, sc], idx) => {
      const t = setTimeout(() => createHeartBurst(sx, sy, sc), idx * 220);
      heartTimers.push(t);
    });
    spawnConfettiShower(130);
  }

  function launchRocket(targetX, targetY) {
    const startX = targetX ?? width * (0.14 + Math.random() * 0.72);
    const burstY = targetY ?? height * (0.14 + Math.random() * 0.32);
    rockets.push({
      x: startX,
      y: height + 10,
      px: startX,
      py: height + 10,
      vx: (Math.random() - 0.5) * 1.4,
      vy: -9.2 - Math.random() * 2.8,
      burstY,
      color: "#ffd98e",
    });
  }

  function scheduleAutoRockets() {
    launchRocket();
    launchTimer = setTimeout(() => {
      if (Math.random() > 0.3) launchRocket();
      scheduleAutoRockets();
    }, 820 + Math.random() * 620);
  }

  function tick() {
    ctx.clearRect(0, 0, width, height);

    const nextRockets = [];
    for (const r of rockets) {
      r.px = r.x;
      r.py = r.y;
      r.x += r.vx;
      r.y += r.vy;
      r.vy += 0.14;

      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(r.px, r.py);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();

      if (r.y <= r.burstY || r.vy >= -0.8) {
        if (accepted && Math.random() > 0.45) {
          createHeartBurst(r.x, r.y, 0.22);
        } else {
          createBurst(r.x, r.y, false);
        }
      } else {
        nextRockets.push(r);
      }
    }
    rockets = nextRockets;

    sparks = sparks.filter((s) => s.alpha > 0.03);
    for (const s of sparks) {
      s.px = s.x;
      s.py = s.y;
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.055;
      s.vx *= 0.982;
      s.alpha -= s.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.px, s.py);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      ctx.restore();
    }

    confetti = confetti.filter((c) => c.alpha > 0.02 && c.y < height + 30);
    for (const c of confetti) {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.095;
      c.vx *= 0.99;
      c.rot += c.rotSpeed;
      if (c.y > height * 0.72) c.alpha -= 0.015;

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.globalAlpha = Math.max(0, c.alpha);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }

    rafId = requestAnimationFrame(tick);
  }

  function handleCanvasClick(e) {
    if (e.target.closest("button") || e.target.closest(".proposal-card")) return;
    if (accepted) {
      createHeartBurst(e.clientX, e.clientY, 0.24);
    } else {
      createBurst(e.clientX, e.clientY, true);
    }
  }

  function handleProposalYes(e) {
    e.stopPropagation();
    if (accepted) return;
    accepted = true;
    soundEngine.playCandleIgnite();
    els.proposalActions.classList.add("is-hidden");
    els.proposalResponse.textContent =
      "“You just made 8 years of waiting the happiest moment of my life. Happy Birthday, Karuna! 💛✨”";
    els.proposalResponse.classList.add("is-visible", "is-accepted");
    els.proposalCard.classList.add("is-accepted");
    triggerHeartFireworks();
  }

  function handleProposalBlush(e) {
    e.stopPropagation();
    soundEngine.playSwipe();
    els.proposalResponse.textContent =
      "“Take all the time you need — after 8 years, your smile is still my favorite answer 🤍”";
    els.proposalResponse.classList.add("is-visible");
  }

  function handleReplayClick(e) {
    e.stopPropagation();
    cleanup();
    onReplay?.();
  }

  function resetProposalUI() {
    accepted = false;
    els.proposalCard.classList.remove("is-accepted");
    els.proposalActions.classList.remove("is-hidden");
    els.proposalResponse.textContent = "";
    els.proposalResponse.classList.remove("is-visible", "is-accepted");
  }

  function start() {
    cleanup();
    resize();
    resetProposalUI();
    rockets = [];
    sparks = [];
    confetti = [];

    window.addEventListener("resize", resize);
    section.addEventListener("click", handleCanvasClick);
    els.yesBtn.addEventListener("click", handleProposalYes);
    els.blushBtn.addEventListener("click", handleProposalBlush);
    els.replayBtn.addEventListener("click", handleReplayClick);

    spawnConfettiShower(85);
    createBurst(width * 0.25, height * 0.24, true);
    createBurst(width * 0.75, height * 0.22, false);
    scheduleAutoRockets();
    rafId = requestAnimationFrame(tick);
  }

  function cleanup() {
    window.removeEventListener("resize", resize);
    section.removeEventListener("click", handleCanvasClick);
    els.yesBtn.removeEventListener("click", handleProposalYes);
    els.blushBtn.removeEventListener("click", handleProposalBlush);
    els.replayBtn.removeEventListener("click", handleReplayClick);
    if (launchTimer) {
      clearTimeout(launchTimer);
      launchTimer = null;
    }
    heartTimers.forEach((t) => clearTimeout(t));
    heartTimers = [];
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return { start, cleanup };
}
