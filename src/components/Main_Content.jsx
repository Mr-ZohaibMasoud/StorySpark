import React, { useState } from 'react';
import { StoryAPI } from '../services/storyApi';
import { splitIntoScenes } from '../utils/storyProcessing';
import { generateOptimizedImageUrl, logDeviceInfo } from '../utils/deviceDetection';

// Professional mood categories with icons and descriptions
const MOOD_CATEGORIES = [
  { id: 'adventurous', label: 'Adventurous', icon: '🗺️', description: 'Exciting journeys and exploration', color: '#f59e0b' },
  { id: 'magical', label: 'Magical', icon: '✨', description: 'Fantasy worlds and enchantment', color: '#8b5cf6' },
  { id: 'learning', label: 'Educational', icon: '📚', description: 'Learn while having fun', color: '#10b981' },
  { id: 'positive', label: 'Uplifting', icon: '🌟', description: 'Feel-good stories that inspire', color: '#f472b6' },
  { id: 'funny', label: 'Funny', icon: '😄', description: 'Hilarious tales that make you laugh', color: '#06b6d4' },
  { id: 'brave', label: 'Heroic', icon: '🦸', description: 'Stories about courage and bravery', color: '#ef4444' },
  { id: 'friendship', label: 'Friendship', icon: '🤝', description: 'Beautiful bonds and relationships', color: '#84cc16' },
  { id: 'mystery', label: 'Mystery', icon: '🔍', description: 'Gentle puzzles and discoveries', color: '#6366f1' }
];

// Age group configurations
const AGE_GROUPS = [
  { id: '3-5', label: '3-5 years', description: 'Simple stories with basic concepts', complexity: 'very simple' },
  { id: '5-8', label: '5-8 years', description: 'Engaging tales with life lessons', complexity: 'simple' },
  { id: '8-12', label: '8-12 years', description: 'Rich adventures with deeper themes', complexity: 'medium' },
  { id: '12+', label: '12+ years', description: 'Complex narratives and characters', complexity: 'advanced' }
];

// Main content - Industry-scale professional UI
const MainContent = ({ onStoryReady, onGenerationStart, onGenerationError }) => {
  const [form, setForm] = useState({ 
    prompt: '',
    mood: 'adventurous',
    ageGroup: '5-8'
  });
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const selectMood = (moodId) => setForm({ ...form, mood: moodId });
  const selectAgeGroup = (ageId) => setForm({ ...form, ageGroup: ageId });

  const generate = async () => {
    if (!form.prompt.trim()) {
      setError('Please enter a story idea.');
      return;
    }
    setError('');
    setStory('');
    setLoading(true);
    
    // Log device info for debugging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      logDeviceInfo();
    }
    
    // Trigger the loading screen immediately
    if (onGenerationStart) {
      setTimeout(() => onGenerationStart(), 100);
    }
    
    try {
      // Get selected mood and age group details
      const selectedMood = MOOD_CATEGORIES.find(m => m.id === form.mood);
      const selectedAge = AGE_GROUPS.find(a => a.id === form.ageGroup);
      
      // Enhanced story parameters with mood and age integration
      const storyParams = {
        character: form.prompt,
        setting: `a ${selectedMood.label.toLowerCase()} world perfect for ${selectedAge.label} children`,
        theme: selectedMood.id,
        ageGroup: selectedAge.label,
        storyLength: selectedAge.complexity === 'very simple' ? 'short' : 
                    selectedAge.complexity === 'simple' ? 'medium' : 'long',
        moral: `the importance of ${selectedMood.id === 'learning' ? 'curiosity and knowledge' : 
                                  selectedMood.id === 'friendship' ? 'friendship and kindness' :
                                  selectedMood.id === 'brave' ? 'courage and determination' :
                                  selectedMood.id === 'positive' ? 'optimism and hope' :
                                  'being good to others'}`,
        mood: selectedMood.description,
        complexity: selectedAge.complexity
      };
      
      // Generate story with enhanced parameters
      const res = await StoryAPI.generateStory(storyParams);
      if (res.success) {
        setStory(res.story);
        
        // Generate first scene image during story loading
        let firstImageUrl = null;
        try {
          // Split story into scenes for first image generation
          const scenes = splitIntoScenes(res.story);
          
          if (scenes.length > 0) {
            // Generate image prompts for the first scene
            const imageResult = await StoryAPI.generateSceneImagePrompts([scenes[0]], res.title);
            
            if (imageResult.imagePrompts && imageResult.imagePrompts.length > 0) {
              const firstPrompt = imageResult.imagePrompts[0];
              const enhancedPrompt = `${firstPrompt}. Whimsical children's book illustration, colorful digital art, fantasy style, child-friendly, engaging storybook artwork.`;
              
              // Generate device-optimized image URL
              firstImageUrl = generateOptimizedImageUrl(enhancedPrompt, 42);
              
              // Log device info for debugging (remove in production)
              if (process.env.NODE_ENV === 'development') {
                logDeviceInfo();
              }
            }
          }
        } catch (error) {
          console.warn('First image generation failed, will use fallback:', error);
        }
        
        if (onStoryReady) onStoryReady(res.story, form.prompt, res.title, firstImageUrl);
      }
      else {
        // If API fails, provide a fallback story for testing
        console.warn('API failed, using fallback story');
        const fallbackStory = `Once upon a time, there was a curious little ${form.prompt.includes('animal') ? 'fox' : 'child'} who loved to explore. Every day brought a new adventure filled with wonder and discovery.

The brave explorer learned that the greatest treasures are the friends we make and the kindness we share along the way.

Through courage and determination, they discovered that even the smallest person can make the biggest difference in the world.`;
        
        setStory(fallbackStory);
        if (onStoryReady) onStoryReady(fallbackStory, form.prompt, "The Little Explorer");
      }
    } catch (e) {
      console.error('Story generation failed:', e.message);
      setError(e?.message || 'Something went wrong.');
      
      // Call the error handler from App to return to editor
      if (onGenerationError) {
        onGenerationError(e);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center px-2 sm:px-4 py-4 sm:py-8" 
         style={{ 
           background: 'linear-gradient(135deg, #101f3a 0%, #1a2b47 50%, #2a3f5f 100%)',
           position: 'relative'
         }}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              background: '#f9c859',
              width: Math.random() * 100 + 50 + 'px',
              height: Math.random() * 100 + 50 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `float ${8 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: Math.random() * 4 + 's'
            }}
          />
        ))}
      </div>
      <div className="inner-scroll-container flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full max-w-4xl h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden relative z-10" 
           style={{ 
             background: 'linear-gradient(145deg, rgba(16, 31, 58, 0.95) 0%, rgba(26, 43, 71, 0.95) 100%)',
             border: '1px solid rgba(249, 200, 89, 0.2)', 
             color: '#ffffff',
             backdropFilter: 'blur(10px)',
             boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(249, 200, 89, 0.1)'
           }}>
        
        {/* Header Section */}
        <div className="text-center" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
          <h1 className="heading-primary gradient-text mb-2 sm:mb-4 text-2xl sm:text-3xl lg:text-4xl">
            ✨ StorySpark ✨
          </h1>
          <p className="tagline text-lg sm:text-xl px-8 sm:px-16">Experience Stories Tailored to Your Imagination</p>
        </div>

        {/* Story Prompt Section */}
        <div className="space-y-3 sm:space-y-4">
          <label htmlFor="prompt" className="block text-base sm:text-lg font-semibold" style={{ color: 'var(--fg)' }}>
            🎭 What's your story about?
          </label>
          <textarea
            id="prompt"
            name="prompt"
            value={form.prompt}
            onChange={onChange}
            placeholder="e.g., a brave little rabbit who helps friends, a magical dragon who loves books..."
            className="form-input w-full h-24 sm:h-32 resize-none px-3 sm:px-6 py-3 sm:py-4 text-base sm:text-lg"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--fg)' }}
          />
        </div>

        {/* Mood Selection Section */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-base sm:text-lg font-semibold">🎨 Choose the Story Theme</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {MOOD_CATEGORIES.map((mood) => (
              <button
                key={mood.id}
                onClick={() => selectMood(mood.id)}
                className={`mood-card p-3 sm:p-4 lg:p-5 rounded-lg sm:rounded-xl border-2 ${
                  form.mood === mood.id ? 'selected' : ''
                }`}
                style={{ 
                  backgroundColor: form.mood === mood.id ? mood.color + '20' : 'var(--surface)',
                  borderColor: form.mood === mood.id ? mood.color : 'var(--border)'
                }}
              >
                <div className="text-xl sm:text-2xl lg:text-3xl mb-1 sm:mb-2 lg:mb-3">{mood.icon}</div>
                <div className="font-bold text-xs sm:text-sm">{mood.label}</div>
                <div className="text-xs opacity-80 mt-1 sm:mt-2 hidden sm:block">{mood.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Age Group Selection */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-base sm:text-lg font-semibold">👶 Age Group (Optional)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {AGE_GROUPS.map((age) => (
              <button
                key={age.id}
                onClick={() => selectAgeGroup(age.id)}
                className={`age-card p-3 sm:p-4 lg:p-5 rounded-lg sm:rounded-xl border-2 ${
                  form.ageGroup === age.id ? 'selected' : ''
                }`}
                style={{ 
                  backgroundColor: form.ageGroup === age.id ? '#101f3a' : 'var(--surface)',
                  borderColor: form.ageGroup === age.id ? '#f9c859' : 'var(--border)',
                  color: form.ageGroup === age.id ? '#f9c859' : 'var(--fg)'
                }}
              >
                <div className={`text-sm sm:text-base lg:text-lg font-bold ${form.ageGroup === age.id ? '' : 'text-blue-600'}`}
                     style={{ color: form.ageGroup === age.id ? '#f9c859' : '#3b82f6' }}>
                  {age.label}
                </div>
                <div className={`text-xs mt-1 sm:mt-2 ${form.ageGroup === age.id ? 'opacity-90' : 'opacity-80'} hidden sm:block`}
                     style={{ color: form.ageGroup === age.id ? '#f9c859' : 'inherit' }}>
                  {age.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center pt-2 sm:pt-4">
          <button
            onClick={generate}
            disabled={loading || !form.prompt.trim()}
            className="btn-primary text-base sm:text-lg min-w-[200px] sm:min-w-[240px] px-6 sm:px-8 py-3 sm:py-4"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <div className="loading-spinner rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white"></div>
                <span className="hidden sm:inline">Creating Magic...</span>
                <span className="sm:hidden">Creating...</span>
              </div>
            ) : (
              <span>🎪 Create My Story!</span>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-xl px-6 py-4 text-center" style={{ 
            border: '2px solid #fecaca', 
            backgroundColor: '#fef2f2', 
            color: '#b91c1c' 
          }}>
            <div className="text-2xl mb-2">⚠️</div>
            <div className="font-semibold">{error}</div>
          </div>
        )}

        {/* Story Preview */}
        {story && (
          <div className="story-container p-8">
            <h3 className="heading-secondary text-green-800 text-center mb-6">📖 Your Story is Ready!</h3>
            <p className="whitespace-pre-line leading-relaxed text-green-900 text-lg">{story}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainContent;
