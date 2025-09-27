import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import StoryControls from './StoryControls';
import audioService from '../services/audioApi';
import { splitIntoScenes, parseStoryMarkdown, extractStoryTitle } from '../utils/storyProcessing';
import { useAudioManager } from '../hooks/useAudioManager';
import { useStoryNavigation } from '../hooks/useStoryNavigation';
import { StoryAPI } from '../services/storyApi';
import { generateOptimizedImageUrl } from '../utils/deviceDetection';



// Full-screen story viewer overlay using Pollinations image as background
const StoryViewer = ({ story, prompt, title, firstImageUrl, onClose, onReady }) => {
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [imageError, setImageError] = useState('');
  const [sceneImageUrls, setSceneImageUrls] = useState([]);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [imageLoadingProgress, setImageLoadingProgress] = useState(0);
  const [aiGeneratedTitle, setAiGeneratedTitle] = useState('');
  
  // Create a unique story ID for localStorage
  const storyId = useMemo(() => {
    if (!story || !prompt) return null;
    // Create a simple hash from story content and prompt
    const content = story.slice(0, 100) + prompt.slice(0, 50);
    return btoa(content).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  }, [story, prompt]);

  // Scene navigation state with localStorage persistence
  const [currentScene, setCurrentScene] = useState(() => {
    if (storyId) {
      const saved = localStorage.getItem(`story_${storyId}_scene`);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  

  
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

  // Use AI-generated title if available, fallback to extracted title
  const storyTitle = useMemo(() => {
    if (aiGeneratedTitle) {
      return aiGeneratedTitle;
    }
    return extractStoryTitle(story, prompt);
  }, [aiGeneratedTitle, story, prompt]);

  // Audio management hook
  const {
    audioMode,
    setAudioMode,
    audioState,
    loadingTimer,
    sceneAudioUrls,
    audioReadyStatus,
    playCurrentScene,
    preloadSceneAudio,
    handleAudioToggle
  } = useAudioManager(story, scenes, currentScene, storyId, storyTitle, addTimeout, setCurrentScene);
  
  // Navigation management hook
  const {
    handlePreviousScene,
    handleNextScene,
    canGoPrevious,
    canGoNext,
    isFirstScene,
    isLastScene
  } = useStoryNavigation(
    currentScene,
    setCurrentScene,
    scenes,
    audioMode,
    audioState,
    handleAudioToggle,
    handleCloseRef
  );
  
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
    
    // Turn off audio mode (the hook will handle the audio state reset)
    setAudioMode(false);
    
    // Call original close handler
    if (onClose) {
      onClose();
    }
  }, [onClose, clearAllTimers, setAudioMode]);

  // Store the stable reference
  handleCloseRef.current = handleClose;

  // Pre-load audio for a specific scene (background process) - memoized


  // Save progress to localStorage when scene or audio mode changes
  useEffect(() => {
    if (storyId) {
      localStorage.setItem(`story_${storyId}_scene`, currentScene.toString());
      localStorage.setItem(`story_${storyId}_audio`, audioMode.toString());
    }
  }, [currentScene, audioMode, storyId]);

  // Keyboard navigation support is now handled by useStoryNavigation hook

  // Use the title passed from parent, or extract from story as fallback
  useEffect(() => {
    if (title) {
      setAiGeneratedTitle(title);
      if (onReady) {
        onReady(title);
      }
    } else {
      // Fallback to extracting from story if no title provided
      const extractedTitle = extractStoryTitle(story) || storyTitle;
      setAiGeneratedTitle(extractedTitle);
      if (onReady) {
        onReady(extractedTitle);
      }
    }
  }, [story, title, onReady, storyTitle]);  // Cleanup audio and timers when component unmounts
  useEffect(() => {
    return () => {
      audioService.stop();
      clearAllTimers();
    };
  }, [clearAllTimers]);



  // Initialize images - use pre-generated first image if available
  useEffect(() => {
    const initializeImages = async () => {
      if (!story || !scenes.length || sceneImageUrls.length > 0) return;
      
      setIsLoadingImages(false); // Not loading since we have first image
      setImageError('');
      
      try {
        // Initialize with first scene image if provided, otherwise generate
        const initialUrls = new Array(scenes.length).fill(null);
        
        if (firstImageUrl) {
          // Use pre-generated first image
          initialUrls[0] = firstImageUrl;
          setSceneImageUrls(initialUrls);
          setCurrentImageUrl(firstImageUrl);
          
          // Generate prompts for remaining scenes in background
          setTimeout(async () => {
            try {
              const result = await StoryAPI.generateSceneImagePrompts(scenes, storyTitle);
              if (result.imagePrompts && result.imagePrompts.length > 0) {
                window.storyImagePrompts = result.imagePrompts;
                // Start background generation of remaining scenes (skip first)
                generateRemainingScenes(result.imagePrompts, initialUrls, 1);
              }
            } catch (error) {
              console.warn('Background image prompt generation failed:', error);
            }
          }, 500);
          
        } else {
          // Fallback to original logic if no pre-generated image
          const result = await StoryAPI.generateSceneImagePrompts(scenes, storyTitle);
          
          if (result.imagePrompts && result.imagePrompts.length > 0) {
            const firstPrompt = result.imagePrompts[0];
            const enhancedPrompt = `${firstPrompt}. Whimsical children's book illustration, colorful digital art, fantasy style, child-friendly, engaging storybook artwork.`;
            
            // Generate device-optimized first image URL
            const generatedFirstImageUrl = generateOptimizedImageUrl(enhancedPrompt, 42);
            
            initialUrls[0] = generatedFirstImageUrl;
            setSceneImageUrls(initialUrls);
            setCurrentImageUrl(generatedFirstImageUrl);
            
            window.storyImagePrompts = result.imagePrompts;
            setTimeout(() => generateRemainingScenes(result.imagePrompts, initialUrls), 1000);
          } else {
            throw new Error('No image prompts generated');
          }
        }
      } catch (error) {
        console.error('First scene image generation failed:', error);
        setImageError('Could not generate scene image.');
        
        // Fallback to generic image for first scene
        const fallbackPrompt = `A whimsical and colorful children's storybook illustration of: ${prompt}. Fantasy style, digital art, child-friendly, magical`;
        console.log('Using fallback prompt:', fallbackPrompt);
        
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fallbackPrompt)}?width=1024&height=768&seed=42&model=flux`;
        console.log('Fallback image URL:', fallbackUrl);
        
        const initialUrls = new Array(scenes.length).fill(null);
        initialUrls[0] = fallbackUrl;
        setSceneImageUrls(initialUrls);
        setCurrentImageUrl(fallbackUrl);
        setIsLoadingImages(false); // Stop loading state
      } finally {
        setIsLoadingImages(false); // Ensure loading state is always cleared
      }
    };
    
    initializeImages();
  }, [story, scenes, storyTitle, prompt, firstImageUrl]);

  // Background generation of remaining scene images
  const generateRemainingScenes = useCallback(async (imagePrompts, currentUrls, startIndex = 1) => {
    // Starting background generation of remaining scenes
    for (let i = startIndex; i < imagePrompts.length; i++) {
      try {
        const prompt = imagePrompts[i];
        const enhancedPrompt = `${prompt}. Whimsical children's book illustration, colorful digital art, fantasy style, child-friendly, engaging storybook artwork.`;
        
        // Generate device-optimized image URL for each scene
        const imageUrl = generateOptimizedImageUrl(enhancedPrompt, 42 + i);
        
        // Test if image is ready by preloading
        await new Promise((resolve, reject) => {
          const testImg = new Image();
          testImg.crossOrigin = 'anonymous';
          
          const timeout = setTimeout(() => {
            reject(new Error('Image generation timeout'));
          }, 30000); // 30s timeout per image
          
          testImg.onload = () => {
            clearTimeout(timeout);
            // Scene image ready
            
            // Update the URL array with new image
            setSceneImageUrls(prevUrls => {
              const newUrls = [...prevUrls];
              newUrls[i] = imageUrl;
              return newUrls;
            });
            
            resolve();
          };
          
          testImg.onerror = () => {
            clearTimeout(timeout);
            // Scene image failed to generate - using fallback
            reject();
          };
          
          testImg.src = imageUrl;
        });
        
        // Small delay between generations to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        // Failed to generate image for scene - will use fallback
        // Continue with next image even if one fails
      }
    }
    
    // Background image generation completed
  }, []);

  // Update current image when scene changes - handle progressive loading
  useEffect(() => {
    if (sceneImageUrls.length > 0) {
      const newImageUrl = sceneImageUrls[currentScene];
      
      if (newImageUrl && newImageUrl !== currentImageUrl) {
        // Image is ready, switch to it
        setCurrentImageUrl(newImageUrl);
      } else if (!newImageUrl && sceneImageUrls[0]) {
        // Image not ready yet, use first scene as fallback
        console.log(`Scene ${currentScene + 1} image not ready yet, using first scene as fallback`);
        setCurrentImageUrl(sceneImageUrls[0]);
        
        // Try to generate this specific scene image on-demand
        generateSceneImageOnDemand(currentScene);
      }
    }
  }, [currentScene, sceneImageUrls, currentImageUrl]);

  // Generate specific scene image on-demand when user navigates to unready scene
  const generateSceneImageOnDemand = useCallback(async (sceneIndex) => {
    if (!window.storyImagePrompts || !window.storyImagePrompts[sceneIndex]) return;
    
    try {
      // Generating scene image on demand
      const prompt = window.storyImagePrompts[sceneIndex];
      const enhancedPrompt = `${prompt}. Whimsical children's book illustration, colorful digital art, fantasy style, child-friendly, engaging storybook artwork.`;
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=768&seed=${42 + sceneIndex}&model=flux&enhance=true`;
      
      // Update URL immediately (optimistic update)
      setSceneImageUrls(prevUrls => {
        const newUrls = [...prevUrls];
        newUrls[sceneIndex] = imageUrl;
        return newUrls;
      });
      
      // Switch to the new image
      setCurrentImageUrl(imageUrl);
      
    } catch (error) {
      console.warn(`Failed to generate scene ${sceneIndex + 1} image on demand:`, error);
    }
  }, []);

  // Preload current scene image
  useEffect(() => {
    if (!currentImageUrl) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const handleLoad = () => {
      setIsLoadingImages(false);
      setImageLoadingProgress(100);
    };
    
    const handleError = () => {
      setImageError('Could not load scene image.');
      setIsLoadingImages(false);
      setImageLoadingProgress(0);
    };
    
    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = currentImageUrl;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [currentImageUrl]);

  // Smart preloading: prioritize next scene if not generated yet
  useEffect(() => {
    if (sceneImageUrls.length > 0 && currentScene < sceneImageUrls.length - 1) {
      const nextImageUrl = sceneImageUrls[currentScene + 1];
      
      if (nextImageUrl) {
        // Next scene image exists, preload it
        const preloadImg = new Image();
        preloadImg.crossOrigin = 'anonymous';
        preloadImg.src = nextImageUrl;
      } else if (window.storyImagePrompts && window.storyImagePrompts[currentScene + 1]) {
        // Next scene image doesn't exist yet, generate it with priority
                  // Prioritizing generation of next scene image
        generateSceneImageOnDemand(currentScene + 1);
      }
    }
  }, [currentScene, sceneImageUrls, generateSceneImageOnDemand]);

  // Animate content card position after images load
  const [anchored, setAnchored] = useState(false);
  useEffect(() => {
    if (!isLoadingImages) {
      const t = setTimeout(() => setAnchored(true), 50);
      return () => clearTimeout(t);
    }
    setAnchored(false);
  }, [isLoadingImages]);

  return (
    <div className="fixed inset-0 z-50" style={{ backgroundColor: '#0b1220', color: '#fff' }}>
      {/* Dynamic scene-based background image */}
      {currentImageUrl && (
        <img
          src={currentImageUrl}
          alt={`Story scene ${currentScene + 1}`}
          className="story-image absolute inset-0"
          style={{ 
            opacity: imageError ? 0 : 1
          }}
        />
      )}
      {/* Fallback if image fails */}
      {imageError && (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0b1220, #1f2937)' }} />
      )}



      {/* Top bar with story title and close */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3">
        <div 
          className="text-lg sm:text-xl lg:text-2xl font-semibold flex-1 min-w-0 flex items-center gap-2"
          style={{ 
            textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
            color: '#fff'
          }}
        >
          {!aiGeneratedTitle && storyTitle.includes('...') ? (
            <>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="m14.31 8 5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M16.62 12l-5.74 9.94M9.69 16H21.17M14.31 16l-5.74-9.94"/>
              </svg>
              <span className="text-sm sm:text-base lg:text-lg opacity-75 truncate">Creating title...</span>
            </>
          ) : (
            <span className="truncate">{storyTitle}</span>
          )}
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className="h-8 sm:h-10 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-semibold shadow-lg flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#111827' }}
          >
            <span className="hidden sm:inline">Back</span>
            <span className="sm:hidden">✕</span>
          </button>
        )}
      </div>

      {/* Story content card: responsive positioning */}
      <div className={
        anchored 
          ? 'absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-8 bottom-20 sm:bottom-8 w-[90%] max-w-md sm:max-w-md lg:max-w-lg' 
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
          {/* Background image generation progress */}
          {sceneImageUrls.length > 0 && sceneImageUrls.filter(url => url !== null).length < scenes.length && (
            <div className="mt-4">
              {/* <p className="text-xs text-white/60 mb-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                🎨 Generating scene images: {sceneImageUrls.filter(url => url !== null).length}/{scenes.length}
              </p> */}
              {/* <div className="w-full bg-white/20 rounded-full h-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${(sceneImageUrls.filter(url => url !== null).length / scenes.length) * 100}%`,
                    boxShadow: '0 0 6px rgba(168, 85, 247, 0.4)'
                  }}
                />
              </div> */}
            </div>
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
            className="story-controls-container p-2 sm:p-2.5 rounded-full mx-auto min-w-[280px]"
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
              className="story-nav-controls"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
