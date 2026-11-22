// YouTube IFrame background music ("You & I" - One Direction) + warm ballad piano fallback + Web Audio SFX

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;

    this.mode = "youtube"; // "youtube" | "fallback"
    this.videoId = null;
    this.ytPlayer = null;
    this.ytReady = false;
    this.ytFailed = false;
    this.pendingPlay = false;
    this.watchdogTimer = null;

    this.isMusicStarted = false;
    this.isMusicPaused = false;
    this.isMuted = false;
    this.statusListeners = new Set();

    // Fallback Web Audio chord loop
    this.isFallbackRunning = false;
    this.chordTimer = null;
    this.chordStep = 0;

    // Warm romantic G-major ballad progression (G - Em7 - Cadd9 - Dsus4/D)
    this.chords = [
      [196.0, 246.94, 293.66, 392.0, 493.88],
      [164.81, 246.94, 293.66, 392.0, 493.88],
      [130.81, 261.63, 293.66, 392.0, 493.88],
      [146.83, 220.0, 293.66, 369.99, 440.0],
    ];
  }

  onStatusChange(cb) {
    this.statusListeners.add(cb);
    cb(this.getStatus());
    return () => this.statusListeners.delete(cb);
  }

  getStatus() {
    return {
      mode: this.mode,
      started: this.isMusicStarted,
      paused: this.isMusicPaused,
      muted: this.isMuted,
      ytReady: this.ytReady,
      ytFailed: this.ytFailed,
    };
  }

  _emitStatus() {
    const snapshot = this.getStatus();
    if (typeof window !== "undefined") {
      window.__soundDebug = snapshot;
    }
    this.statusListeners.forEach((cb) => cb(snapshot));
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.isMuted ? 0 : 0.42;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.24;

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 1400;
      this.musicGain.connect(lowpass);
      lowpass.connect(this.master);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  initMusicPlayer(videoId) {
    this.videoId = videoId;
    this._emitStatus();

    const mountPlayer = () => {
      if (this.ytPlayer || !window.YT || !window.YT.Player) return;
      const hostEl = document.getElementById("yt-player");
      if (!hostEl) return;

      try {
        this.ytPlayer = new window.YT.Player("yt-player", {
          width: "1",
          height: "1",
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            loop: 1,
            playlist: videoId,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              this.ytReady = true;
              this._emitStatus();
              if (this.pendingPlay && !this.isMusicPaused && !this.ytFailed && this.mode === "youtube") {
                this._playYouTube();
              }
            },
            onStateChange: (event) => {
              // 1 = PLAYING, 3 = BUFFERING, 0 = ENDED
              if (event.data === 1 || event.data === 3) {
                this._clearWatchdog();
              }
              if (event.data === 0 && this.mode === "youtube" && !this.isMusicPaused) {
                try {
                  this.ytPlayer.seekTo(0);
                  this.ytPlayer.playVideo();
                } catch {
                  // Ignore
                }
              }
              this._emitStatus();
            },
            onError: () => {
              this.ytFailed = true;
              this._clearWatchdog();
              this._activateFallback();
            },
          },
        });
      } catch {
        this.ytFailed = true;
        this._activateFallback();
      }
    };

    if (window.YT && window.YT.Player) {
      mountPlayer();
      return;
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === "function") prevReady();
      mountPlayer();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        this.ytFailed = true;
        this._activateFallback();
      };
      document.head.appendChild(script);
    }
  }

  _clearWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  _startWatchdog() {
    this._clearWatchdog();
    this.watchdogTimer = setTimeout(() => {
      if (this.mode !== "youtube" || !this.isMusicStarted || this.isMusicPaused) return;
      let state = -1;
      try {
        state = this.ytPlayer?.getPlayerState?.() ?? -1;
      } catch {
        state = -1;
      }
      if (state !== 1 && state !== 3) {
        this.ytFailed = true;
        this._activateFallback();
      }
    }, 4500);
  }

  _playYouTube() {
    if (!this.ytPlayer || !this.ytReady) return;
    try {
      if (this.isMuted) {
        this.ytPlayer.mute();
      } else {
        this.ytPlayer.unMute();
        this.ytPlayer.setVolume(70);
      }
      this.ytPlayer.playVideo();
      this.pendingPlay = false;
    } catch {
      this.ytFailed = true;
      this._activateFallback();
    }
  }

  _activateFallback() {
    this.mode = "fallback";
    if (this.isMusicStarted && !this.isMusicPaused) {
      this._startFallbackLoop();
    }
    this._emitStatus();
  }

  _startFallbackLoop() {
    const ctx = this.ensureContext();
    if (!ctx || this.isFallbackRunning) return;
    this.isFallbackRunning = true;
    this.musicGain.gain.setTargetAtTime(0.24, ctx.currentTime, 0.12);
    this._scheduleNextChord();
  }

  _stopFallbackLoop() {
    this.isFallbackRunning = false;
    if (this.chordTimer) {
      clearTimeout(this.chordTimer);
      this.chordTimer = null;
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.1);
    }
  }

  startMusic() {
    this.ensureContext();
    this.isMusicStarted = true;
    this.isMusicPaused = false;

    if (this.mode === "youtube" && !this.ytFailed) {
      if (this.ytReady) {
        this._playYouTube();
      } else {
        this.pendingPlay = true;
      }
      this._startWatchdog();
    } else {
      this._activateFallback();
    }
    this._emitStatus();
  }

  pauseMusic() {
    if (!this.isMusicStarted || this.isMusicPaused) return;
    this.isMusicPaused = true;
    this._clearWatchdog();

    if (this.mode === "youtube" && this.ytPlayer && this.ytReady) {
      try {
        this.ytPlayer.pauseVideo();
      } catch {
        // Ignore
      }
    } else {
      this._stopFallbackLoop();
    }
    this._emitStatus();
  }

  resumeMusic() {
    if (!this.isMusicStarted || !this.isMusicPaused) return;
    this.isMusicPaused = false;

    if (this.mode === "youtube" && !this.ytFailed) {
      if (this.ytReady) {
        this._playYouTube();
      } else {
        this.pendingPlay = true;
      }
    } else {
      this._startFallbackLoop();
    }
    this._emitStatus();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.isMuted ? 0 : 0.42, this.ctx.currentTime, 0.08);
    }
    if (this.ytPlayer && this.ytReady) {
      try {
        if (this.isMuted) {
          this.ytPlayer.mute();
        } else {
          this.ytPlayer.unMute();
          this.ytPlayer.setVolume(70);
        }
      } catch {
        // Ignore
      }
    }
    this._emitStatus();
    return this.isMuted;
  }

  _scheduleNextChord() {
    if (!this.isFallbackRunning || this.isMusicPaused || !this.ctx) return;
    const notes = this.chords[this.chordStep % this.chords.length];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      osc.type = idx === 0 ? "triangle" : "sine";
      osc2.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      osc2.frequency.setValueAtTime(freq * 1.003, now + idx * 0.09);

      const start = now + idx * 0.09;
      const peak = idx === 0 ? 0.14 : 0.09;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(peak, start + 0.45);
      g.gain.exponentialRampToValueAtTime(0.0008, start + 3.6);

      osc.connect(g);
      osc2.connect(g);
      g.connect(this.musicGain);

      osc.start(start);
      osc2.start(start);
      osc.stop(start + 3.7);
      osc2.stop(start + 3.7);
    });

    this.chordStep += 1;
    this.chordTimer = setTimeout(() => this._scheduleNextChord(), 3100);
  }

  _tone({ freq = 520, endFreq = null, type = "sine", duration = 0.25, gain = 0.14, delay = 0 }) {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    }
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0005, start + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  playUnwrap() {
    this._tone({ freq: 440, endFreq: 660, duration: 0.24, gain: 0.12 });
    this._tone({ freq: 659.25, endFreq: 880, duration: 0.32, gain: 0.11, delay: 0.08 });
    this._tone({ freq: 1046.5, duration: 0.45, gain: 0.08, delay: 0.16 });
  }

  playArrowRelease() {
    this._tone({ freq: 240, endFreq: 780, type: "triangle", duration: 0.18, gain: 0.14 });
  }

  playHeartHit() {
    this._tone({ freq: 523.25, duration: 0.35, gain: 0.15 });
    this._tone({ freq: 659.25, duration: 0.4, gain: 0.14, delay: 0.06 });
    this._tone({ freq: 783.99, duration: 0.5, gain: 0.13, delay: 0.12 });
    this._tone({ freq: 1046.5, duration: 0.6, gain: 0.1, delay: 0.18 });
  }

  playCakeDrop() {
    this._tone({ freq: 220, endFreq: 130, type: "sine", duration: 0.16, gain: 0.12 });
  }

  playCandleIgnite() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      this._tone({ freq: f, duration: 0.55, gain: 0.09, delay: i * 0.06 });
    });
  }

  playBalloonPop(index = 0) {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 950 + index * 140;

    const g = ctx.createGain();
    g.gain.value = 0.26;

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    noise.start();

    const chimes = [587.33, 659.25, 783.99, 880, 1046.5];
    this._tone({ freq: chimes[index % chimes.length], duration: 0.42, gain: 0.11, delay: 0.04 });
  }

  playSwipe() {
    this._tone({ freq: 380, endFreq: 520, duration: 0.12, gain: 0.06 });
  }

  playEnvelopeOpen() {
    this._tone({ freq: 392, duration: 0.25, gain: 0.1 });
    this._tone({ freq: 523.25, duration: 0.35, gain: 0.1, delay: 0.09 });
    this._tone({ freq: 659.25, duration: 0.45, gain: 0.09, delay: 0.18 });
  }

  playFireworkBurst() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 680;
    const g = ctx.createGain();
    g.gain.value = 0.14;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start();
  }
}

export const soundEngine = new SoundEngine();
