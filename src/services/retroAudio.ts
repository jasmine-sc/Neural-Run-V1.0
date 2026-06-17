// 8-bit Retro sound synthesizer using the native Web Audio API.
// No static files needed! Operates completely client-side.

class RetroAudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.init();
    return this.isMuted;
  }

  getMuteState(): boolean {
    return this.isMuted;
  }

  playJump() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    // Slide frequency upwards quickly
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(650, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playCrouch() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    // Simple low slide frequency
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playCoin() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    const now = this.ctx.currentTime;
    
    // Classic retro 2-tone coin: note 1 then note 2
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.15);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.3);
  }

  playMilestone() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    const now = this.ctx.currentTime;
    
    // Quick rising run of 3 notes
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.07); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.14); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.21); // C6

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.25);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.4);
  }

  playHit() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    const now = this.ctx.currentTime;

    // Fast descending pitch + white noise simulation with sudden gain envelope
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.45);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    // Filter to make it muddy and distorted like a retro explosion
    if (this.ctx.createBiquadFilter) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.linearRampToValueAtTime(100, now + 0.5);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.5);
  }

  playDayNight() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const oscValue = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    oscValue.type = "sine";
    const now = this.ctx.currentTime;
    
    // Slow sweeping sci-fi sine sound
    oscValue.frequency.setValueAtTime(440, now);
    oscValue.frequency.linearRampToValueAtTime(880, now + 0.8);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.6);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.8);

    oscValue.connect(gain);
    gain.connect(this.ctx.destination);

    oscValue.start();
    oscValue.stop(now + 0.8);
  }
}

export const retroAudio = new RetroAudioService();
