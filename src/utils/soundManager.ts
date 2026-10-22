// utils/soundManager.ts
class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private lastPlayed: number = 0;
  private minInterval: number = 800; // Minimum 800ms between sounds
  private enabled: boolean = false;
  private volume: number = 0.7;
  private failCount: number = 0;
  private lastFailTime: number = 0;

  private constructor() {
    // Force disabled by user request
    this.enabled = false;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sound_enabled', 'false');
    }
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private preloadSounds() {
    // Create audio elements (lazy load to avoid auto-play policies)
    const soundUrls = {
      faaah: 'https://www.myinstants.com/media/sounds/meme-sigh.mp3',
      faaah_soft: 'https://www.myinstants.com/media/sounds/meme-sigh.mp3',
      faaah_loud: 'https://www.myinstants.com/media/sounds/meme-sigh.mp3',
      faaah_echo: 'https://www.myinstants.com/media/sounds/meme-sigh.mp3',
      attassa: 'https://www.myinstants.com/media/sounds/oh-no-no-no-laugh.mp3',
      attassa_soft: 'https://www.myinstants.com/media/sounds/oh-no-no-no-laugh.mp3',
      chaos: 'https://www.myinstants.com/media/sounds/oh-no-no-no-laugh.mp3'
    };

    Object.entries(soundUrls).forEach(([key, url]) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      this.sounds.set(key, audio);
    });
  }

  private canPlay(): boolean {
    const now = Date.now();
    if (now - this.lastPlayed < this.minInterval) {
      return false;
    }
    return this.enabled;
  }

  private playSound(soundKey: string, intensity: 'soft' | 'normal' | 'loud' | 'echo' = 'normal') {
    if (!this.canPlay()) return;
    
    let key = soundKey;
    if (intensity === 'soft') key = `${soundKey}_soft`;
    else if (intensity === 'loud') key = `${soundKey}_loud`;
    else if (intensity === 'echo') key = `${soundKey}_echo`;
    
    const sound = this.sounds.get(key) || this.sounds.get(soundKey);
    if (sound) {
      sound.currentTime = 0;
      sound.volume = this.volume;
      sound.play().catch(e => console.log('Sound play prevented:', e));
      this.lastPlayed = Date.now();
    }
  }

  // Public methods for different scenarios
  playFaaah(intensity: 'soft' | 'normal' | 'loud' | 'echo' = 'normal') {
    this.playSound('faaah', intensity);
  }

  playAttassa(intensity: 'soft' | 'normal' | 'loud' = 'normal') {
    this.playSound('attassa', intensity);
  }

  // Smart roast mode - based on user action
  onUserMistake(mistakeType: 'wrong_input' | 'slow_response' | 'repeated_fail') {
    const now = Date.now();
    const timeSinceLastFail = now - this.lastFailTime;
    this.lastFailTime = now;
    
    if (mistakeType === 'wrong_input') {
      this.failCount++;
      this.playFaaah(this.failCount > 3 ? 'loud' : 'normal');
    } else if (mistakeType === 'slow_response') {
      this.playFaaah('echo');
    } else if (mistakeType === 'repeated_fail') {
      this.failCount += 2;
      if (this.failCount >= 10) {
        this.playChaosMode();
      } else {
        this.playFaaah('loud');
      }
    }
  }

  // Combo system - consecutive fails
  onComboFail(comboCount: number) {
    if (comboCount === 1) {
      this.playFaaah('soft');
    } else if (comboCount === 2) {
      this.playFaaah('normal');
    } else if (comboCount >= 3) {
      this.playFaaah('loud');
      // Add screen shake effect
      this.triggerScreenShake();
    }
  }

  // Chaos mode for high fail count
  playChaosMode() {
    this.playSound('chaos');
    this.playFaaah('loud');
    setTimeout(() => this.playAttassa('normal'), 300);
  }

  // Screen shake effect
  private triggerScreenShake() {
    const element = document.querySelector('.roast-container') as HTMLElement;
    if (element) {
      element.classList.add('shake-effect');
      setTimeout(() => element.classList.remove('shake-effect'), 500);
    }
  }

  // On roast generation success
  onRoastGenerated() {
    this.failCount = 0; // Reset fail counter on success
    // Play the iconic faaaah sound on success!
    this.playFaaah('normal');
  }

  // On direct roast received
  onRoastReceived(intensity: 'soft' | 'normal' | 'loud' = 'normal') {
    this.playFaaah(intensity);
  }

  // Toggle sounds
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sound_enabled', String(enabled));
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Reset combo
  resetCombo() {
    this.failCount = 0;
  }
}

export const soundManager = SoundManager.getInstance();
