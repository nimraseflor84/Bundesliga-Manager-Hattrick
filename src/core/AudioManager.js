/**
 * AudioManager - Programmatische Chiptune/8-Bit Sounds via Web Audio API.
 * Singleton, lazy AudioContext-Initialisierung (Browser Autoplay-Policy).
 */
class AudioManagerClass {
    constructor() {
        this._ctx = null;
        this._masterGain = null;
        this._musicGain = null;
        this._sfxGain = null;
        this._currentMusic = []; // active music oscillators/nodes to stop
        this._crowdNode = null;
        this._crowdGain = null;
        this._muted = false;
        this._volume = 0.5;
        this._loadSettings();
    }

    // --- Settings persistence ---

    _loadSettings() {
        try {
            const raw = localStorage.getItem('bmh_audio_settings');
            if (raw) {
                const s = JSON.parse(raw);
                this._muted = !!s.muted;
                this._volume = typeof s.volume === 'number' ? s.volume : 0.5;
            }
        } catch (e) { /* ignore */ }
    }

    _saveSettings() {
        try {
            localStorage.setItem('bmh_audio_settings', JSON.stringify({
                muted: this._muted,
                volume: this._volume,
            }));
        } catch (e) { /* ignore */ }
    }

    // --- Lazy AudioContext init ---

    _ensureContext() {
        if (this._ctx) {
            if (this._ctx.state === 'suspended') {
                this._ctx.resume();
            }
            return true;
        }
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return false;
            this._ctx = new AC();

            this._masterGain = this._ctx.createGain();
            this._masterGain.connect(this._ctx.destination);

            this._musicGain = this._ctx.createGain();
            this._musicGain.gain.value = 0.4;
            this._musicGain.connect(this._masterGain);

            this._sfxGain = this._ctx.createGain();
            this._sfxGain.gain.value = 0.6;
            this._sfxGain.connect(this._masterGain);

            this._applyVolume();

            // Resume context (required by browser autoplay policy)
            if (this._ctx.state === 'suspended') {
                this._ctx.resume();
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    _applyVolume() {
        if (!this._masterGain) return;
        this._masterGain.gain.value = this._muted ? 0 : this._volume;
    }

    // --- Public API: Mute / Volume ---

    toggleMute() {
        this._muted = !this._muted;
        this._applyVolume();
        this._saveSettings();
        return this._muted;
    }

    isMuted() {
        return this._muted;
    }

    setVolume(v) {
        this._volume = Math.max(0, Math.min(1, v));
        this._applyVolume();
        this._saveSettings();
    }

    getVolume() {
        return this._volume;
    }

    // --- Helper: create oscillator ---

    _osc(type, freq, gain, startTime, endTime, destination) {
        const ctx = this._ctx;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.value = gain;
        o.connect(g);
        g.connect(destination || this._sfxGain);
        o.start(startTime);
        o.stop(endTime);
        return { osc: o, gain: g };
    }

    // --- SFX: Button Click ---

    playButtonClick() {
        if (!this._ensureContext()) return;
        const t = this._ctx.currentTime + 0.01;
        const { osc, gain } = this._osc('square', 800, 0.15, t, t + 0.06, this._sfxGain);
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.06);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.06);
    }

    // --- SFX: Whistle ---

    playWhistle(type = 'single') {
        if (!this._ensureContext()) return;
        const t = this._ctx.currentTime + 0.01;
        const count = type === 'final' ? 3 : type === 'half' ? 2 : 1;

        for (let i = 0; i < count; i++) {
            const start = t + i * 0.35;
            const dur = 0.25;
            const { osc, gain } = this._osc('triangle', 2800, 0.2, start, start + dur, this._sfxGain);

            // Vibrato via LFO
            const lfo = this._ctx.createOscillator();
            const lfoGain = this._ctx.createGain();
            lfo.frequency.value = 30;
            lfoGain.gain.value = 80;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(start);
            lfo.stop(start + dur);

            gain.gain.setValueAtTime(0.2, start);
            gain.gain.linearRampToValueAtTime(0, start + dur);
        }
    }

    // --- SFX: Goal Horn ---

    playGoalHorn() {
        if (!this._ensureContext()) return;
        const t = this._ctx.currentTime + 0.01;

        // Bass thump
        const bass = this._osc('sine', 80, 0.4, t, t + 0.2, this._sfxGain);
        bass.osc.frequency.setValueAtTime(80, t);
        bass.osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
        bass.gain.gain.setValueAtTime(0.4, t);
        bass.gain.gain.linearRampToValueAtTime(0, t + 0.2);

        // Ascending C major arpeggio (C4-E4-G4-C5)
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, i) => {
            const s = t + 0.15 + i * 0.12;
            const { gain } = this._osc('square', freq, 0.15, s, s + 0.15, this._sfxGain);
            gain.gain.setValueAtTime(0.15, s);
            gain.gain.linearRampToValueAtTime(0, s + 0.15);
        });

        // Stadium horn (sustained)
        const horn = this._osc('sawtooth', 220, 0.0, t + 0.6, t + 1.2, this._sfxGain);
        horn.gain.gain.setValueAtTime(0, t + 0.6);
        horn.gain.gain.linearRampToValueAtTime(0.2, t + 0.7);
        horn.gain.gain.setValueAtTime(0.2, t + 1.0);
        horn.gain.gain.linearRampToValueAtTime(0, t + 1.2);

        // Filter for horn
        const filter = this._ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        horn.osc.disconnect();
        horn.osc.connect(filter);
        filter.connect(horn.gain);
    }

    // --- SFX: Yellow Card ---

    playYellowCard() {
        if (!this._ensureContext()) return;
        const t = this._ctx.currentTime + 0.01;

        for (let i = 0; i < 2; i++) {
            const s = t + i * 0.12;
            const { gain } = this._osc('square', 880, 0.15, s, s + 0.08, this._sfxGain);
            gain.gain.setValueAtTime(0.15, s);
            gain.gain.linearRampToValueAtTime(0, s + 0.08);
        }
    }

    // --- SFX: Red Card ---

    playRedCard() {
        if (!this._ensureContext()) return;
        const t = this._ctx.currentTime + 0.01;
        const freqs = [600, 480, 360];

        freqs.forEach((freq, i) => {
            const s = t + i * 0.18;
            const { gain } = this._osc('sawtooth', freq, 0.2, s, s + 0.15, this._sfxGain);
            gain.gain.setValueAtTime(0.2, s);
            gain.gain.linearRampToValueAtTime(0, s + 0.15);
        });
    }

    // --- SFX: Cash Register (Transfer OK) ---

    playCashRegister() {
        if (!this._ensureContext()) return;
        const t = this._ctx.currentTime + 0.01;

        // Noise burst (white noise via buffer)
        const bufferSize = this._ctx.sampleRate * 0.08;
        const noiseBuffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this._ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseGain = this._ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, t);
        noiseGain.gain.linearRampToValueAtTime(0, t + 0.08);
        const hpf = this._ctx.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 4000;
        noise.connect(hpf);
        hpf.connect(noiseGain);
        noiseGain.connect(this._sfxGain);
        noise.start(t);
        noise.stop(t + 0.08);

        // Metallic "ching" - high frequency ring
        const { osc, gain } = this._osc('square', 2400, 0.0, t + 0.05, t + 0.3, this._sfxGain);
        gain.gain.setValueAtTime(0, t + 0.05);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.frequency.setValueAtTime(2400, t + 0.05);
        osc.frequency.exponentialRampToValueAtTime(1800, t + 0.3);
    }

    // --- SFX: Error Buzz ---

    playErrorBuzz() {
        if (!this._ensureContext()) return;
        const t = this._ctx.currentTime + 0.01;

        const { osc, gain } = this._osc('sawtooth', 300, 0.2, t, t + 0.3, this._sfxGain);
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.3);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
    }

    // --- SFX: Upgrade Success ---

    playUpgradeSuccess() {
        if (!this._ensureContext()) return;
        const t = this._ctx.currentTime + 0.01;

        // 3 ascending hammer strikes
        const hammerFreqs = [200, 300, 400];
        hammerFreqs.forEach((freq, i) => {
            const s = t + i * 0.2;

            // Impact noise
            const bufLen = this._ctx.sampleRate * 0.05;
            const buf = this._ctx.createBuffer(1, bufLen, this._ctx.sampleRate);
            const ch = buf.getChannelData(0);
            for (let j = 0; j < bufLen; j++) {
                ch[j] = (Math.random() * 2 - 1) * (1 - j / bufLen);
            }
            const src = this._ctx.createBufferSource();
            src.buffer = buf;
            const ng = this._ctx.createGain();
            ng.gain.setValueAtTime(0.15, s);
            ng.gain.linearRampToValueAtTime(0, s + 0.05);
            src.connect(ng);
            ng.connect(this._sfxGain);
            src.start(s);
            src.stop(s + 0.05);

            // Tonal hit
            const { gain } = this._osc('square', freq, 0.15, s, s + 0.12, this._sfxGain);
            gain.gain.setValueAtTime(0.15, s);
            gain.gain.linearRampToValueAtTime(0, s + 0.12);
        });

        // Sparkle (high descending arpeggiated tones)
        const sparkleFreqs = [1200, 1600, 2000, 2400];
        sparkleFreqs.forEach((freq, i) => {
            const s = t + 0.6 + i * 0.08;
            const { gain } = this._osc('square', freq, 0.08, s, s + 0.1, this._sfxGain);
            gain.gain.setValueAtTime(0.08, s);
            gain.gain.linearRampToValueAtTime(0, s + 0.1);
        });
    }

    // --- Music: Title melody ---

    startTitleMusic() {
        if (!this._ensureContext()) return;
        this.stopMusic();

        // Dr. Wily's Castle Stage 1 (Mega Man 2) — 8-Bit Recreation
        // Transcribed from MIDI data. Key: C# minor, 170 BPM, 8-bar loop
        const bpm = 170;
        const beat = 60 / bpm;
        const sx = beat / 4; // sixteenth note ≈ 0.088s

        // Note frequencies (Hz)
        const A2 = 110.00, B2 = 123.47, Cs3 = 138.59;
        const Cs4 = 277.18, Ds4 = 311.13, E4 = 329.63,
              Fs4 = 369.99, Gs4 = 415.30, As4 = 466.16, B4 = 493.88;
        const Ds5 = 622.25, E5 = 659.26;

        // Lead melody (square wave): [freq, start_sixteenth, duration_sixteenths]
        const melody = [
            // Mm 1–2 (C#m): Iconic ♬♩ pulse on E4/C#4, then melody entrance
            [E4, 2, 1], [E4, 3, 1], [E4, 4, 2],
            [E4, 6, 1], [E4, 7, 1], [E4, 8, 2],
            [Cs4, 10, 2],
            [Cs4, 14, 1], [Cs4, 15, 1],
            [E4, 16, 2],
            [E4, 18, 1], [E4, 19, 1], [E4, 20, 2],
            [Cs4, 22, 2],
            [Gs4, 26, 2], [Fs4, 28, 2], [Gs4, 30, 2],

            // Mm 3–4 (A): Pulse resumes, then stepwise descent
            [E4, 34, 1], [E4, 35, 1], [E4, 36, 2],
            [E4, 38, 1], [E4, 39, 1], [E4, 40, 2],
            [Cs4, 42, 2],
            [Gs4, 46, 4], [Fs4, 50, 4], [E4, 54, 4], [Fs4, 58, 4],

            // Mm 5–6 (B): Pulse on F#4/D#4, then descending line
            [Fs4, 66, 1], [Fs4, 67, 1], [Fs4, 68, 2],
            [Fs4, 70, 1], [Fs4, 71, 1], [Fs4, 72, 2],
            [Ds4, 74, 2],
            [Gs4, 78, 4], [Fs4, 82, 4], [E4, 86, 4], [Ds4, 90, 4], [Cs4, 94, 2],

            // Mm 7–8 (C#m): The famous soaring climax!
            [Cs4, 98, 2], [Gs4, 100, 2], [B4, 102, 2],
            [As4, 104, 6],              // sustained A#4 — emotional peak
            [Cs4, 110, 2],
            [Cs4, 114, 2], [Gs4, 116, 2], [B4, 118, 2],
            [As4, 120, 4],              // second peak
            [Ds5, 124, 2], [E5, 126, 2], // pickup into repeat
        ];

        // Bass (triangle wave): driving eighth notes on chord roots
        const bassline = [];
        // C#m (measures 1–2, sx 0–31)
        for (let i = 0; i < 32; i += 2) bassline.push([Cs3, i, 2]);
        // A (measures 3–4, sx 32–63)
        for (let i = 32; i < 64; i += 2) bassline.push([A2, i, 2]);
        // B (measures 5–6, sx 64–95)
        for (let i = 64; i < 96; i += 2) bassline.push([B2, i, 2]);
        // C#m (measures 7–8, sx 96–127) with B passing tone
        for (let i = 96; i < 124; i += 2) bassline.push([Cs3, i, 2]);
        bassline.push([B2, 124, 2]);
        bassline.push([Cs3, 126, 2]);

        const loopSixteenths = 128; // 8 measures × 16 sixteenths
        const loopDuration = loopSixteenths * sx;
        this._musicLoopTimer = null;

        const scheduleLoop = () => {
            const now = this._ctx.currentTime + 0.05;
            const nodes = [];

            // Schedule melody
            for (const [freq, startSx, durSx] of melody) {
                const s = now + startSx * sx;
                const dur = durSx * sx;
                const o = this._ctx.createOscillator();
                const g = this._ctx.createGain();
                o.type = 'square';
                o.frequency.value = freq;
                g.gain.setValueAtTime(0.12, s);
                g.gain.setValueAtTime(0.12, s + dur - 0.02);
                g.gain.linearRampToValueAtTime(0, s + dur);
                o.connect(g);
                g.connect(this._musicGain);
                o.start(s);
                o.stop(s + dur);
                nodes.push(o);
            }

            // Schedule bassline
            for (const [freq, startSx, durSx] of bassline) {
                const s = now + startSx * sx;
                const dur = durSx * sx;
                const o = this._ctx.createOscillator();
                const g = this._ctx.createGain();
                o.type = 'triangle';
                o.frequency.value = freq;
                g.gain.setValueAtTime(0.18, s);
                g.gain.setValueAtTime(0.18, s + dur - 0.02);
                g.gain.linearRampToValueAtTime(0, s + dur);
                o.connect(g);
                g.connect(this._musicGain);
                o.start(s);
                o.stop(s + dur);
                nodes.push(o);
            }

            this._currentMusic = nodes;
            // Schedule next loop slightly before current one ends
            this._musicLoopTimer = setTimeout(() => scheduleLoop(), (loopDuration - 0.1) * 1000);
        };

        scheduleLoop();
    }

    // --- Music: Match Atmosphere ---

    startMatchAtmosphere() {
        if (!this._ensureContext()) return;
        this.stopMusic();

        // Bandpass-filtered white noise (crowd sound)
        const bufferSize = 2 * this._ctx.sampleRate;
        const noiseBuffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this._ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const bandpass = this._ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 800;
        bandpass.Q.value = 0.8;

        this._crowdGain = this._ctx.createGain();
        this._crowdGain.gain.value = 0.12;

        // LFO swell on crowd volume
        const lfo = this._ctx.createOscillator();
        const lfoGain = this._ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.15; // slow swell
        lfoGain.gain.value = 0.04;  // subtle variation
        lfo.connect(lfoGain);
        lfoGain.connect(this._crowdGain.gain);
        lfo.start();

        noise.connect(bandpass);
        bandpass.connect(this._crowdGain);
        this._crowdGain.connect(this._musicGain);

        noise.start();
        this._crowdNode = noise;
        this._crowdLfo = lfo;
        this._currentMusic = [noise, lfo];
    }

    // --- Music: Boost crowd on goal ---

    boostCrowd() {
        if (!this._crowdGain || !this._ctx) return;
        const t = this._ctx.currentTime;
        this._crowdGain.gain.cancelScheduledValues(t);
        this._crowdGain.gain.setValueAtTime(this._crowdGain.gain.value, t);
        this._crowdGain.gain.linearRampToValueAtTime(0.35, t + 0.1);
        this._crowdGain.gain.linearRampToValueAtTime(0.12, t + 2.0);
    }

    // --- Music: Stop ---

    stopMusic() {
        if (this._musicLoopTimer) {
            clearTimeout(this._musicLoopTimer);
            this._musicLoopTimer = null;
        }
        for (const node of this._currentMusic) {
            try { node.stop(); } catch (e) { /* already stopped */ }
        }
        this._currentMusic = [];
        this._crowdNode = null;
        this._crowdGain = null;
        this._crowdLfo = null;
    }
}

export const audioManager = new AudioManagerClass();
