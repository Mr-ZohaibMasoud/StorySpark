import React, { useState } from 'react'
import './App.css'
import MainContent from './components/Main_Content'
import StoryViewer from './components/StoryViewer'
import StoryLoadingScreen from './components/StoryLoadingScreen'

function App() {
  const [view, setView] = useState('editor'); // 'editor' | 'viewer' | 'loading'
  const [currentStory, setCurrentStory] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [loadingStage, setLoadingStage] = useState('generating');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [generatedTitle, setGeneratedTitle] = useState('');

  const handleStoryGenerationStart = () => {
    setView('loading');
    setLoadingStage('generating');
    setLoadingProgress(10);
    setGeneratedTitle('');
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('Story generation timeout - returning to editor');
      setView('editor');
      alert('Story generation is taking too long. Please try again with a simpler prompt.');
    }, 90000); // 90 seconds timeout
    
    // Store timeout ID for cleanup
    window.currentGenerationTimeout = timeoutId;
    
    // Simulate progress during story generation
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev < 50) {
          return prev + Math.random() * 5;
        }
        clearInterval(progressInterval);
        return prev;
      });
    }, 1000);
  };

  const [firstImageUrl, setFirstImageUrl] = useState('');

  const handleStoryReady = (story, prompt, title = null, imageUrl = null) => {
    // Clear the generation timeout since we got a result
    if (window.currentGenerationTimeout) {
      clearTimeout(window.currentGenerationTimeout);
      window.currentGenerationTimeout = null;
    }
    
    setCurrentStory(story);
    setCurrentPrompt(prompt);
    if (title) setGeneratedTitle(title);
    if (imageUrl) setFirstImageUrl(imageUrl);
    setLoadingStage('finalizing');
    setLoadingProgress(90);
    
    // Transition to viewer after a brief delay
    setTimeout(() => {
      setView('viewer');
      setLoadingProgress(100);
    }, 1000);
  };

  const handleStoryViewerReady = (title) => {
    setGeneratedTitle(title || '');
    setLoadingStage('finalizing');
    setLoadingProgress(90);
    // Small delay to show "Almost Ready!" before transitioning
    setTimeout(() => {
      setView('viewer');
      setLoadingProgress(100);
    }, 1500);
  };

  const closeViewer = () => {
    setView('editor');
    setLoadingProgress(0);
    setGeneratedTitle('');
  };

  const handleGenerationError = (error) => {
    // Clear any timeouts
    if (window.currentGenerationTimeout) {
      clearTimeout(window.currentGenerationTimeout);
      window.currentGenerationTimeout = null;
    }
    
    console.error('Story generation failed:', error);
    setView('editor');
    setLoadingProgress(0);
    
    // Show user-friendly error message
    const errorMessage = error.message?.includes('timeout') 
      ? 'Story generation timed out. Please try again with a simpler prompt.'
      : error.message?.includes('429')
      ? 'API rate limit reached. Please wait a moment and try again.'
      : 'Story generation failed. Please check your connection and try again.';
      
    alert(errorMessage);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--fg)' }}>
      {view === 'loading' && (
        <StoryLoadingScreen 
          stage={loadingStage}
          progress={loadingProgress}
          storyTitle={generatedTitle}
        />
      )}
      
      {view !== 'loading' && (
        <main className="h-screen">
          {view === 'editor' && (
            <MainContent 
              onStoryReady={handleStoryReady}
              onGenerationStart={handleStoryGenerationStart}
              onGenerationError={handleGenerationError}
            />
          )}
          {view === 'viewer' && (
            <StoryViewer 
              story={currentStory} 
              prompt={currentPrompt} 
              title={generatedTitle}
              firstImageUrl={firstImageUrl}
              onClose={closeViewer}
              onReady={handleStoryViewerReady}
            />
          )}
        </main>
      )}
    </div>
  )
}

export default App
