import { soundEngine } from "../audio.js";

export function createCupidBowScene({ section, canvas, heartEl, hintEl, revealEl, onComplete }) {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = null;
  let timers = [];

  // Interaction state
  let isPulling = false;
  let pullStartX = 0;
  let pullStartY = 0;
  let pullAmount = 0; // 0..1
  let pullOffset = { x: 0, y: 0 };
  let phase = "ready"; // ready | flying | hit | done

  // Flying arrow & particles
  let arrowPos = { x: 0, y: 0, angle: 0 };
  let arrowStart = { x: 0, y: 0 };
  let arrowTarget = { x: 0, y: 0 };
  let flightProgress = 0;
  let stringSpring = 0;
  let stringSpringVel = 0;
  let burstHearts = [];

  function getLayout() {
    const bowX = Math.max(84, width * 0.21);
    const bowY = Math.min(height - 96, height * 0.72);
    const targetX = width * 0.5;
    const targetY = height * 0.41;
    const baseAngle = Math.atan2(targetY - bowY, targetX - bowX);
    return { bowX, bowY, targetX, targetY, baseAngle };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawMiniHeart(x, y, size, color, alpha, rot = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.35);
    ctx.bezierCurveTo(-size * 0.65, -size * 0.25, -size * 0.55, -size * 0.85, 0, -size * 0.45);
    ctx.bezierCurveTo(size * 0.55, -size * 0.85, size * 0.65, -size * 0.25, 0, size * 0.35);
    ctx.fill();
    ctx.restore();
  }

  function drawArrow(x, y, angle, length = 76) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Wooden/ivory shaft
    ctx.strokeStyle = "#4d352d";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-length * 0.65, 0);
    ctx.lineTo(length * 0.35, 0);
    ctx.stroke();

    // Fletching feathers at tail
    ctx.fillStyle = "#d93b52";
    ctx.beginPath();
    ctx.moveTo(-length * 0.65, 0);
    ctx.lineTo(-length * 0.78, -6);
    ctx.lineTo(-length * 0.52, -2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-length * 0.65, 0);
    ctx.lineTo(-length * 0.78, 6);
    ctx.lineTo(-length * 0.52, 2);
    ctx.closePath();
    ctx.fill();

    // Heart-shaped tip at front
    ctx.save();
    ctx.translate(length * 0.38, 0);
    ctx.rotate(Math.PI / 2);
    drawMiniHeart(0, 0, 12, "#e32948", 1);
    ctx.restore();

    ctx.restore();
  }

  function drawBow(layout) {
    const { bowX, bowY, baseAngle } = layout;
    const pullDist = pullAmount * 36;
    const flex = pullAmount * 7;

    ctx.save();
    ctx.translate(bowX, bowY);
    ctx.rotate(baseAngle);

    // Bowstring (with damped release vibration)
    const stringPullX = phase === "ready" ? -12 - pullDist : -12 + stringSpring;
    ctx.strokeStyle = "rgba(85, 65, 60, 0.72)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-12 + flex * 0.5, -42 + flex);
    ctx.lineTo(stringPullX, 0);
    ctx.lineTo(-12 + flex * 0.5, 42 - flex);
    ctx.stroke();

    // Curved dark-wood Cupid bow limbs
    ctx.strokeStyle = "#2b1d1b";
    ctx.lineWidth = 4.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-12 + flex * 0.5, -42 + flex);
    ctx.quadraticCurveTo(18, -22, 10, 0);
    ctx.quadraticCurveTo(18, 22, -12 + flex * 0.5, 42 - flex);
    ctx.stroke();

    // Subtle gold grip accent
    ctx.strokeStyle = "#d3a153";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(10.5, -7);
    ctx.lineTo(10.5, 7);
    ctx.stroke();

    ctx.restore();

    // Loaded arrow when ready
    if (phase === "ready") {
      const knockX = bowX + Math.cos(baseAngle) * (12 - pullDist);
      const knockY = bowY + Math.sin(baseAngle) * (12 - pullDist);
      drawArrow(knockX, knockY, baseAngle, 74);
    }
  }

  function launchArrow() {
    if (phase !== "ready") return;
    const layout = getLayout();
    phase = "flying";
    isPulling = false;
    canvas.classList.remove("is-pulling");
    hintEl.style.opacity = "0";
    soundEngine.playArrowRelease();

    const pullDist = pullAmount * 36;
    arrowStart = {
      x: layout.bowX + Math.cos(layout.baseAngle) * (12 - pullDist),
      y: layout.bowY + Math.sin(layout.baseAngle) * (12 - pullDist),
    };
    arrowTarget = {
      x: layout.targetX - Math.cos(layout.baseAngle) * 16,
      y: layout.targetY - Math.sin(layout.baseAngle) * 16,
    };
    arrowPos = { ...arrowStart, angle: layout.baseAngle };
    flightProgress = 0;
    stringSpring = -pullDist;
    stringSpringVel = 24;
    pullAmount = 0;
  }

  function triggerHeartHit(layout) {
    phase = "hit";
    soundEngine.playHeartHit();
    heartEl.classList.add("is-struck");

    // Burst mini floating hearts
    burstHearts = Array.from({ length: 18 }, (_, i) => {
      const ang = (i / 18) * Math.PI * 2 + Math.random() * 0.35;
      const speed = 1.6 + Math.random() * 3.4;
      return {
        x: layout.targetX,
        y: layout.targetY,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 1.2,
        size: 7 + Math.random() * 9,
        alpha: 1,
        rot: (Math.random() - 0.5) * 0.6,
        color: i % 3 === 0 ? "#ff8da1" : i % 2 === 0 ? "#e83051" : "#f5ba5e",
      };
    });

    const t1 = setTimeout(() => {
      revealEl.classList.add("is-expanding");
    }, 460);

    const t2 = setTimeout(() => {
      phase = "done";
      cleanup();
      onComplete?.();
    }, 1150);

    timers.push(t1, t2);
  }

  function tick() {
    const layout = getLayout();
    ctx.clearRect(0, 0, width, height);

    // Damped spring on bowstring after launch
    if (phase !== "ready") {
      stringSpringVel += -stringSpring * 0.34;
      stringSpringVel *= 0.78;
      stringSpring += stringSpringVel;
    }

    drawBow(layout);

    if (phase === "flying") {
      flightProgress = Math.min(1, flightProgress + 0.068);
      const eased = 1 - Math.pow(1 - flightProgress, 2.2);
      const arcLift = Math.sin(flightProgress * Math.PI) * -22;
      arrowPos.x = arrowStart.x + (arrowTarget.x - arrowStart.x) * eased;
      arrowPos.y = arrowStart.y + (arrowTarget.y - arrowStart.y) * eased + arcLift;
      arrowPos.angle = layout.baseAngle + Math.cos(flightProgress * Math.PI) * -0.14;
      drawArrow(arrowPos.x, arrowPos.y, arrowPos.angle, 74);

      if (flightProgress >= 1) {
        triggerHeartHit(layout);
      }
    } else if (phase === "hit" || phase === "done") {
      // Keep arrow embedded in heart
      drawArrow(arrowTarget.x, arrowTarget.y, layout.baseAngle, 72);
    }

    // Mini burst hearts
    for (const h of burstHearts) {
      h.x += h.vx;
      h.y += h.vy;
      h.vy += 0.04;
      h.alpha = Math.max(0, h.alpha - 0.014);
      if (h.alpha > 0) {
        drawMiniHeart(h.x, h.y, h.size, h.color, h.alpha, h.rot);
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function onPointerDown(e) {
    if (phase !== "ready") return;
    isPulling = true;
    pullStartX = e.clientX;
    pullStartY = e.clientY;
    pullAmount = 0.14;
    canvas.classList.add("is-pulling");
  }

  function onPointerMove(e) {
    if (!isPulling || phase !== "ready") return;
    const dx = e.clientX - pullStartX;
    const dy = e.clientY - pullStartY;
    const dist = Math.hypot(dx, dy);
    pullAmount = Math.max(0.14, Math.min(1, dist / 95));
    pullOffset = { x: dx, y: dy };
  }

  function onPointerUp() {
    if (!isPulling || phase !== "ready") return;
    isPulling = false;
    canvas.classList.remove("is-pulling");

    // Smoothly auto-shoot even on a quick click/tap so both drag & tap feel responsive
    if (pullAmount < 0.22) {
      pullAmount = 0.72;
      const t = setTimeout(() => launchArrow(), 90);
      timers.push(t);
    } else {
      launchArrow();
    }
  }

  function start() {
    cleanup();
    phase = "ready";
    pullAmount = 0;
    stringSpring = 0;
    stringSpringVel = 0;
    burstHearts = [];
    heartEl.classList.remove("is-struck");
    revealEl.classList.remove("is-expanding");
    hintEl.style.opacity = "1";

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    rafId = requestAnimationFrame(tick);
  }

  function cleanup() {
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  }

  return { start, cleanup };
}
