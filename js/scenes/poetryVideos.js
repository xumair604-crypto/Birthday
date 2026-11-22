import { soundEngine } from "../audio.js";

export function createPoetryVideosScene({ videoEls, continueBtn, onComplete }) {
  const [videoA, videoB] = videoEls;
  const listeners = [];

  function syncAudioDucking() {
    const anyPlaying = videoEls.some((v) => !v.paused && !v.ended);
    if (anyPlaying) {
      soundEngine.pauseMusic();
    } else {
      soundEngine.resumeMusic();
    }
  }

  function attachVideoHandlers(video, other) {
    const onPlay = () => {
      if (!other.paused) {
        other.pause();
      }
      soundEngine.pauseMusic();
    };
    const onStop = () => {
      syncAudioDucking();
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onStop);
    video.addEventListener("ended", onStop);
    listeners.push(() => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onStop);
      video.removeEventListener("ended", onStop);
    });
  }

  function handleContinue() {
    cleanup();
    onComplete?.();
  }

  function start() {
    cleanup();
    videoEls.forEach((v) => {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        // Ignore if metadata is still loading
      }
    });
    attachVideoHandlers(videoA, videoB);
    attachVideoHandlers(videoB, videoA);
    continueBtn.addEventListener("click", handleContinue);
  }

  function cleanup() {
    listeners.forEach((off) => off());
    listeners.length = 0;
    continueBtn.removeEventListener("click", handleContinue);
    videoEls.forEach((v) => {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        // Ignore if metadata is still loading
      }
    });
    soundEngine.resumeMusic();
  }

  return { start, cleanup };
}
