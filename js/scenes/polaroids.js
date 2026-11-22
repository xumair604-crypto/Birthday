import { soundEngine } from "../audio.js";
import { CONFIG } from "../config.js";

export function createPolaroidsScene({ stageEl, trackEl, bulbsEl, dotsEl, continueBtn, onComplete }) {
  let activeIndex = 0;
  let cards = [];
  let dots = [];
  let isDragging = false;
  let startX = 0;
  let dragDelta = 0;
  let hasSwiped = false;
  let fallbackTimer = null;
  let wheelCooldown = false;

  function buildFairyLights() {
    bulbsEl.innerHTML = "";
    const count = 21;
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count;
      const pct = u * 100;
      const y = 16 + Math.sin(u * Math.PI) * 18;
      const bulb = document.createElement("span");
      bulb.className = "fairy-bulb";
      bulb.style.left = `${pct}%`;
      bulb.style.top = `${y}px`;
      bulb.style.setProperty("--twinkle-dur", `${1.7 + (i % 4) * 0.45}s`);
      bulb.style.setProperty("--twinkle-delay", `${(i % 5) * 0.3}s`);
      bulbsEl.appendChild(bulb);
    }
  }

  function buildCards() {
    trackEl.innerHTML = "";
    dotsEl.innerHTML = "";
    cards = [];
    dots = [];
    activeIndex = 0;
    hasSwiped = false;
    continueBtn.classList.remove("is-visible");

    CONFIG.memories.forEach((mem, idx) => {
      const card = document.createElement("div");
      card.className = "polaroid-card";
      const fitStyle = `object-fit: ${mem.fit || "cover"}; object-position: ${mem.objectPosition || "center center"};`;
      const wrapBg = mem.bg ? `style="background: ${mem.bg};"` : "";

      card.innerHTML = `
        <div class="polaroid-pin" aria-hidden="true"></div>
        <div class="polaroid-photo-wrap" ${wrapBg}>
          <img class="polaroid-photo" src="${mem.image}" alt="${mem.caption}" style="${fitStyle}" draggable="false" />
        </div>
        <p class="polaroid-caption">${mem.caption}</p>
        <span class="polaroid-sparkle" aria-hidden="true">✦</span>
      `;
      card.addEventListener("click", () => {
        if (Math.abs(dragDelta) > 10) return;
        if (idx !== activeIndex) {
          setActive(idx);
        }
      });
      trackEl.appendChild(card);
      cards.push(card);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "memory-dot";
      dot.setAttribute("aria-label", `Memory ${idx + 1}`);
      dot.addEventListener("click", () => setActive(idx));
      dotsEl.appendChild(dot);
      dots.push(dot);
    });

    layoutCards(0);
  }

  function layoutCards(extraOffsetPx = 0) {
    const isNarrow = window.innerWidth < 720;
    const spacing = isNarrow ? 215 : 272;

    cards.forEach((card, idx) => {
      const diff = idx - activeIndex;
      const mem = CONFIG.memories[idx];
      const absDiff = Math.abs(diff);

      const tx = diff * spacing + extraOffsetPx;
      const ty = mem.offsetY + absDiff * 14;
      const scale = diff === 0 ? 1 : absDiff === 1 ? 0.87 : 0.75;
      const rot = mem.tilt + diff * 2.5;
      const opacity = diff === 0 ? 1 : absDiff === 1 ? 0.82 : 0.25;
      const zIndex = 10 - absDiff;

      card.classList.toggle("is-center", diff === 0);
      card.style.zIndex = String(zIndex);
      card.style.opacity = String(opacity);
      card.style.filter = diff === 0 ? "none" : "brightness(0.84)";
      card.style.transform = `translate3d(calc(-50% + ${tx}px), ${ty}px, 0) rotate(${rot}deg) scale(${scale})`;
      card.style.pointerEvents = absDiff <= 2 ? "auto" : "none";
    });

    dots.forEach((dot, idx) => {
      dot.classList.toggle("is-active", idx === activeIndex);
    });
  }

  function revealContinueIfReady() {
    if (hasSwiped) {
      continueBtn.classList.add("is-visible");
    }
  }

  function setActive(nextIdx) {
    const clamped = Math.max(0, Math.min(CONFIG.memories.length - 1, nextIdx));
    if (clamped !== activeIndex) {
      activeIndex = clamped;
      hasSwiped = true;
      soundEngine.playSwipe();
      revealContinueIfReady();
    }
    layoutCards(0);
  }

  function onPointerDown(e) {
    if (e.target.closest(".memory-dot") || e.target.closest("#memory-continue-btn")) return;
    isDragging = true;
    startX = e.clientX;
    dragDelta = 0;
    stageEl.classList.add("is-dragging");
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    dragDelta = e.clientX - startX;
    layoutCards(dragDelta * 0.55);
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    stageEl.classList.remove("is-dragging");

    if (dragDelta < -42 && activeIndex < CONFIG.memories.length - 1) {
      setActive(activeIndex + 1);
    } else if (dragDelta > 42 && activeIndex > 0) {
      setActive(activeIndex - 1);
    } else {
      layoutCards(0);
    }
    setTimeout(() => {
      dragDelta = 0;
    }, 30);
  }

  function onWheel(e) {
    if (wheelCooldown) return;
    const dominant = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(dominant) < 16) return;
    wheelCooldown = true;
    if (dominant > 0 && activeIndex < CONFIG.memories.length - 1) {
      setActive(activeIndex + 1);
    } else if (dominant < 0 && activeIndex > 0) {
      setActive(activeIndex - 1);
    }
    setTimeout(() => {
      wheelCooldown = false;
    }, 320);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowRight") setActive(activeIndex + 1);
    if (e.key === "ArrowLeft") setActive(activeIndex - 1);
  }

  function onContinue() {
    cleanup();
    onComplete?.();
  }

  function onResize() {
    layoutCards(0);
  }

  function start() {
    cleanup();
    buildFairyLights();
    buildCards();

    stageEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    stageEl.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    continueBtn.addEventListener("click", onContinue);

    fallbackTimer = setTimeout(() => {
      continueBtn.classList.add("is-visible");
    }, 2200);
  }

  function cleanup() {
    stageEl.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    stageEl.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", onResize);
    continueBtn.removeEventListener("click", onContinue);
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
  }

  return { start, cleanup };
}
