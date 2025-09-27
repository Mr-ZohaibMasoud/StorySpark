// Story processing utilities - extracted from StoryViewer.jsx
// These are pure functions with no side effects

// Helper to split story into scenes based on paragraphs or scene markers
export const splitIntoScenes = (story) => {
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
export const parseStoryMarkdown = (text) => {
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
export const extractStoryTitle = (story, prompt) => {
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