import { useState, useCallback, useEffect } from 'react';
import audioService, { cleanTextForTTS, getStoryVoice, getConsistentStoryVoice } from '../services/audioApi';

export const useAudioManager = (story, scenes, currentScene, storyId, storyTitle, addTimeout, setCurrentScene) => {
  // Audio mode state with localStorage persistence
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

  // Pre-generate audio URLs immediately when story is loaded (just generate URLs, don't pre-load)
  useEffect(() => {
    if (story && scenes.length > 0 && sceneAudioUrls.length !== scenes.length) {
      // Get consistent voice for entire story (analyze full story once)
      const consistentVoice = getConsistentStoryVoice(storyTitle, story);
      
      const audioUrls = scenes.map((sceneText, index) => {
        const cleanText = cleanTextForTTS(sceneText);
        const url = audioService.generateStoryAudioUrl(
          cleanText, 
          index + 1, // Scene number (1-based)
          scenes.length, // Total scenes
          storyTitle, // Story title for context
          consistentVoice // SAME voice for ALL scenes - maintains flow continuity
        );
        
        return url;
      });
      
      setSceneAudioUrls(audioUrls);
      // Initialize all scenes as not ready
      setAudioReadyStatus(new Array(scenes.length).fill(false));
    }
  }, [story, scenes, storyTitle, sceneAudioUrls.length]);

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
  }, [audioState.isPlaying, audioState.currentTime, audioState.duration, audioState.error, currentScene, scenes.length, audioReadyStatus, preloadSceneAudio]);

  // Play current scene function - matches original exactly (moved before auto-play useEffect)
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
  }, [audioState.isLoading, audioState.isPlaying, sceneAudioUrls, currentScene, audioReadyStatus, audioMode, scenes.length, addTimeout, setCurrentScene]);

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
  }, [currentScene, audioMode, audioState.isLoading, audioState.isPlaying, audioState.error, audioState.ended, playCurrentScene]);

  // Audio cleanup function
  const cleanupAudio = useCallback(() => {
    // Immediately stop all audio playback
    audioService.stop();
    
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
  }, []);

  // Handle audio toggle
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

  return {
    // State
    audioMode,
    setAudioMode,
    audioState,
    setAudioState,
    loadingTimer,
    setLoadingTimer,
    sceneAudioUrls,
    audioReadyStatus,
    
    // Functions
    handleAudioToggle,
    playCurrentScene,
    preloadSceneAudio,
    cleanupAudio
  };
};
