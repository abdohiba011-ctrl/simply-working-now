/**
 * Sound Effects System
 * Provides audio feedback for user interactions
 */

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch (error) {
      console.error('Web Audio API not supported:', error);
      return null;
    }
  }
  
  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  return audioContext;
};

/**
 * Play a notification sound - louder and more noticeable
 * Three ascending beeps for attention
 */
export const playNotificationSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const now = ctx.currentTime;
    
    // Create three beeps in ascending frequency
    const frequencies = [660, 880, 1100]; // E5, A5, C#6
    const beepDuration = 0.15;
    const gap = 0.08;
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const startTime = now + i * (beepDuration + gap);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.02); // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + beepDuration); // Decay
      
      oscillator.start(startTime);
      oscillator.stop(startTime + beepDuration);
    });
    
    // Also trigger vibration
    triggerVibration([100, 50, 100]);
  } catch (error) {
    console.error('Could not play notification sound:', error);
  }
};

/**
 * Play a success sound - happy ascending chord
 * Perfect for thank you pages and login success
 */
export const playSuccessSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const now = ctx.currentTime;
    
    // Create a pleasant ascending chord (C major arpeggio)
    const frequencies = [523, 659, 784, 1047]; // C5, E5, G5, C6
    const duration = 0.3;
    const gap = 0.1;
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'triangle'; // Softer, more pleasant tone
      
      const startTime = now + i * gap;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.03); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Smooth decay
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
    
    // Light vibration for haptic feedback
    triggerVibration([50, 30, 50]);
  } catch (error) {
    console.error('Could not play success sound:', error);
  }
};

/**
 * Play an error sound - two descending tones
 */
export const playErrorSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const now = ctx.currentTime;
    
    // Two descending tones
    const frequencies = [440, 330]; // A4, E4
    const duration = 0.2;
    const gap = 0.1;
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const startTime = now + i * (duration + gap);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
    
    // Strong vibration for attention
    triggerVibration([200]);
  } catch (error) {
    console.error('Could not play error sound:', error);
  }
};

/**
 * Trigger device vibration if supported
 * @param pattern - Vibration pattern in milliseconds [vibrate, pause, vibrate, ...]
 */
export const triggerVibration = (pattern: number[] = [100, 50, 100]): void => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    // Vibration not supported or blocked - silent fail
  }
};
