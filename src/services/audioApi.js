// Audio generation service using Pollinations TTS API
class AudioService {
  constructor() {
    this.baseUrl = 'https://text.pollinations.ai/';
    this.currentAudio = null;
    this.isPlaying = false;
    this.onPlayStateChange = null;
  }

  /**
   * Generate audio URL for story scene using Pollinations AI Audio
   * @param {string} sceneText - Scene text to narrate
   * @param {number} sceneNumber - Current scene number (1-based)
   * @param {number} totalScenes - Total number of scenes
   * @param {string} storyTitle - Title of the story
   * @param {string} voice - Voice to use (alloy, echo, fable, onyx, nova, shimmer, etc.)
   * @param {string} model - Audio model to use (default: openai-audio)
   * @returns {string} Audio URL
   */
  generateStoryAudioUrl(sceneText, sceneNumber, totalScenes, storyTitle, voice = 'alloy', model = 'openai-audio') {
    if (!sceneText || !sceneText.trim()) {
      throw new Error('Scene text is required for audio generation');
    }

    // Analyze scene mood for appropriate emotional context
    const sceneAnalysis = analyzeSceneMood(sceneText);
    
    // Create balanced prompt for expressive but faithful narration
    const narratorPrompt = `You are a professional children's audiobook narrator. Read the following story text exactly as written - every word, every sentence - but bring it to life with appropriate emotions and expression.

SCENE CONTEXT: This scene has a ${sceneAnalysis.mood} mood with ${sceneAnalysis.energy} energy level.

ESSENTIAL RULES:
✓ Read EVERY word exactly as written - no additions, no omissions, no changes
✓ Use ${sceneAnalysis.tone} tone that matches the scene mood
✓ Make dialogue sound natural with appropriate character emotions
✓ Use ${sceneAnalysis.pacing} pacing for this scene type
✓ Express emotions naturally: ${sceneAnalysis.expression}
✓ Add appropriate pauses for dramatic effect and comprehension

✗ DO NOT add any extra words, commentary, or narrator explanations
✗ DO NOT say things like "warm tone" or "pleasingly" - just BE expressive
✗ DO NOT introduce scenes or add meta-narration

STORY TEXT TO PERFORM:
${sceneText.trim()}`;

    const params = new URLSearchParams();
    params.set('model', model);
    params.set('voice', voice);
    params.set('speed', '0.95'); // Optimal speed for clear pronunciation and comprehension
    params.set('quality', 'hd'); // High quality audio for better clarity
    params.set('format', 'mp3'); // MP3 format for compatibility
    params.set('pitch', '0'); // Neutral base pitch (expression allowed)
    params.set('emotion', 'expressive'); // Allow natural emotional expression
    params.set('emphasis', 'natural'); // Allow natural emphasis for meaning
    params.set('pronunciation', 'clear'); // Clear pronunciation with expression
    params.set('style', 'narrative'); // Narrative storytelling style
    params.set('cb', Date.now().toString(36)); // Cache buster

    const encodedPrompt = encodeURIComponent(narratorPrompt);
    return `${this.baseUrl}${encodedPrompt}?${params.toString()}`;
  }

  /**
   * Generate simple audio URL for text (backward compatibility)
   * @param {string} text - Text to convert to speech
   * @param {string} voice - Voice to use
   * @param {string} model - Audio model to use
   * @returns {string} Audio URL
   */
  generateAudioUrl(text, voice = 'alloy', model = 'openai-audio') {
    if (!text || !text.trim()) {
      throw new Error('Text is required for audio generation');
    }

    const params = new URLSearchParams();
    params.set('model', model);
    params.set('voice', voice);
    params.set('cb', Date.now().toString(36)); // Cache buster

    const encodedText = encodeURIComponent(text.trim());
    return `${this.baseUrl}${encodedText}?${params.toString()}`;
  }

  /**
   * Play audio directly from URL (pre-generated)
   * @param {string} audioUrl - Pre-generated audio URL
   * @param {Function} onStateChange - Callback for play state changes
   * @returns {Promise<void>}
   */
  async playFromUrl(audioUrl, onStateChange = null) {
    try {
      // Stop any currently playing audio
      this.stop();

      if (onStateChange) this.onPlayStateChange = onStateChange;

      // Attempting to play audio from URL

      // Create and configure audio element
      this.currentAudio = new Audio();
      this.currentAudio.crossOrigin = 'anonymous';
      this.currentAudio.preload = 'auto';

      // Set up event listeners
      this.setupAudioEventListeners();

      // Set source and attempt to play
      this.currentAudio.src = audioUrl;
      this.currentAudio.load();
      
      // Wait for audio to be ready (Pollinations can take 30+ seconds)
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Audio loading timeout - Pollinations generation took too long (60+ seconds)'));
        }, 60000); // Increased to 60 seconds for Pollinations audio generation

        const cleanup = () => {
          clearTimeout(timeout);
          this.currentAudio?.removeEventListener('canplay', onCanPlay);
          this.currentAudio?.removeEventListener('error', onError);
        };

        const onCanPlay = () => {
          cleanup();
          resolve();
        };

        const onError = (e) => {
          cleanup();
          const errorMsg = this.currentAudio?.error?.message || 'Audio loading failed';
          reject(new Error(`Pollinations audio error: ${errorMsg}`));
        };

        this.currentAudio.addEventListener('canplay', onCanPlay, { once: true });
        this.currentAudio.addEventListener('error', onError, { once: true });
      });

      await this.currentAudio.play();
      // Audio playback started successfully
      
    } catch (error) {
      console.error('Error playing audio:', error);
      this.isPlaying = false;
      this.onPlayStateChange?.({ 
        isPlaying: false, 
        isLoading: false, 
        error: error.message,
        currentTime: 0, 
        duration: 0 
      });
      throw error;
    }
  }

  /**
   * Set up audio event listeners (extracted for reuse)
   */
  setupAudioEventListeners() {
    if (!this.currentAudio) return;

    this.currentAudio.addEventListener('loadstart', () => {
      if (!this.currentAudio) return;
      this.isPlaying = false;
      this.onPlayStateChange?.({ 
        isPlaying: false, 
        isLoading: true, 
        currentTime: 0, 
        duration: 0 
      });
    });

    this.currentAudio.addEventListener('canplay', () => {
      if (!this.currentAudio) return;
      this.onPlayStateChange?.({ 
        isPlaying: false, 
        isLoading: false, 
        currentTime: 0, 
        duration: this.currentAudio.duration || 0 
      });
    });

    this.currentAudio.addEventListener('play', () => {
      if (!this.currentAudio) return;
      this.isPlaying = true;
      this.onPlayStateChange?.({ 
        isPlaying: true, 
        isLoading: false, 
        currentTime: this.currentAudio.currentTime || 0, 
        duration: this.currentAudio.duration || 0 
      });
    });

    this.currentAudio.addEventListener('pause', () => {
      if (!this.currentAudio) return;
      this.isPlaying = false;
      this.onPlayStateChange?.({ 
        isPlaying: false, 
        isLoading: false, 
        currentTime: this.currentAudio.currentTime || 0, 
        duration: this.currentAudio.duration || 0 
      });
    });

    this.currentAudio.addEventListener('ended', () => {
      if (!this.currentAudio) return;
      this.isPlaying = false;
      this.onPlayStateChange?.({ 
        isPlaying: false, 
        isLoading: false, 
        currentTime: 0, 
        duration: this.currentAudio.duration || 0,
        ended: true 
      });
    });

    this.currentAudio.addEventListener('timeupdate', () => {
      if (!this.currentAudio) return;
      this.onPlayStateChange?.({ 
        isPlaying: this.isPlaying, 
        isLoading: false, 
        currentTime: this.currentAudio.currentTime || 0, 
        duration: this.currentAudio.duration || 0 
      });
    });

    this.currentAudio.addEventListener('error', (e) => {
      // Audio playback error - will be handled by error state
      const errorMsg = this.currentAudio?.error ? 
        `Audio error: ${this.currentAudio.error.message || 'Unknown error'}` : 
        '';
      
      this.isPlaying = false;
      this.onPlayStateChange?.({ 
        isPlaying: false, 
        isLoading: false, 
        error: errorMsg,
        currentTime: 0, 
        duration: 0 
      });
    });
  }

  /**
   * Play audio from text
   * @param {string} text - Text to speak
   * @param {string} voice - Voice to use
   * @param {Function} onStateChange - Callback for play state changes
   * @returns {Promise<void>}
   */
  async playText(text, voice = 'alloy', onStateChange = null) {
    try {
      // Stop any currently playing audio
      this.stop();

      if (onStateChange) this.onPlayStateChange = onStateChange;

      // Generate audio URL and play from it
      const audioUrl = this.generateAudioUrl(text, voice);
      return await this.playFromUrl(audioUrl, onStateChange);
      
    } catch (error) {
      console.error('Error playing audio:', error);
      this.isPlaying = false;
      this.onPlayStateChange?.({ 
        isPlaying: false, 
        isLoading: false, 
        error: error.message,
        currentTime: 0, 
        duration: 0 
      });
      throw error;
    }
  }

  /**
   * Pause current audio
   */
  pause() {
    if (this.currentAudio && this.isPlaying) {
      this.currentAudio.pause();
    }
  }

  /**
   * Resume paused audio
   */
  resume() {
    if (this.currentAudio && !this.isPlaying) {
      this.currentAudio.play().catch(console.error);
    }
  }

  /**
   * Stop and cleanup current audio
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    this.isPlaying = false;
  }

  /**
   * Get current playback state
   * @returns {Object} Current state
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      isLoading: this.currentAudio?.readyState < 4,
      currentTime: this.currentAudio?.currentTime || 0,
      duration: this.currentAudio?.duration || 0,
      hasAudio: !!this.currentAudio
    };
  }

  /**
   * Set playback position
   * @param {number} time - Time in seconds
   */
  setCurrentTime(time) {
    if (this.currentAudio && this.currentAudio.duration) {
      this.currentAudio.currentTime = Math.max(0, Math.min(time, this.currentAudio.duration));
    }
  }

  /**
   * Clean up service
   */
  destroy() {
    this.stop();
    this.onPlayStateChange = null;
  }
}

// Create singleton instance
const audioService = new AudioService();

export default audioService;

// Available voices for reference
export const AVAILABLE_VOICES = [
  'alloy',   // Neutral, versatile
  'echo',    // Clear, professional  
  'fable',   // Warm, storytelling (BEST for children's stories)
  'onyx',    // Deep, dramatic
  'nova',    // Bright, energetic
  'shimmer', // Gentle, soothing
  'coral',   // Friendly, warm
  'verse',   // Poetic, expressive
  'ballad',  // Musical, rhythmic
  'ash',     // Mature, grounded
  'sage',    // Wise, calm
  'amuch',   // Playful, animated
  'dan'      // Strong, confident
];

// Consistent voice selection - maintains same voice throughout entire story for flow continuity
// Stores selected voice per story to ensure consistency across all scenes
const storyVoiceCache = new Map();

export const getConsistentStoryVoice = (storyTitle, fullStoryText = '') => {
  // Check if we already have a voice selected for this story
  if (storyVoiceCache.has(storyTitle)) {
    return storyVoiceCache.get(storyTitle);
  }
  
  // Analyze the FULL story once to pick the best overall voice
  if (!fullStoryText) {
    // Fallback if no full story provided
    const selectedVoice = 'fable'; // Best default for children's stories
    storyVoiceCache.set(storyTitle, selectedVoice);
    return selectedVoice;
  }
  
  const text = fullStoryText.toLowerCase();
  let selectedVoice = 'fable'; // Default
  
  // Priority-based analysis of the ENTIRE story content
  // 1. Adventure/Action stories - high energy throughout
  if (text.match(/\b(adventure|exciting|running|chase|race|jump|climb|fast|quick|hurry|rush|action|thrilling|danger|escape|brave|hero)\b/g)?.length > 3) {
    selectedVoice = 'nova'; // Bright, energetic for action stories
  }
  // 2. Mysterious/Fantasy stories - dramatic throughout  
  else if (text.match(/\b(dark|mysterious|shadow|whisper|secret|hidden|magic|witch|ghost|forest|dragon|castle|spell)\b/g)?.length > 2) {
    selectedVoice = 'echo'; // Clear, professional for fantasy/mystery
  }
  // 3. Gentle/Bedtime stories - soothing throughout
  else if (text.match(/\b(gentle|peaceful|sleep|quiet|soft|calm|love|tender|sweet|cozy|warm|hug|comfort|dream|lullaby)\b/g)?.length > 2) {
    selectedVoice = 'shimmer'; // Gentle, soothing for bedtime stories
  }
  // 4. Funny/Playful stories - cheerful throughout
  else if (text.match(/\b(funny|laugh|giggle|silly|play|joy|happy|cheerful|smile|dance|party|celebrate|fun|merry|chuckle)\b/g)?.length > 3) {
    selectedVoice = 'coral'; // Friendly, warm for humorous stories
  }
  // 5. Educational/Wise stories - expressive throughout
  else if (text.match(/\b(wise|learned|teacher|lesson|moral|learn|discover|understand|knowledge)\b/g)?.length > 2) {
    selectedVoice = 'sage'; // Wise, calm for educational content
  }
  // 6. Default: Classic storytelling voice
  else {
    selectedVoice = 'fable'; // Warm, engaging, perfect for general children's stories
  }
  
  // Cache the selected voice for this story to maintain consistency
  storyVoiceCache.set(storyTitle, selectedVoice);
  return selectedVoice;
};

// Legacy function kept for backward compatibility (now uses consistent voice)
export const getStoryVoice = (sceneText, sceneNumber, storyTitle = 'default', fullStoryText = '') => {
  return getConsistentStoryVoice(storyTitle, fullStoryText);
};

// Analyze scene mood and energy for appropriate emotional expression
const analyzeSceneMood = (sceneText) => {
  if (!sceneText) return {
    mood: 'neutral',
    energy: 'medium',
    tone: 'warm',
    pacing: 'steady',
    expression: 'gentle and clear'
  };
  
  const text = sceneText.toLowerCase();
  
  // Action/Adventure scenes
  if (text.match(/\b(running|chase|race|jump|climb|fast|quick|hurry|rush|action|adventure|exciting|danger|escape|brave)\b/)) {
    return {
      mood: 'exciting',
      energy: 'high',
      tone: 'energetic and dynamic',
      pacing: 'quick and animated',
      expression: 'build excitement and energy'
    };
  }
  
  // Mysterious/Suspenseful scenes
  if (text.match(/\b(dark|mysterious|shadow|whisper|secret|hidden|strange|quiet|careful|slowly|creeping)\b/)) {
    return {
      mood: 'mysterious',
      energy: 'low',
      tone: 'hushed and intriguing',
      pacing: 'slow and deliberate',
      expression: 'whisper secrets, build suspense'
    };
  }
  
  // Sad/Emotional scenes
  if (text.match(/\b(sad|cry|tears|lonely|lost|hurt|scared|worried|afraid|sorry|goodbye)\b/)) {
    return {
      mood: 'emotional',
      energy: 'gentle',
      tone: 'compassionate and tender',
      pacing: 'slow and caring',
      expression: 'show empathy and comfort'
    };
  }
  
  // Happy/Joyful scenes
  if (text.match(/\b(happy|laugh|giggle|smile|joy|celebrate|party|dance|fun|excited|wonderful|amazing)\b/)) {
    return {
      mood: 'joyful',
      energy: 'high',
      tone: 'cheerful and bright',
      pacing: 'lively and upbeat',
      expression: 'share the happiness and excitement'
    };
  }
  
  // Gentle/Peaceful scenes
  if (text.match(/\b(gentle|peaceful|sleep|quiet|soft|calm|love|tender|sweet|cozy|warm|dream|rest)\b/)) {
    return {
      mood: 'gentle',
      energy: 'low',
      tone: 'soothing and warm',
      pacing: 'slow and peaceful',
      expression: 'be comforting and nurturing'
    };
  }
  
  // Dialogue-heavy scenes
  if (text.includes('"') && text.split('"').length > 4) {
    return {
      mood: 'conversational',
      energy: 'medium',
      tone: 'natural and expressive',
      pacing: 'varied with character voices',
      expression: 'give each character their own personality'
    };
  }
  
  // Default balanced narration
  return {
    mood: 'storytelling',
    energy: 'medium',
    tone: 'warm and engaging',
    pacing: 'steady with natural rhythm',
    expression: 'be captivating and clear'
  };
};

// Helper to clean text for story narration (preserve context, remove formatting)
export const cleanTextForTTS = (text) => {
  if (!text) return '';
  
  return text
    // Convert markdown headers to natural speech breaks
    .replace(/^#+\s*(.+)$/gm, '$1.') 
    // Remove markdown bold/italic formatting but keep the text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    // Remove HTML tags if any
    .replace(/<[^>]*>/g, '')
    // Preserve sentence structure and natural pauses
    .replace(/\n\s*\n/g, '. ')  // Double line breaks become sentence endings
    .replace(/\n/g, ' ')        // Single line breaks become spaces
    // Clean up multiple spaces but preserve sentence structure
    .replace(/\s+/g, ' ')
    // Ensure proper sentence endings
    .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
    .trim();
};