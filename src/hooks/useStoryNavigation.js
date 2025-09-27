import { useCallback, useEffect } from 'react';
import audioService from '../services/audioApi';

/**
 * Custom hook for managing story scene navigation
 * Handles scene transitions, keyboard navigation, and audio coordination
 */
export const useStoryNavigation = (
  currentScene,
  setCurrentScene,
  scenes,
  audioMode,
  audioState,
  handleAudioToggle,
  handleCloseRef
) => {
  // Memoized navigation handlers to prevent unnecessary re-renders
  const handlePreviousScene = useCallback(() => {
    if (currentScene > 0) {
      // Stop current audio if playing (hook will handle state management)
      if (audioMode && (audioState.isPlaying || audioState.isLoading)) {
        audioService.stop();
      }
      setCurrentScene(currentScene - 1);
    }
  }, [currentScene, audioMode, audioState.isPlaying, audioState.isLoading, setCurrentScene]);

  const handleNextScene = useCallback(() => {
    if (currentScene < scenes.length - 1) {
      // Stop current audio if playing (hook will handle state management)
      if (audioMode && (audioState.isPlaying || audioState.isLoading)) {
        audioService.stop();
      }
      setCurrentScene(currentScene + 1);
    }
  }, [currentScene, scenes.length, audioMode, audioState.isPlaying, audioState.isLoading, setCurrentScene]);

  // Navigation state helpers
  const canGoPrevious = currentScene > 0;
  const canGoNext = currentScene < scenes.length - 1;
  const isFirstScene = currentScene === 0;
  const isLastScene = currentScene === scenes.length - 1;

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Prevent default behavior for handled keys
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (canGoPrevious) {
            handlePreviousScene();
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (canGoNext) {
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
  }, [canGoPrevious, canGoNext, handlePreviousScene, handleNextScene, handleAudioToggle, handleCloseRef]);

  return {
    // Navigation functions
    handlePreviousScene,
    handleNextScene,
    
    // Navigation state
    canGoPrevious,
    canGoNext,
    isFirstScene,
    isLastScene
  };
};