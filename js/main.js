import { CONFIG } from "./config.js";
import { soundEngine } from "./audio.js";
import { createAmbientController } from "./scenes/ambient.js";
import { createFloralIntroScene } from "./scenes/floralIntro.js";
import { createCupidBowScene } from "./scenes/cupidBow.js";
import { createHeartTreeScene } from "./scenes/heartTree.js";
import { createCakeScene } from "./scenes/cake.js";
import { createBalloonsScene } from "./scenes/balloons.js";
import { createPolaroidsScene } from "./scenes/polaroids.js";
import { createPoetryVideosScene } from "./scenes/poetryVideos.js";
import { createLetterScene } from "./scenes/letter.js";
import { createFinaleScene } from "./scenes/finale.js";

function hydrateCopy() {
  document.title = `For ${CONFIG.recipient} — ${CONFIG.birthdayDate} ❤️`;

  document.querySelectorAll("[data-recipient]").forEach((el) => {
    const keepExclamation = el.textContent.trim().endsWith("!");
    el.textContent = keepExclamation ? `${CONFIG.recipient}!` : CONFIG.recipient;
  });

  document.querySelectorAll("[data-birthday-date]").forEach((el) => {
    el.textContent = CONFIG.birthdayDate;
  });

  document.querySelectorAll("[data-years]").forEach((el) => {
    el.textContent = String(CONFIG.yearsLoved);
  });

  const waxLetter = document.querySelector(".wax-letter");
  if (waxLetter) {
    waxLetter.textContent = CONFIG.recipient.charAt(0).toUpperCase();
  }
}

hydrateCopy();

const appEl = document.getElementById("app");
const sections = Array.from({ length: 11 }, (_, i) => document.getElementById(`scene-${i}`));
let currentScene = 0;
let sceneTimers = [];

const ambient = createAmbientController(document.getElementById("ambient-canvas"));
ambient.start();

let controllers = {};

function clearSceneTimers() {
  sceneTimers.forEach((t) => clearTimeout(t));
  sceneTimers = [];
}

function goToScene(index) {
  clearSceneTimers();

  if (controllers[currentScene]?.cleanup) {
    controllers[currentScene].cleanup();
  }

  sections.forEach((sec, i) => {
    sec.classList.toggle("is-active", i === index);
  });

  currentScene = index;
  appEl.dataset.scene = String(index);

  if (controllers[index]?.start) {
    controllers[index].start();
  }

  if (index === 3) {
    const t = setTimeout(() => goToScene(4), 2950);
    sceneTimers.push(t);
  }
}

function replayAll() {
  clearSceneTimers();
  Object.values(controllers).forEach((ctrl) => ctrl.cleanup?.());
  goToScene(0);
}

controllers = {
  0: createFloralIntroScene({
    canvas: document.getElementById("floral-canvas"),
    onComplete: () => goToScene(1),
  }),
  2: createCupidBowScene({
    section: sections[2],
    canvas: document.getElementById("cupid-canvas"),
    heartEl: document.getElementById("cupid-heart"),
    hintEl: document.getElementById("cupid-hint"),
    revealEl: document.getElementById("crimson-reveal"),
    onComplete: () => goToScene(3),
  }),
  4: createHeartTreeScene({
    section: sections[4],
    canvas: document.getElementById("tree-canvas"),
    hintEl: document.getElementById("tree-continue-hint"),
    onComplete: () => goToScene(5),
  }),
  5: createCakeScene({
    section: sections[5],
    confettiCanvas: document.getElementById("cake-confetti-canvas"),
    els: {
      beam: document.getElementById("cake-beam"),
      plate: document.getElementById("cake-plate"),
      layerBottom: document.getElementById("cake-layer-bottom"),
      filling: document.getElementById("cake-filling"),
      layerTop: document.getElementById("cake-layer-top"),
      icing: document.getElementById("cake-icing"),
      candle: document.getElementById("cake-candle"),
      flameWrap: document.getElementById("cake-flame-wrap"),
      warmGlow: document.getElementById("cake-warm-glow"),
      statusTitle: document.getElementById("cake-status-title"),
      statusSub: document.getElementById("cake-status-sub"),
      tapHint: document.getElementById("cake-tap-hint"),
    },
    onComplete: () => goToScene(6),
  }),
  6: createBalloonsScene({
    section: sections[6],
    confettiCanvas: document.getElementById("balloon-confetti-canvas"),
    rackEl: document.getElementById("balloons-rack"),
    stackEl: document.getElementById("reasons-stack"),
    closingEl: document.getElementById("reasons-closing"),
    onComplete: () => goToScene(7),
  }),
  7: createPolaroidsScene({
    stageEl: document.getElementById("memory-stage"),
    trackEl: document.getElementById("polaroid-track"),
    bulbsEl: document.getElementById("fairy-bulbs"),
    dotsEl: document.getElementById("memory-dots"),
    continueBtn: document.getElementById("memory-continue-btn"),
    onComplete: () => goToScene(8),
  }),
  8: createPoetryVideosScene({
    videoEls: [
      document.getElementById("video-shayari"),
      document.getElementById("video-birthday"),
    ],
    continueBtn: document.getElementById("poetry-continue-btn"),
    onComplete: () => goToScene(9),
  }),
  9: createLetterScene({
    els: {
      header: document.getElementById("letter-header"),
      envelopeStage: document.getElementById("envelope-stage"),
      envelopeBtn: document.getElementById("envelope-btn"),
      cardWrap: document.getElementById("letter-card-wrap"),
      card: document.getElementById("letter-card"),
      greeting: document.getElementById("letter-greeting"),
      opening: document.getElementById("letter-opening"),
      body: document.getElementById("letter-body"),
      closing: document.getElementById("letter-closing"),
      signature: document.getElementById("letter-signature"),
      continueBtn: document.getElementById("letter-continue-btn"),
    },
    onComplete: () => goToScene(10),
  }),
  10: createFinaleScene({
    section: sections[10],
    canvas: document.getElementById("fireworks-canvas"),
    els: {
      proposalCard: document.getElementById("proposal-card"),
      proposalActions: document.getElementById("proposal-actions"),
      proposalResponse: document.getElementById("proposal-response"),
      yesBtn: document.getElementById("proposal-yes-btn"),
      blushBtn: document.getElementById("proposal-blush-btn"),
      replayBtn: document.getElementById("replay-btn"),
    },
    onReplay: replayAll,
  }),
};

// Pre-initialize YouTube background music player
soundEngine.initMusicPlayer(CONFIG.music.youtubeVideoId);

const musicPillEl = document.getElementById("music-pill");
const musicPillLabelEl = document.getElementById("music-pill-label");

soundEngine.onStatusChange((status) => {
  musicPillEl.classList.toggle("is-visible", status.started);
  musicPillEl.classList.toggle("is-muted", status.muted);
  musicPillEl.classList.toggle("is-paused", status.paused);
  musicPillLabelEl.textContent = status.muted ? "Music Muted" : CONFIG.music.title;
});

musicPillEl.addEventListener("click", (e) => {
  e.stopPropagation();
  soundEngine.toggleMute();
});

// Scene 1: Unwrap CTA unlocks audio & enters Scene 2
document.getElementById("unwrap-btn").addEventListener("click", () => {
  soundEngine.startMusic();
  soundEngine.playUnwrap();
  goToScene(2);
});

// Keyboard mute toggle (M)
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "m") {
    soundEngine.toggleMute();
  }
});

// Kick off from Scene 0
goToScene(0);
