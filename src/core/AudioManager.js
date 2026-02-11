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

        // Simple chiptune melody: 8-bar loop
        // Key of C major, 120 BPM => beat = 0.5s, bar = 2s, 8 bars = 16s
        const bpm = 120;
        const beat = 60 / bpm;
        const t = this._ctx.currentTime + 0.05;

        // Melody notes (square wave) - simple catchy chiptune
        // [note_freq, start_beat, duration_beats]
        const melody = [
            // Bar 1-2: Opening phrase
            [523.25, 0, 1],    // C5
            [587.33, 1, 1],    // D5
            [659.25, 2, 1.5],  // E5
            [523.25, 3.5, 0.5],// C5
            [659.25, 4, 1],    // E5
            [783.99, 5, 1],    // G5
            [659.25, 6, 2],    // E5
            // Bar 3-4: Response
            [783.99, 8, 1],    // G5
            [698.46, 9, 1],    // F5
            [659.25, 10, 1],   // E5
            [587.33, 11, 1],   // D5
            [523.25, 12, 1.5], // C5
            [392.00, 13.5, 0.5],// G4
            [440.00, 14, 2],   // A4
            // Bar 5-6: Build-up
            [523.25, 16, 1],   // C5
            [659.25, 17, 1],   // E5
            [783.99, 18, 1],   // G5
            [1046.50, 19, 1],  // C6
            [987.77, 20, 1],   // B5
            [880.00, 21, 1],   // A5
            [783.99, 22, 2],   // G5
            // Bar 7-8: Resolution
            [880.00, 24, 1],   // A5
            [783.99, 25, 1],   // G5
            [659.25, 26, 1],   // E5
            [587.33, 27, 1],   // D5
            [523.25, 28, 3],   // C5
            [523.25, 31, 1],   // C5 (pickup)
        ];

        // Bass line (triangle wave)
        const bassline = [
            // Bar 1-2
            [130.81, 0, 2],   // C3
            [130.81, 2, 2],   // C3
            [130.81, 4, 2],   // C3
            [164.81, 6, 2],   // E3
            // Bar 3-4
            [174.61, 8, 2],   // F3
            [164.81, 10, 2],  // E3
            [146.83, 12, 2],  // D3
            [110.00, 14, 2],  // A2
            // Bar 5-6
            [130.81, 16, 2],  // C3
            [164.81, 18, 2],  // E3
            [196.00, 20, 2],  // G3
            [174.61, 22, 2],  // F3
            // Bar 7-8
            [174.61, 24, 2],  // F3
            [196.00, 26, 2],  // G3
            [130.81, 28, 3],  // C3
            [130.81, 31, 1],  // C3
        ];

        const loopDuration = 32 * beat; // 16 seconds
        this._musicLoopTimer = null;

        const scheduleLoop = () => {
            const now = this._ctx.currentTime + 0.05;
            const nodes = [];

            // Schedule melody
            for (const [freq, startBeat, durBeats] of melody) {
                const s = now + startBeat * beat;
                const dur = durBeats * beat;
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
            for (const [freq, startBeat, durBeats] of bassline) {
                const s = now + startBeat * beat;
                const dur = durBeats * beat;
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
