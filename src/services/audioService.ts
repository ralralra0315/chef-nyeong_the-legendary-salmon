// Generate very simple synthesized sounds to avoid loading external files.

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export const playSound = (type: 'dragStart' | 'fusion' | 'wrong' | 'click' | 'cook') => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  if (type === 'cook') {
    const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 seconds of sizzle
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    
    // Bandpass filter to make it sound like sizzling/frying
    const biquadFilter = audioCtx.createBiquadFilter();
    biquadFilter.type = 'bandpass';
    biquadFilter.frequency.value = 1000;
    biquadFilter.Q.value = 0.5;

    noiseSource.connect(biquadFilter);
    biquadFilter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    noiseSource.start();
    return;
  }

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'dragStart') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'fusion') {
    // Flapping or fusion sound
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.2);
    oscillator.frequency.linearRampToValueAtTime(200, audioCtx.currentTime + 0.4);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 0.2);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
  } else if (type === 'wrong') {
    // Angry sound
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  } else if (type === 'click') {
    // Sharp short pop sound for regular clicks
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.05);
  }
};

export const speakTTS = (text: string) => {
  if ('speechSynthesis' in window) {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
    }
    // Remove markdown symbols and quotes for cleaner TTS
    const cleanText = text.replace(/[*_#'"]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const koreanVoices = voices.filter(v => v.lang === 'ko-KR' || v.lang.startsWith('ko'));
      // Find a suitable voice, fallback to first available
      const voice = koreanVoices.find(v => v.name.includes('Neural') || v.name.includes('Google')) || koreanVoices[0];
      if (voice) utterance.voice = voice;
      utterance.pitch = 0.9; // Master voice
      utterance.rate = 1.0; 
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', setVoiceAndSpeak, { once: true });
    } else {
      setVoiceAndSpeak();
    }
  }
};
