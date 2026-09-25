// Video carousel with switchable, synchronized audio tracks.
//
// The video element is the clock. Each alternative commentary is a separate <audio>
// element that is slaved to it: play/pause/seek/rate changes are mirrored, and drift is
// corrected while playing. Switching tracks just swaps which audio element is audible,
// so the video never restarts. A track whose source is "video" unmutes the video itself.

(function () {
  "use strict";

  const DRIFT_TOLERANCE = 0.15; // seconds of audio/video drift before re-seeking the audio
  const AUDIO_STALL_GRACE = 300; // ms an audio track may buffer before the video waits for it
  const allPlayers = [];

  function el(tag, className, attrs) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function icon(name) {
    const span = el("span", "icon");
    span.appendChild(el("i", "fas fa-" + name));
    return span;
  }

  function setIcon(button, name) {
    button.querySelector("i").className = "fas fa-" + name;
  }

  function fmt(t) {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  class ClipPlayer {
    constructor(clip, trackDefs) {
      this.clip = clip;
      this.audioMap = clip.audio || {};
      this.tracks = trackDefs.filter((t) => this.audioMap[t.id]);
      this.activeId = this.audioMap[clip.default] ? clip.default : (this.tracks[0] && this.tracks[0].id);
      this.audios = {};
      this.loaded = false;
      this.volume = 1;
      this.muted = false;
      this.scrubbing = false;
      this.resumeAfterBuffer = false;
      this.build();
      this.bindVideo();
      this.applyOutput();
      this.renderTracks();
      allPlayers.push(this);
    }

    // ---------- DOM ----------

    build() {
      const root = (this.root = el("div", "mt-player"));

      const stage = (this.stage = el("div", "mt-stage"));
      const video = (this.video = el("video", "", { playsinline: "", preload: "none" }));
      video.muted = true;
      if (this.clip.poster) video.poster = this.clip.poster;
      video.src = this.clip.video;
      stage.appendChild(video);

      const big = (this.bigPlay = el("button", "mt-bigplay", { type: "button", "aria-label": "Play" }));
      big.appendChild(icon("play"));
      stage.appendChild(big);

      this.missing = el("div", "mt-missing");
      stage.appendChild(this.missing);
      root.appendChild(stage);

      stage.addEventListener("click", () => this.toggle());

      // Control bar
      const bar = el("div", "mt-controls");
      this.playBtn = el("button", "mt-btn", { type: "button", "aria-label": "Play" });
      this.playBtn.appendChild(icon("play"));
      this.playBtn.addEventListener("click", () => this.toggle());

      this.timeLabel = el("span", "mt-time");
      this.timeLabel.textContent = "0:00 / 0:00";

      this.scrubber = el("input", "mt-range mt-scrub", {
        type: "range", min: "0", max: "1000", step: "1", value: "0", "aria-label": "Seek",
      });
      this.scrubber.addEventListener("input", () => {
        this.scrubbing = true;
        this.load();
        const d = this.video.duration;
        if (isFinite(d)) this.video.currentTime = (this.scrubber.value / 1000) * d;
        this.updateTime();
      });
      this.scrubber.addEventListener("change", () => { this.scrubbing = false; });

      this.muteBtn = el("button", "mt-btn", { type: "button", "aria-label": "Mute" });
      this.muteBtn.appendChild(icon("volume-high"));
      this.muteBtn.addEventListener("click", () => {
        this.muted = !this.muted;
        if (!this.muted && this.volume === 0) this.volume = 1;
        this.applyOutput();
      });

      this.volSlider = el("input", "mt-range mt-vol", {
        type: "range", min: "0", max: "1", step: "0.01", value: "1", "aria-label": "Volume",
      });
      this.volSlider.addEventListener("input", () => {
        this.volume = parseFloat(this.volSlider.value);
        this.muted = this.volume === 0;
        this.applyOutput();
      });

      this.fsBtn = el("button", "mt-btn", { type: "button", "aria-label": "Fullscreen" });
      this.fsBtn.appendChild(icon("expand"));
      this.fsBtn.addEventListener("click", () => this.toggleFullscreen());

      bar.append(this.playBtn, this.timeLabel, this.scrubber, this.muteBtn, this.volSlider, this.fsBtn);
      root.appendChild(bar);

      // Track switcher
      const trackWrap = el("div", "mt-tracks", { role: "radiogroup", "aria-label": "Audio track" });
      this.trackButtons = {};
      this.tracks.forEach((t, i) => {
        const b = el("button", "mt-track" + (t.ours ? " is-ours" : ""), { type: "button", role: "radio" });
        const num = el("span", "mt-num");
        num.textContent = i + 1;
        const eq = el("span", "mt-eq", { "aria-hidden": "true" });
        eq.append(el("i"), el("i"), el("i"));
        const label = el("span", "mt-label");
        label.textContent = t.label;
        b.append(num, label, eq);
        b.addEventListener("click", () => this.selectTrack(t.id));
        trackWrap.appendChild(b);
        this.trackButtons[t.id] = b;
      });
      root.appendChild(trackWrap);

      this.note = el("p", "mt-note");
      root.appendChild(this.note);

      if (this.clip.caption) {
        const cap = el("p", "mt-caption");
        cap.textContent = this.clip.caption;
        root.appendChild(cap);
      }
    }

    // ---------- media wiring ----------

    load() {
      if (this.loaded) return;
      this.loaded = true;
      this.video.preload = "auto";
      this.tracks.forEach((t) => {
        const src = this.audioMap[t.id];
        if (src === "video") return;
        const a = new Audio();
        a.preload = "auto";
        a.addEventListener("error", () => this.markMissing(t.id, src));
        a.addEventListener("waiting", () => this.onAudioStall(a));
        a.addEventListener("canplay", () => this.onAudioReady(a));
        a.src = src;
        this.audios[t.id] = a;
      });
      this.applyOutput();
    }

    activeAudio() {
      return this.audios[this.activeId] || null;
    }

    usesVideoAudio() {
      return this.audioMap[this.activeId] === "video";
    }

    applyOutput() {
      this.video.volume = this.volume;
      this.video.muted = this.muted || !this.usesVideoAudio();
      for (const id in this.audios) {
        this.audios[id].volume = this.volume;
        this.audios[id].muted = this.muted;
      }
      setIcon(this.muteBtn, this.muted || this.volume === 0 ? "volume-xmark" : this.volume < 0.5 ? "volume-low" : "volume-high");
      this.volSlider.value = this.muted ? 0 : this.volume;
      this.volSlider.style.setProperty("--p", (this.muted ? 0 : this.volume) * 100 + "%");
    }

    syncAudio(a) {
      if (!a) return;
      a.playbackRate = this.video.playbackRate;
      try { a.currentTime = this.video.currentTime; } catch (e) { /* not seekable yet */ }
    }

    startAudio() {
      const a = this.activeAudio();
      if (!a) return;
      if (a.duration && this.video.currentTime >= a.duration) return; // track shorter than video
      if (a.paused) {
        this.syncAudio(a);
        a.play().catch(() => {});
      } else {
        this.correctDrift();
      }
    }

    pauseAudio() {
      for (const id in this.audios) this.audios[id].pause();
    }

    bindVideo() {
      const v = this.video;
      v.addEventListener("play", () => {
        allPlayers.forEach((p) => { if (p !== this) p.pause(); });
        this.startAudio();
        this.updatePlayState();
      });
      v.addEventListener("playing", () => this.startAudio());
      v.addEventListener("pause", () => {
        if (!this.resumeAfterBuffer) this.pauseAudio();
        this.updatePlayState();
      });
      v.addEventListener("waiting", () => this.pauseAudio());
      v.addEventListener("seeking", () => this.syncAudio(this.activeAudio()));
      v.addEventListener("seeked", () => { if (!v.paused) this.startAudio(); });
      v.addEventListener("ratechange", () => this.syncAudio(this.activeAudio()));
      v.addEventListener("ended", () => {
        this.pauseAudio();
        this.updatePlayState();
      });
      v.addEventListener("timeupdate", () => {
        this.correctDrift();
        this.updateTime();
      });
      v.addEventListener("loadedmetadata", () => this.updateTime());
      v.addEventListener("error", () => {
        this.pauseAudio();
        this.missing.textContent = "Video not found: " + this.clip.video;
        this.stage.classList.add("is-missing");
      });
    }

    correctDrift() {
      const a = this.activeAudio();
      if (!a || this.video.paused || a.paused || a.seeking) return;
      if (Math.abs(a.currentTime - this.video.currentTime) > DRIFT_TOLERANCE) {
        a.currentTime = this.video.currentTime;
      }
    }

    // If the audible track runs out of buffer, hold the video until it catches up.
    onAudioStall(a) {
      setTimeout(() => {
        if (a !== this.activeAudio() || this.video.paused || a.readyState >= 3) return;
        this.resumeAfterBuffer = true;
        this.video.pause();
      }, AUDIO_STALL_GRACE);
    }

    onAudioReady(a) {
      if (a !== this.activeAudio() || !this.resumeAfterBuffer) return;
      this.resumeAfterBuffer = false;
      this.video.play().catch(() => {});
    }

    markMissing(id, src) {
      const b = this.trackButtons[id];
      b.classList.add("is-missing");
      b.title = "File not found: " + src;
      if (id === this.activeId) this.renderTracks();
    }

    // ---------- public actions ----------

    play() {
      this.load();
      // Start the audio inside the same user gesture as the video (required by iOS Safari).
      const p = this.video.play();
      const a = this.activeAudio();
      if (a) {
        this.syncAudio(a);
        a.play().catch(() => {});
      }
      if (p) p.catch(() => this.pauseAudio());
    }

    pause() {
      this.resumeAfterBuffer = false;
      if (!this.video.paused) this.video.pause();
      this.pauseAudio();
    }

    toggle() {
      if (this.video.paused || this.video.ended) this.play();
      else this.pause();
    }

    selectTrack(id) {
      if (!this.audioMap[id]) return;
      this.load();
      const prev = this.activeAudio();
      this.activeId = id;
      this.resumeAfterBuffer = false;
      if (prev) prev.pause();
      this.applyOutput();
      if (!this.video.paused) this.startAudio();
      else this.syncAudio(this.activeAudio());
      this.renderTracks();
    }

    selectTrackIndex(i) {
      if (this.tracks[i]) this.selectTrack(this.tracks[i].id);
    }

    toggleFullscreen() {
      const doc = document;
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
      } else if (this.root.requestFullscreen) {
        this.root.requestFullscreen();
      } else if (this.root.webkitRequestFullscreen) {
        this.root.webkitRequestFullscreen();
      } else if (this.video.webkitEnterFullscreen) {
        this.video.webkitEnterFullscreen(); // iPhone: video-only fullscreen; audio keeps playing
      }
    }

    // ---------- UI state ----------

    renderTracks() {
      this.tracks.forEach((t) => {
        const b = this.trackButtons[t.id];
        const on = t.id === this.activeId;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
      const t = this.tracks.find((x) => x.id === this.activeId);
      const btn = t && this.trackButtons[t.id];
      if (btn && btn.classList.contains("is-missing")) {
        this.note.textContent = "Audio file not found: " + this.audioMap[t.id];
        this.note.classList.add("is-error");
      } else {
        this.note.textContent = (t && t.note) || "";
        this.note.classList.remove("is-error");
      }
    }

    updatePlayState() {
      const playing = !this.video.paused && !this.video.ended;
      this.root.classList.toggle("is-playing", playing);
      setIcon(this.playBtn, playing ? "pause" : "play");
      this.playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    }

    updateTime() {
      const v = this.video;
      this.timeLabel.textContent = fmt(v.currentTime) + " / " + fmt(v.duration);
      const frac = isFinite(v.duration) && v.duration > 0 ? v.currentTime / v.duration : 0;
      if (!this.scrubbing) this.scrubber.value = Math.round(frac * 1000);
      this.scrubber.style.setProperty("--p", frac * 100 + "%");
    }
  }

  class Carousel {
    constructor(root, clips, trackDefs) {
      this.root = root;
      this.players = clips.map((c) => new ClipPlayer(c, trackDefs));
      this.index = 0;
      this.build();
      this.bindKeys();
      this.go(0);
    }

    build() {
      const root = this.root;
      root.tabIndex = 0;
      const multi = this.players.length > 1;

      const head = el("div", "mt-head");
      this.prevBtn = el("button", "mt-arrow", { type: "button", "aria-label": "Previous clip" });
      this.prevBtn.appendChild(icon("chevron-left"));
      this.prevBtn.addEventListener("click", () => this.go(this.index - 1));
      this.nextBtn = el("button", "mt-arrow", { type: "button", "aria-label": "Next clip" });
      this.nextBtn.appendChild(icon("chevron-right"));
      this.nextBtn.addEventListener("click", () => this.go(this.index + 1));
      const titleWrap = el("div", "mt-title");
      this.counter = el("span", "mt-counter");
      this.title = el("span", "mt-clip-title");
      titleWrap.append(this.counter, this.title);
      if (multi) head.append(this.prevBtn, titleWrap, this.nextBtn);
      else head.append(titleWrap);
      root.appendChild(head);

      const viewport = el("div", "mt-viewport");
      this.strip = el("div", "mt-strip");
      this.slides = this.players.map((p) => {
        const slide = el("div", "mt-slide");
        slide.appendChild(p.root);
        this.strip.appendChild(slide);
        return slide;
      });
      viewport.appendChild(this.strip);
      root.appendChild(viewport);

      this.dots = [];
      if (multi) {
        const dots = el("div", "mt-dots");
        this.players.forEach((p, i) => {
          const d = el("button", "mt-dot", { type: "button", "aria-label": "Clip " + (i + 1) + ": " + (p.clip.title || "") });
          d.addEventListener("click", () => this.go(i));
          dots.appendChild(d);
          this.dots.push(d);
        });
        root.appendChild(dots);
      }
    }

    go(i) {
      const n = this.players.length;
      const next = ((i % n) + n) % n;
      if (next !== this.index) this.players[this.index].pause();
      this.index = next;
      this.strip.style.transform = "translateX(" + -100 * next + "%)";
      this.slides.forEach((s, k) => {
        const on = k === next;
        s.classList.toggle("is-current", on);
        s.inert = !on;
        s.setAttribute("aria-hidden", on ? "false" : "true");
      });
      this.dots.forEach((d, k) => d.classList.toggle("is-active", k === next));
      const clip = this.players[next].clip;
      this.counter.textContent = n > 1 ? next + 1 + " / " + n : "";
      this.title.textContent = clip.title || "";
      // Start buffering the visible clip (video + every track) so switching is instant.
      this.players[next].load();
    }

    bindKeys() {
      const isSpace = (e) => e.key === " " || e.code === "Space";
      this.root.addEventListener("keydown", (e) => {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        const onRange = e.target.type === "range";
        const player = this.players[this.index];
        if (isSpace(e)) {
          e.preventDefault();
          player.toggle();
        } else if (/^[1-9]$/.test(e.key)) {
          player.selectTrackIndex(parseInt(e.key, 10) - 1);
        } else if (e.key === "ArrowLeft" && !onRange) {
          e.preventDefault();
          this.go(this.index - 1);
        } else if (e.key === "ArrowRight" && !onRange) {
          e.preventDefault();
          this.go(this.index + 1);
        } else if (e.key === "f" || e.key === "F") {
          player.toggleFullscreen();
        }
      });
      // Stop Space from also "clicking" a focused track button on keyup.
      this.root.addEventListener("keyup", (e) => { if (isSpace(e)) e.preventDefault(); });
    }
  }

  function init() {
    const tracks = window.TRACKS || [];
    const sets = window.CLIPS || {};
    document.querySelectorAll(".mt-carousel").forEach((root) => {
      const clips = sets[root.dataset.set];
      if (clips && clips.length) new Carousel(root, clips, tracks);
      else root.closest("section").hidden = true; // no clips configured for this set
    });

    // Figures that haven't been exported yet show a placeholder instead of a broken image.
    document.querySelectorAll("img[data-missing]").forEach((img) => {
      const swap = () => {
        const box = el("div", "figure-missing");
        box.textContent = img.dataset.missing;
        img.replaceWith(box);
      };
      if (img.complete && img.naturalWidth === 0) swap();
      else img.addEventListener("error", swap);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
