import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import StoryControls from './StoryControls';
import audioService, { cleanTextForTTS, getStoryVoice } from '../services/audioApi';

// Helper to split story into scenes based on paragraphs or scene markers
const splitIntoScenes = (story) => {
  if (!story) return [''];
  
  // Try splitting by scene markers first (## Scene, --- dividers, etc.)
  let scenes = story.split(/(?:^|\n)(?:##\s*Scene|\-{3,}|\*{3,})/i);
  
  // If no clear scene markers, split by double line breaks (paragraph breaks)
  if (scenes.length === 1) {
    scenes = story.split(/\n\s*\n/).filter(s => s.trim().length > 0);
  }
  
  // If still one big block, split by sentences (fallback)
  if (scenes.length === 1 && story.length > 300) {
    const sentences = story.split(/(?<=[.!?])\s+/);
    scenes = [];
    let currentScene = '';
    
    for (const sentence of sentences) {
      if (currentScene.length + sentence.length > 250) {
        if (currentScene) scenes.push(currentScene.trim());
        currentScene = sentence;
      } else {
        currentScene += ' ' + sentence;
      }
    }
    if (currentScene.trim()) scenes.push(currentScene.trim());
  }
  
  return scenes.filter(scene => scene.trim().length > 0);
};

// Helper to parse simple markdown-like formatting in story text
const parseStoryMarkdown = (text) => {
  if (!text) return '';
  
  // Split by lines and process each
  const lines = text.split('\n').map((line, idx) => {
    let content = line;
    
    // **bold** -> <strong>
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // *italic* -> <em>
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // # Heading -> <h2>
    if (content.startsWith('# ')) {
      content = `<h2 style="font-size: 1.5em; margin-bottom: 0.5em; font-weight: bold;">${content.slice(2)}</h2>`;
    }
    // ## Subheading -> <h3>
    else if (content.startsWith('## ')) {
      content = `<h3 style="font-size: 1.25em; margin-bottom: 0.5em; font-weight: bold;">${content.slice(3)}</h3>`;
    }
    
    return content || '<br/>'; // Empty lines become breaks
  });
  
  return lines.join('');
};

// Extract a story title from the first line or heading, fallback to truncated prompt
const extractStoryTitle = (story, prompt) => {
  if (!story) return prompt?.slice(0, 30) + '...' || 'Your Story';
  
  const firstLine = story.split('\n')[0]?.trim();
  if (firstLine?.startsWith('#')) {
    return firstLine.replace(/^#+\s*/, '');
  }
  if (firstLine && firstLine.length < 60) {
    return firstLine;
  }
  return prompt?.slice(0, 30) + '...' || 'Your Story';
};

// Full-screen story viewer overlay using Pollinations image as background
const StoryViewer = ({ story, prompt, onClose }) => {
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [imageError, setImageError] = useState('');
  
  // Create a unique story ID for localStorage
  const storyId = useMemo(() => {
    if (!story || !prompt) return null;
    // Create a simple hash from story content and prompt (Unicode-safe)
    const content = story.slice(0, 100) + prompt.slice(0, 50);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).slice(0, 16);
  }, [story, prompt]);

  // Scene navigation state with localStorage persistence
  const [currentScene, setCurrentScene] = useState(() => {
    if (storyId) {
      const saved = localStorage.getItem(`story_${storyId}_scene`);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  
  const [audioMode, setAudioMode] = useState(() => {
    if (storyId) {
      const saved = localStorage.getItem(`story_${storyId}_audio`);
      return saved === 'true';
    }
    return false;
  });
  
  // Audio playback state
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    error: null,
    loadingProgress: 0
  });

  // Loading timer for user feedback (only for current scene)
  const [loadingTimer, setLoadingTimer] = useState(0);

  // Pre-generated audio URLs for all scenes
  const [sceneAudioUrls, setSceneAudioUrls] = useState([]);

  // Track which scenes have audio ready vs loading
  const [audioReadyStatus, setAudioReadyStatus] = useState([]);
  
  // Split story into scenes
  const scenes = useMemo(() => splitIntoScenes(story), [story]);
  const currentSceneText = scenes[currentScene] || story;

  // Refs for cleanup
  const handleCloseRef = useRef();
  const timeoutRefs = useRef(new Set());
  const intervalRefs = useRef(new Set());
  
  // Helper functions to track timeouts/intervals
  const addTimeout = useCallback((timeoutId) => {
    timeoutRefs.current.add(timeoutId);
    return timeoutId;
  }, []);
  
  const addInterval = useCallback((intervalId) => {
    intervalRefs.current.add(intervalId);
    return intervalId;
  }, []);
  
  const clearAllTimers = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout);
    intervalRefs.current.forEach(clearInterval);
    timeoutRefs.current.clear();
    intervalRefs.current.clear();
  }, []);
  
  const handleClose = useCallback(() => {
    // Immediately stop all audio playback
    audioService.stop();
    
    // Clear all timers
    clearAllTimers();
    
    // Reset all audio state
    setAudioState({
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      error: null,
      ended: false
    });
    
    // Turn off audio mode
    setAudioMode(false);
    
    // Clear any loading timers
    setLoadingTimer(0);
    
    // Call original close handler
    if (onClose) {
      onClose();
    }
  }, [onClose, clearAllTimers]);

  // Store the stable reference
  handleCloseRef.current = handleClose;

  // Extract story title from content - memoize to prevent unnecessary re-runs
  const storyTitle = useMemo(() => extractStoryTitle(story, prompt), [story, prompt]);

  // Pre-generate audio URLs immediately when story is loaded (just generate URLs, don't pre-load)
  useEffect(() => {
    if (story && scenes.length > 0 && sceneAudioUrls.length !== scenes.length) {
      const audioUrls = scenes.map((sceneText, index) => {
        const cleanText = cleanTextForTTS(sceneText);
        const voice = getStoryVoice(sceneText, index + 1); // Smart voice selection
        const url = audioService.generateStoryAudioUrl(
          cleanText, 
          index + 1, // Scene number (1-based)
          scenes.length, // Total scenes
          storyTitle, // Story title for context
          voice // Dynamic voice based on scene content
        );
        
        return url;
      });
      
      setSceneAudioUrls(audioUrls);
      // Initialize all scenes as not ready
      setAudioReadyStatus(new Array(scenes.length).fill(false));
    }
  }, [story, scenes, storyTitle, sceneAudioUrls.length]);

  // Background pre-processing: Only pre-load next scene when current one is halfway through
  useEffect(() => {
    if (audioState.isPlaying && 
        !audioState.error && 
        audioState.duration > 0 && 
        audioState.currentTime > audioState.duration * 0.5) { // Only preload when 50% through
      
      // Pre-load next scene audio in background
      const nextSceneIndex = currentScene + 1;
      if (nextSceneIndex < scenes.length && 
          audioReadyStatus[nextSceneIndex] !== 'loading' && 
          audioReadyStatus[nextSceneIndex] !== true) {
        preloadSceneAudio(nextSceneIndex);
      }
    }
  }, [audioState.isPlaying, audioState.currentTime, audioState.duration, audioState.error, currentScene, scenes.length, audioReadyStatus]);

  // Pre-load audio for a specific scene (background process) - memoized
  const preloadSceneAudio = useCallback(async (sceneIndex) => {
    if (sceneIndex >= sceneAudioUrls.length) return;
    
    // Skip if already attempting to preload this scene
    if (audioReadyStatus[sceneIndex] === 'loading') return;
    
    const audioUrl = sceneAudioUrls[sceneIndex];
    
    // Mark as loading to prevent duplicate attempts
    setAudioReadyStatus(prev => {
      const newStatus = [...prev];
      newStatus[sceneIndex] = 'loading';
      return newStatus;
    });
    
    try {
      // Create a temporary audio element to pre-load
      const preloadAudio = new Audio();
      preloadAudio.crossOrigin = 'anonymous';
      preloadAudio.preload = 'metadata'; // Only load metadata, not full audio
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Pre-load timeout'));
        }, 15000); // Reduced timeout to 15 seconds

        const cleanup = () => {
          clearTimeout(timeout);
          preloadAudio.removeEventListener('loadedmetadata', onLoaded);
          preloadAudio.removeEventListener('error', onError);
          preloadAudio.src = ''; // Clear source to stop loading
        };

        const onLoaded = () => {
          cleanup();
          setAudioReadyStatus(prev => {
            const newStatus = [...prev];
            newStatus[sceneIndex] = true;
            return newStatus;
          });
          resolve();
        };

        const onError = () => {
          cleanup();
          setAudioReadyStatus(prev => {
            const newStatus = [...prev];
            newStatus[sceneIndex] = false;
            return newStatus;
          });
          reject();
        };

        preloadAudio.addEventListener('loadedmetadata', onLoaded, { once: true });
        preloadAudio.addEventListener('error', onError, { once: true });
        preloadAudio.src = audioUrl;
      });
    } catch (error) {
      // Set as failed
      setAudioReadyStatus(prev => {
        const newStatus = [...prev];
        newStatus[sceneIndex] = false;
        return newStatus;
      });
    }
  }, [sceneAudioUrls, audioReadyStatus]);

  // Save progress to localStorage when scene or audio mode changes
  useEffect(() => {
    if (storyId) {
      localStorage.setItem(`story_${storyId}_scene`, currentScene.toString());
      localStorage.setItem(`story_${storyId}_audio`, audioMode.toString());
    }
  }, [currentScene, audioMode, storyId]);

  // Memoized navigation handlers to prevent unnecessary re-renders
  const handlePreviousScene = useCallback(() => {
    if (currentScene > 0) {
      // Stop current audio and reset state if playing
      if (audioMode && (audioState.isPlaying || audioState.isLoading)) {
        audioService.stop();
        setAudioState({
          isPlaying: false,
          isLoading: false,
          currentTime: 0,
          duration: 0,
          error: null
        });
      }
      setCurrentScene(currentScene - 1);
      // The useEffect will handle auto-playing the new scene
    }
  }, [currentScene, audioMode, audioState.isPlaying, audioState.isLoading]);

  const handleNextScene = useCallback(() => {
    if (currentScene < scenes.length - 1) {
      // Stop current audio and reset state if playing
      if (audioMode && (audioState.isPlaying || audioState.isLoading)) {
        audioService.stop();
        setAudioState({
          isPlaying: false,
          isLoading: false,
          currentTime: 0,
          duration: 0,
          error: null
        });
      }
      setCurrentScene(currentScene + 1);
      // The useEffect will handle auto-playing the new scene
    }
  }, [currentScene, scenes.length, audioMode, audioState.isPlaying, audioState.isLoading]);

  // Auto-play logic - consolidated to prevent conflicts
  useEffect(() => {
    // Only auto-play if:
    // 1. Audio mode is on
    // 2. Not currently loading or playing  
    // 3. No current error (to prevent retry loops)
    // 4. Audio is not stuck in ready state
    if (audioMode && 
        !audioState.isLoading && 
        !audioState.isPlaying && 
        !audioState.error &&
        !audioState.ended) {
      
      const playTimeout = setTimeout(() => {
        playCurrentScene();
      }, 200);
      
      return () => clearTimeout(playTimeout);
    }
  }, [currentScene, audioMode, audioState.isLoading, audioState.isPlaying, audioState.error, audioState.ended]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Prevent default behavior for handled keys
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (currentScene > 0) {
            handlePreviousScene();
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (currentScene < scenes.length - 1) {
            handleNextScene();
          }
          break;
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          handleAudioToggle();
          break;
        case 'Escape':
          event.preventDefault();
          handleCloseRef.current();
          break;
        default:
          return; // Don't prevent default for other keys
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentScene, scenes.length, audioMode]);

  // Cleanup audio and timers when component unmounts
  useEffect(() => {
    return () => {
      audioService.stop();
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const handleAudioToggle = useCallback(async () => {
    if (audioMode) {
      // Turning off audio mode - stop playback
      audioService.stop();
      setAudioMode(false);
      setAudioState({
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
        error: null
      });
    } else {
      // Turning on audio mode - start playing current scene
      setAudioMode(true);
      // The useEffect will handle auto-playing
    }
  }, [audioMode]);

  const playCurrentScene = useCallback(async (sceneIndex = null) => {
    // Use provided scene index or current scene
    const targetScene = sceneIndex !== null ? sceneIndex : currentScene;
    
    // Prevent multiple simultaneous playback attempts
    if (audioState.isLoading || audioState.isPlaying) {
      return;
    }
    
    try {
      const audioUrl = sceneAudioUrls[targetScene];
      if (!audioUrl) {
        console.warn(`No audio URL available for scene ${targetScene + 1}`);
        return;
      }

      // Playing current scene audio

      // Only show loading timer if this scene hasn't been pre-loaded
      let timerInterval = null;
      if (!audioReadyStatus[targetScene]) {
        setLoadingTimer(0);
        timerInterval = setInterval(() => {
          setLoadingTimer(prev => prev + 1);
        }, 1000);
      }

      await audioService.playFromUrl(audioUrl, (state) => {
        setAudioState(prevState => ({ ...prevState, ...state }));
        
        // Clear timer when audio starts playing or stops loading
        if (!state.isLoading && timerInterval) {
          clearInterval(timerInterval);
          setLoadingTimer(0);
        }
        
        // Mark current scene as ready once it plays successfully
        if (state.isPlaying && !audioReadyStatus[targetScene]) {
          setAudioReadyStatus(prev => {
            const newStatus = [...prev];
            newStatus[targetScene] = true;
            return newStatus;
          });
        }
        
        // Auto-advance to next scene when current scene finishes (maintain audio mode)
        if (state.ended && targetScene < scenes.length - 1 && audioMode) {
          // Set ended flag to prevent immediate replay and let the scene change trigger new audio
          setAudioState(prevState => ({
            ...prevState,
            isPlaying: false,
            isLoading: false,
            currentTime: 0,
            duration: 0,
            error: null,
            ended: true // Keep ended flag to prevent auto-play until scene changes
          }));
          setTimeout(() => {
            setCurrentScene(targetScene + 1); // Use targetScene + 1 to advance properly
            // Reset ended flag after scene change to allow new playback
            setTimeout(() => {
              setAudioState(prevState => ({
                ...prevState,
                ended: false
              }));
            }, 100);
          }, 300); // Quick transition for smooth story flow
        } else if (state.ended) {
          // Keep audio mode on but keep ended state to prevent auto-replay
          setAudioState(prevState => ({
            ...prevState,
            isPlaying: false,
            isLoading: false,
            ended: true // Keep ended=true to prevent auto-play loop at story completion
          }));
        }
      });

      if (timerInterval) clearInterval(timerInterval);
    } catch (error) {
      console.error('Error playing scene audio:', error);
      
      // Clear loading timer
      setLoadingTimer(0);
      
      // Show user-friendly error message
      const friendlyError = error.message.includes('timeout') 
        ? 'Audio generation took too long. Pollinations may be busy - please try again.'
        : error.message.includes('Pollinations') 
        ? 'Audio service temporarily unavailable. Please try again later.'
        : 'Unable to play audio. Please check your connection.';
        
      setAudioState(prevState => ({ 
        ...prevState, 
        error: friendlyError,
        isLoading: false,
        isPlaying: false
      }));
      
      // Clear error after a few seconds to allow retry
      addTimeout(setTimeout(() => {
        setAudioState(prevState => ({ 
          ...prevState, 
          error: null 
        }));
      }, 3000));

      // Don't auto-disable audio mode for Pollinations errors - let user decide
      // Only disable for genuine critical errors like network issues
      if (!error.message.includes('Pollinations') && 
          !error.message.includes('timeout') && 
          !error.message.includes('busy') &&
          !error.message.includes('loading failed')) {
        addTimeout(setTimeout(() => {
          setAudioMode(false);
          setAudioState({
            isPlaying: false,
            isLoading: false,
            currentTime: 0,
            duration: 0,
            error: null
          });
        }, 5000)); // Let user read error first
      }
    }
  }, [audioState.isLoading, audioState.isPlaying, sceneAudioUrls, currentScene, audioReadyStatus, audioMode, scenes.length]);

  // Build image URL from prompt (encode for URL). You can add width/height/model if desired.
  const imageUrl = useMemo(() => {
    if (!prompt) return '';
    const q = `A whimsical and colorful children's storybook illustration of: ${prompt}. Fantasy style, digital art.`;
    const base = `https://image.pollinations.ai/prompt/${encodeURIComponent(q)}`;
    const params = new URLSearchParams({ width: '1024', height: '768', seed: '42', model: 'flux' });
    return `${base}?${params.toString()}`;
  }, [prompt]);

  // Preload image to control loading state
  useEffect(() => {
    if (!imageUrl) return;
    setIsLoadingImage(true);
    setImageError('');
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => setIsLoadingImage(false);
    img.onerror = () => {
      setImageError('Could not load background image.');
      setIsLoadingImage(false);
    };
    img.src = imageUrl;
    return () => { img.onload = null; img.onerror = null; };
  }, [imageUrl]);

  // Animate content card position after image load
  const [anchored, setAnchored] = useState(false);
  useEffect(() => {
    if (!isLoadingImage) {
      const t = setTimeout(() => setAnchored(true), 50);
      return () => clearTimeout(t);
    }
    setAnchored(false);
  }, [isLoadingImage]);

  return (
    <div className="fixed inset-0 z-50" style={{ backgroundColor: '#0b1220', color: '#fff' }}>
      {/* Background image using <img> to avoid black screen */}
      <img
        src={imageUrl}
        alt="Story background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: isLoadingImage ? 'blur(2px)' : 'none', opacity: imageError ? 0 : 1 }}
      />
      {/* Fallback if image fails */}
      {imageError && (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0b1220, #1f2937)' }} />
      )}

      {/* Loading overlay with progress indicators */}
      {isLoadingImage && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            {/* Animated book icon */}
            <div className="relative mb-6">
              <div className="w-16 h-16 mx-auto">
                <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-white/70 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-3 bg-white/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold mb-2">Creating your magical scene...</h3>
            <p className="text-white/80 text-sm mb-4">
              Generating beautiful artwork to bring your story to life
            </p>
            
            {/* Progress dots */}
            <div className="flex justify-center space-x-2">
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Top bar with story title and close */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div 
          className="text-2xl font-semibold max-w-xs truncate"
          style={{ 
            textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
            color: '#fff'
          }}
        >
          {storyTitle}
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className="h-10 px-4 rounded-md text-sm font-semibold shadow-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#111827' }}
          >
            Back
          </button>
        )}
      </div>

      {/* Story content card: responsive positioning */}
      <div className={
        anchored 
          ? 'absolute right-4 sm:right-8 bottom-20 sm:bottom-8 max-w-sm sm:max-w-md lg:max-w-lg' 
          : 'absolute inset-0 flex items-center justify-center px-4 sm:px-6'
      } style={{ transition: 'all 600ms ease' }}>
        <div 
          className="rounded-xl p-4 sm:p-5 shadow-2xl max-h-60 sm:max-h-72 overflow-y-auto w-full" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.17)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}
        >
          <div 
            className="text-sm sm:text-base lg:text-lg leading-relaxed"
            style={{ 
              color: '#fff',
              textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,1)',
              fontWeight: '500',
              letterSpacing: '0.02em'
            }}
            dangerouslySetInnerHTML={{ __html: parseStoryMarkdown(currentSceneText) }}
          />
          {imageError && (
            <p className="mt-4 text-xs sm:text-sm" style={{ color: '#fecaca', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {imageError}
            </p>
          )}
          {audioState.error && (
            <p className="mt-4 text-xs sm:text-sm" style={{ color: '#fbbf24', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              🔊 {audioState.error}
            </p>
          )}
          {/* Audio progress visualization */}
          {audioMode && audioState.duration > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                <span>{Math.floor(audioState.currentTime / 60)}:{Math.floor(audioState.currentTime % 60).toString().padStart(2, '0')}</span>
                <span>{Math.floor(audioState.duration / 60)}:{Math.floor(audioState.duration % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, (audioState.currentTime / audioState.duration) * 100)}%`,
                    boxShadow: '0 0 8px rgba(147, 51, 234, 0.4)'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Scene controls (only show if we have multiple scenes) - responsive positioning */}
      {scenes.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-[280px] sm:max-w-[300px] px-4">
          <div 
            className="p-2 sm:p-2.5 rounded-full mx-auto min-w-[280px]"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.17)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <StoryControls
              currentScene={currentScene}
              totalScenes={scenes.length}
              onPrevious={handlePreviousScene}
              onNext={handleNextScene}
              audioMode={audioMode}
              onToggleAudio={handleAudioToggle}
              audioState={audioState}
              loadingTimer={loadingTimer}
              audioReadyStatus={audioReadyStatus}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
