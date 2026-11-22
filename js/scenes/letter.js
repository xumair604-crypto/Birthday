import { soundEngine } from "../audio.js";
import { CONFIG } from "../config.js";

export function createLetterScene({ els, onComplete }) {
  let timers = [];
  let typingTimer = null;
  let isOpened = false;
  let isTyping = false;
  let typingDone = false;

  const segments = [
    { el: els.greeting, text: CONFIG.letter.greeting, speed: 38, pauseAfter: 260 },
    { el: els.opening, text: CONFIG.letter.opening, speed: 36, pauseAfter: 320 },
    { el: els.body, text: CONFIG.letter.body, speed: 22, pauseAfter: 340 },
    { el: els.closing, text: CONFIG.letter.closing, speed: 34, pauseAfter: 180 },
    { el: els.signature, text: CONFIG.letter.signature, speed: 42, pauseAfter: 200 },
  ];

  function clearTyping() {
    if (typingTimer) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }
  }

  function resetVisuals() {
    isOpened = false;
    isTyping = false;
    typingDone = false;
    els.header.classList.remove("is-hidden");
    els.envelopeStage.classList.remove("is-opening", "is-hidden");
    els.cardWrap.classList.remove("is-visible");
    els.continueBtn.classList.remove("is-visible");
    segments.forEach((s) => {
      s.el.textContent = "";
    });
  }

  function finishTypingImmediately() {
    if (!isTyping || typingDone) return;
    clearTyping();
    isTyping = false;
    typingDone = true;
    segments.forEach((s) => {
      s.el.textContent = s.text;
    });
    els.continueBtn.classList.add("is-visible");
  }

  function runTypewriter(segIdx = 0, charIdx = 0) {
    if (segIdx >= segments.length) {
      isTyping = false;
      typingDone = true;
      els.continueBtn.classList.add("is-visible");
      return;
    }

    const seg = segments[segIdx];
    const chars = Array.from(seg.text); // Handles multi-byte emojis cleanly

    if (charIdx <= chars.length) {
      seg.el.textContent = chars.slice(0, charIdx).join("");
      const ch = chars[charIdx - 1] || "";
      const delay = ch === "." || ch === "," || ch === "!" ? seg.speed * 4 : seg.speed;
      typingTimer = setTimeout(() => runTypewriter(segIdx, charIdx + 1), delay);
    } else {
      typingTimer = setTimeout(() => runTypewriter(segIdx + 1, 0), seg.pauseAfter);
    }
  }

  function handleEnvelopeOpen() {
    if (isOpened) return;
    isOpened = true;
    soundEngine.playEnvelopeOpen();
    els.envelopeStage.classList.add("is-opening");

    const t1 = setTimeout(() => {
      els.header.classList.add("is-hidden");
      els.envelopeStage.classList.add("is-hidden");
      els.cardWrap.classList.add("is-visible");
      isTyping = true;
      runTypewriter(0, 0);
    }, 680);

    timers.push(t1);
  }

  function handleContinue() {
    cleanup();
    onComplete?.();
  }

  function start() {
    cleanup();
    resetVisuals();
    els.envelopeBtn.addEventListener("click", handleEnvelopeOpen);
    els.card.addEventListener("click", finishTypingImmediately);
    els.continueBtn.addEventListener("click", handleContinue);
  }

  function cleanup() {
    els.envelopeBtn.removeEventListener("click", handleEnvelopeOpen);
    els.card.removeEventListener("click", finishTypingImmediately);
    els.continueBtn.removeEventListener("click", handleContinue);
    clearTyping();
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  }

  return { start, cleanup };
}
