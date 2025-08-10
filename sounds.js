class SoundManager {
    constructor() {
        this.enabled = true;
        this.volume = 0.5;
        this.sounds = {};
        this.audioContext = null;
        this.initializeAudio();
    }
    
    initializeAudio() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.initializeSounds();
        } catch (e) {
            console.log('Web Audio API not supported');
            this.enabled = false;
        }
    }
    
    initializeSounds() {
        this.sounds = {
            shoot: () => this.createShootSound(),
            explosion: () => this.createExplosionSound(),
            thrust: () => this.createThrustSound(),
            powerup: () => this.createPowerUpSound(),
            hit: () => this.createHitSound(),
            gameOver: () => this.createGameOverSound(),
            waveComplete: () => this.createWaveCompleteSound()
        };
    }
    
    play(soundName) {
        if (!this.enabled || !this.audioContext) return;
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }
    
    createOscillator(frequency, type, duration, gainValue = 0.1) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(gainValue * this.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
        
        return { oscillator, gainNode };
    }
    
    createShootSound() {
        const duration = 0.1;
        const { oscillator } = this.createOscillator(800, 'square', duration, 0.05);
        oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + duration);
    }
    
    createExplosionSound() {
        const duration = 0.5;
        const noise = this.createNoise(duration, 0.2);
        
        const { oscillator } = this.createOscillator(100, 'sine', duration, 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + duration);
    }
    
    createThrustSound() {
        const duration = 0.1;
        const noise = this.createNoise(duration, 0.03);
        const { oscillator } = this.createOscillator(50, 'sawtooth', duration, 0.02);
    }
    
    createPowerUpSound() {
        const duration = 0.3;
        const { oscillator } = this.createOscillator(400, 'sine', duration, 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + duration / 2);
        oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + duration);
    }
    
    createHitSound() {
        const duration = 0.2;
        const { oscillator } = this.createOscillator(200, 'sawtooth', duration, 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + duration);
    }
    
    createGameOverSound() {
        const duration = 1;
        const { oscillator } = this.createOscillator(440, 'sine', duration, 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + duration);
        
        setTimeout(() => {
            const { oscillator: osc2 } = this.createOscillator(330, 'sine', 0.5, 0.08);
            osc2.frequency.exponentialRampToValueAtTime(82.5, this.audioContext.currentTime + 0.5);
        }, 200);
    }
    
    createWaveCompleteSound() {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.createOscillator(freq, 'sine', 0.2, 0.05);
            }, index * 100);
        });
    }
    
    createNoise(duration, gainValue = 0.1) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const whiteNoise = this.audioContext.createBufferSource();
        whiteNoise.buffer = buffer;
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(gainValue * this.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        whiteNoise.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        whiteNoise.start(this.audioContext.currentTime);
        
        return whiteNoise;
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
    
    toggle() {
        this.enabled = !this.enabled;
    }
}