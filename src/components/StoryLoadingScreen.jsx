import React, { useState, useEffect } from 'react';

const StoryLoadingScreen = ({ stage = 'generating', progress = 0, storyTitle = '' }) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [particles, setParticles] = useState([]);

  // Rotating tips for user engagement
  const loadingTips = [
    "🎨 Creating magical scenes...",
    "✨ Bringing characters to life...",
    "🌟 Adding sparkles of wonder...",
    "📚 Weaving the perfect tale...",
    "🎭 Setting the story stage...",
    "🌈 Painting with words..."
  ];

  // Initialize particles once and never change them
  useEffect(() => {
    const initialParticles = [...Array(15)].map((_, i) => ({
      id: i,
      width: Math.random() * 15 + 8,
      height: Math.random() * 15 + 8,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 6 + Math.random() * 4,
      delay: Math.random() * 3
    }));
    setParticles(initialParticles);
  }, []); // Empty dependency array - only runs once

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % loadingTips.length);
    }, 4000); // Slowed down from 2000ms to 4000ms
    return () => clearInterval(interval);
  }, []);

  const getStageInfo = () => {
    switch (stage) {
      case 'generating':
        return {
          title: 'Creating Your Story',
          subtitle: 'Our AI is crafting something magical for you',
          icon: '✍️'
        };
      case 'processing':
        return {
          title: 'Preparing Your Adventure',
          subtitle: 'Adding beautiful scenes and illustrations',
          icon: '🎨'
        };
      case 'finalizing':
        return {
          title: 'Almost Ready!',
          subtitle: 'Putting the finishing touches on your story',
          icon: '✨'
        };
      default:
        return {
          title: 'Loading',
          subtitle: 'Please wait...',
          icon: '⏳'
        };
    }
  };

  const stageInfo = getStageInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" 
         style={{ 
           background: 'linear-gradient(135deg, #101f3a 0%, #1a2b47 100%)',
           backdropFilter: 'blur(20px)'
         }}>
      
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full opacity-10"
            style={{
              background: '#f9c859',
              width: particle.width + 'px',
              height: particle.height + 'px',
              left: particle.left + '%',
              top: particle.top + '%',
              animation: `float ${particle.duration}s ease-in-out infinite`,
              animationDelay: particle.delay + 's'
            }}
          />
        ))}
      </div>

      {/* Main loading content */}
      <div className="relative z-10 text-center px-8 max-w-md">
        
        {/* Loading icon with slower pulse animation */}
        <div className="text-8xl mb-8" style={{ animation: 'pulse 3s ease-in-out infinite' }}>
          {stageInfo.icon}
        </div>

        {/* Stage title */}
        <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
          {stageInfo.title}
        </h1>

        {/* Stage subtitle */}
        <p className="text-xl text-white/80 mb-8 drop-shadow">
          {stageInfo.subtitle}
        </p>

        {/* Story title preview (if available) */}
        {storyTitle && (
          <div className="mb-8 p-4 rounded-xl backdrop-blur-sm border" 
               style={{ 
                 backgroundColor: 'rgba(249, 200, 89, 0.1)', 
                 borderColor: 'rgba(249, 200, 89, 0.3)' 
               }}>
            <p className="text-sm text-white/60 mb-1">Your Story:</p>
            <p className="text-lg font-semibold" style={{ color: '#f9c859' }}>{storyTitle}</p>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full rounded-full h-3 mb-6 overflow-hidden"
             style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
          <div 
            className="h-full transition-all duration-2000 ease-out rounded-full"
            style={{ 
              width: `${Math.max(progress, 10)}%`,
              background: 'linear-gradient(90deg, #f9c859 0%, #ffd700 100%)',
              boxShadow: '0 0 10px rgba(249, 200, 89, 0.4)'
            }}
          />
        </div>

        {/* Rotating tips */}
        <div className="h-8 flex items-center justify-center">
          <p className="text-sm text-white/70 transition-opacity duration-1000">
            {loadingTips[currentTip]}
          </p>
        </div>

        {/* Simple loading indicator */}
        <div className="mt-8 flex justify-center">
          <div 
            className="w-6 h-6 rounded-full border-2 border-transparent border-t-2"
            style={{ 
              borderTopColor: '#f9c859',
              animation: 'spin 2s linear infinite' 
            }}
          />
        </div>
      </div>


    </div>
  );
};

export default StoryLoadingScreen;