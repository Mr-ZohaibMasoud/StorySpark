import React from 'react';

// Story controls component with scene navigation and audio mode toggle
const StoryControls = ({ 
  currentScene, 
  totalScenes, 
  onPrevious, 
  onNext, 
  audioMode, 
  onToggleAudio,
  audioState = {},
  loadingTimer = 0,
  audioReadyStatus = [],
  className = '',
  style = {}
}) => {
  const hasPrevious = currentScene > 0;
  const hasNext = currentScene < totalScenes - 1;
  
  // Check if next scene audio is ready (for background processing indicator)
  const nextSceneReady = hasNext ? audioReadyStatus[currentScene + 1] : true;
  const currentSceneReady = audioReadyStatus[currentScene];
  
  // Clean audio button text - simple and standardized
  const getAudioButtonText = () => {
    if (audioState.isLoading && loadingTimer > 0) {
      return `${loadingTimer}s`;
    }
    if (audioState.isLoading) {
      return 'Loading';
    }
    if (audioMode) {
      if (audioState.isPlaying) {
        return 'Playing';
      }
      if (audioState.error) {
        return 'Error';
      }
      if (audioState.ended) {
        return 'Audio'; // Show enable state when story has ended
      }
      return 'Ready';
    }
    return 'Audio';
  };

  return (
    <div 
      className={`flex flex-row items-center justify-between gap-1 sm:gap-2 lg:gap-3 ${className}`}
      style={style}
    >
      {/* Scene navigation */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Previous button */}
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full transition-all"
          style={{
            backgroundColor: hasPrevious ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: hasPrevious ? '#fff' : 'rgba(255,255,255,0.5)',
            cursor: hasPrevious ? 'pointer' : 'not-allowed'
          }}
          title="Previous scene"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>

        {/* Scene indicator */}
        <div 
          className="px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium rounded-full min-w-12 sm:min-w-17 max-w-16 sm:max-w-20 flex items-center justify-center text-center"
          style={{
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {currentScene + 1} / {totalScenes}
        </div>

        {/* Next button */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full transition-all"
          style={{
            backgroundColor: hasNext ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: hasNext ? '#fff' : 'rgba(255,255,255,0.5)',
            cursor: hasNext ? 'pointer' : 'not-allowed'
          }}
          title="Next scene"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* Audio mode toggle with dynamic width */}
      <button
        onClick={onToggleAudio}
        disabled={audioState.isLoading}
        className="h-8 sm:h-10 flex items-center gap-1 sm:gap-2 rounded-full text-xs sm:text-sm font-medium transition-all"
        style={{
          backgroundColor: audioMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(6px)',
          border: audioMode ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255,255,255,0.3)',
          color: '#fff',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          opacity: audioState.isLoading ? 0.7 : 1,
          cursor: audioState.isLoading ? 'not-allowed' : 'pointer',
          paddingLeft: '8px',
          paddingRight: '8px',
          minWidth: 'fit-content',
          whiteSpace: 'nowrap'
        }}
        title={audioMode ? 'Disable audio mode' : 'Enable audio mode'}
      >
        {audioState.isLoading ? (
          // Loading spinner
          <svg className="w-4 h-4 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="m14.31 8 5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M16.62 12l-5.74 9.94M9.69 16H21.17M14.31 16l-5.74-9.94"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {audioMode && audioState.isPlaying ? (
              // Playing icon
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </>
            ) : audioMode ? (
              // Paused icon
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <rect x="17" y="4" width="2" height="16"/>
                <rect x="21" y="4" width="2" height="16"/>
              </>
            ) : (
              // Muted icon
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </>
            )}
          </svg>
        )}
        <span className="whitespace-nowrap">
          {getAudioButtonText()}
        </span>
      </button>
    </div>
  );
};

export default StoryControls;