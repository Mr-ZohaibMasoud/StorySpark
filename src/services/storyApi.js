// Story generation API service
// Uses Pollinations.ai - completely FREE and open source!
// No API keys required - perfect for public repositories

// Pollinations.ai endpoints - all FREE and open source
const POLLINATIONS_TEXT_URL = "https://text.pollinations.ai/";

export class StoryAPI {
  static requestQueue = [];
  static isProcessingQueue = false;
  static rateLimitDelay = 1000; // 1 second between requests
  static maxRetries = 2;

  // Rate-limited API request handler
  static async makeRateLimitedRequest(requestFn, retryCount = 0) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          if (error.message.includes('429') && retryCount < this.maxRetries) {
            console.log(`Rate limit hit, retrying in ${(retryCount + 1) * 3000}ms... (attempt ${retryCount + 1}/${this.maxRetries})`);
            setTimeout(() => {
              this.makeRateLimitedRequest(requestFn, retryCount + 1).then(resolve).catch(reject);
            }, (retryCount + 1) * 3000);
          } else {
            reject(error);
          }
        }
      });

      this.processQueue();
    });
  }

  // Process the request queue with rate limiting
  static async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      await request();
      
      if (this.requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      }
    }

    this.isProcessingQueue = false;
  }

  // Generate story using Pollinations.ai - completely FREE!
  static async generateStory(storyParams) {
    const {
      character = "a friendly animal",
      setting = "a magical forest",
      theme = "friendship",
      ageGroup = "5-8 years old",
      storyLength = "short",
      moral = "be kind to others",
      mood = "adventurous and fun",
      complexity = "simple"
    } = storyParams;

    // Create a comprehensive prompt for Pollinations.ai
    const prompt = `You are a professional children's story writer creating ${mood} stories for kids aged ${ageGroup}.

Write a ${storyLength} children's story featuring ${character} in ${setting}. The story should focus on the theme of ${theme} and teach the moral lesson: ${moral}.

REQUIREMENTS:
- Age-appropriate for ${ageGroup} with ${complexity} language
- Mood: ${mood} - capture this feeling throughout
- Safe, educational, and engaging content
- ${storyLength === 'short' ? 'About 150-250 words' : storyLength === 'medium' ? 'About 300-450 words' : 'About 500-700 words'}
- Clear moral lesson about ${moral}
- Proper paragraph structure for easy reading aloud

IMPORTANT: Start your response with a title on the first line in this format:
TITLE: [Your Creative Title Here]

Then provide the story content below.

Make it a memorable, impactful story that children will love with ${complexity === 'very simple' ? 'very simple words and short sentences' : 
              complexity === 'simple' ? 'simple vocabulary with some descriptive language' :
              complexity === 'medium' ? 'rich vocabulary and varied sentence structure' :
              'advanced vocabulary and complex narrative techniques'}.`;

    try {
      const data = await this.makeRateLimitedRequest(async () => {
        // Encode the prompt for URL
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${POLLINATIONS_TEXT_URL}${encodedPrompt}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        try {
          const response = await fetch(url, {
            method: "GET",
            signal: controller.signal,
            headers: {
              'Accept': 'text/plain',
              'User-Agent': 'StorySpark-App/1.0'
            }
          });

          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Pollinations API Error ${response.status}: ${response.statusText}`);
          }

          const content = await response.text();
          return content;
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('Request timeout - Pollinations took too long to respond');
          }
          throw error;
        }
      });

      if (data && typeof data === 'string' && data.length > 50) {
        // Extract title and story content
        let title = "Untitled Story";
        let story = data;
        
        if (data.includes("TITLE:")) {
          const lines = data.split('\n');
          const titleLine = lines.find(line => line.trim().startsWith('TITLE:'));
          if (titleLine) {
            title = titleLine.replace('TITLE:', '').trim();
            // Remove the title line from the story content
            story = lines.filter(line => !line.trim().startsWith('TITLE:')).join('\n').trim();
          }
        }
        
        return {
          success: true,
          story: story,
          title: title,
          model: "pollinations-text",
          usage: { total_tokens: data.length } // Approximate usage
        };
      } else {
        throw new Error("Invalid response from Pollinations API");
      }
    } catch (error) {
      console.error("Story generation failed:", error);
      
      // Fallback story if API fails
      const fallbackStory = this.generateFallbackStory(storyParams);
      
      return {
        success: false,
        error: error.message || "Failed to generate story",
        story: fallbackStory.story,
        title: fallbackStory.title
      };
    }
  }

  // Generate scene-specific image prompts using Pollinations.ai
  static async generateSceneImagePrompts(scenes, storyTitle) {
    const prompt = `You are an expert children's book illustrator prompt creator. Create detailed, vivid image prompts for AI art generation that will bring each scene of a children's story to life.

Create ONE specific image prompt per scene that captures the key visual elements. Make prompts child-friendly, colorful, and engaging. Include specific details about characters, setting, mood, and visual style.

FORMAT: Return one prompt per line, no numbering or extra formatting.

Story: "${storyTitle}"

Scenes:
${scenes.map((scene, index) => `Scene ${index + 1}: ${scene.trim()}`).join('\n\n')}

Generate a specific, detailed image prompt for each scene that captures its unique visual elements and mood. Use artistic style keywords like "whimsical children's book illustration", "colorful digital art", "fantasy style".`;

    try {
      const data = await this.makeRateLimitedRequest(async () => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${POLLINATIONS_TEXT_URL}${encodedPrompt}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            'Accept': 'text/plain',
            'User-Agent': 'StorySpark-App/1.0'
          }
        });

        if (!response.ok) {
          throw new Error(`Pollinations API Error ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      });

      if (data && typeof data === 'string') {
        // Parse the response - look for individual prompts
        const lines = data.split('\n')
          .map(line => line.trim())
          .filter(line => 
            line && 
            line.length > 30 && // Reasonable prompt length
            !line.toLowerCase().includes('scene') && // Skip scene headers
            !line.includes('FORMAT:') && // Skip formatting instructions
            !line.startsWith('Story:') // Skip story title
          );
        
        if (lines.length >= scenes.length) {
          const imagePrompts = lines.slice(0, scenes.length);
          return {
            success: true,
            imagePrompts: imagePrompts,
            model: "pollinations-text",
            usage: { total_tokens: data.length }
          };
        }
      }
      
      // If parsing failed, create fallback prompts
      console.log("Using fallback prompts for scenes");
      const fallbackPrompts = scenes.map((scene, index) => {
        const scenePreview = scene.slice(0, 100).replace(/[^\w\s]/g, ' ').trim();
        return `A whimsical children's book illustration showing: ${scenePreview}. Colorful, engaging, fantasy digital art style, child-friendly storybook artwork.`;
      });
      
      return {
        success: true,
        imagePrompts: fallbackPrompts,
        model: "pollinations-fallback",
        usage: { total_tokens: 0 }
      };
    } catch (error) {
      console.error("Scene image prompt generation failed:", error);
      
      // Fallback prompts if API fails
      const fallbackPrompts = scenes.map((scene, index) => 
        `A colorful children's storybook illustration depicting the events of scene ${index + 1}. Fantasy style, whimsical digital art, child-friendly and engaging.`
      );
      
      return {
        success: false,
        error: error.message || "Failed to generate scene image prompts",
        imagePrompts: fallbackPrompts
      };
    }
  }

  // Generate AI-powered story title using Pollinations.ai
  static async generateStoryTitle(story, originalPrompt) {
    const prompt = `You are a creative children's book title generator. Create an engaging, catchy title for this children's story.

REQUIREMENTS:
- Create a single, perfect title (2-6 words)
- Make it magical, engaging, and child-friendly
- Capture the essence of the story
- Use vivid, imaginative language
- Return ONLY the title, nothing else

Story excerpt: ${story.slice(0, 300)}...

Original prompt: ${originalPrompt}

Generate ONE creative, engaging title:`;

    try {
      const data = await this.makeRateLimitedRequest(async () => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${POLLINATIONS_TEXT_URL}${encodedPrompt}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            'Accept': 'text/plain',
            'User-Agent': 'StorySpark-App/1.0'
          }
        });

        if (!response.ok) {
          throw new Error(`Pollinations API Error ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      });

      if (data && typeof data === 'string') {
        const title = data.trim()
          .split('\n')[0] // Take first line
          .replace(/^["']|["']$/g, '') // Remove quotes
          .replace(/^Title:\s*/i, '') // Remove "Title:" prefix
          .trim();
        
        if (title && title.length > 0 && title.length < 100) {
          return {
            success: true,
            title: title,
            model: "pollinations-text",
            usage: { total_tokens: data.length }
          };
        }
      }
      
      throw new Error("Invalid title response");
    } catch (error) {
      console.error("Title generation failed:", error);
      
      // Fallback to a generated title based on story content
      const fallbackTitle = this.generateFallbackTitle(story, originalPrompt);
      
      return {
        success: false,
        error: error.message || "Failed to generate title",
        title: fallbackTitle
      };
    }
  }

  // Generate fallback story when API fails
  static generateFallbackStory(storyParams) {
    const { character, setting, theme, moral } = storyParams;
    
    const fallbackStories = [
      {
        title: `The Adventure of ${character}`,
        story: `Once upon a time, in ${setting}, there lived ${character}. Every day, they would explore and discover new things about ${theme}. One day, they learned an important lesson: ${moral}. From that day forward, they shared this wisdom with everyone they met, making the world a brighter and kinder place. The End.`
      },
      {
        title: `${character} and the Magic of ${theme}`,
        story: `In the wonderful world of ${setting}, ${character} embarked on a magical journey. Along the way, they discovered the true meaning of ${theme}. Through their adventures, they learned that ${moral}. This important lesson changed their life forever, and they lived happily ever after, always remembering to spread kindness wherever they went.`
      }
    ];
    
    return fallbackStories[Math.floor(Math.random() * fallbackStories.length)];
  }

  // Helper function to generate fallback titles
  static generateFallbackTitle(story, originalPrompt) {
    const storyLower = story.toLowerCase();
    
    // Common character types
    const characters = [
      'rabbit', 'mouse', 'cat', 'dog', 'bear', 'fox', 'lion', 'tiger', 'elephant',
      'bird', 'fish', 'turtle', 'frog', 'butterfly', 'bee', 'ant', 'dragon', 'unicorn',
      'princess', 'prince', 'wizard', 'fairy', 'knight', 'pirate'
    ];
    
    // Find characters mentioned
    const foundCharacters = characters.filter(char => 
      storyLower.includes(char) || originalPrompt.toLowerCase().includes(char)
    );
    
    // Generate title based on found elements
    if (foundCharacters.length > 0) {
      const mainChar = foundCharacters[0];
      const adjectives = ['Brave', 'Little', 'Magic', 'Curious', 'Happy', 'Wise', 'Friendly'];
      const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
      return `The ${randomAdj} ${mainChar.charAt(0).toUpperCase() + mainChar.slice(1)}`;
    }
    
    // Generic magical titles
    const genericTitles = [
      'A Magical Adventure',
      'Once Upon a Dream',
      'The Enchanted Tale',
      'Adventures in Wonderland',
      'The Story of Friendship',
      'A Tale of Wonder'
    ];
    
    return genericTitles[Math.floor(Math.random() * genericTitles.length)];
  }

  // Get sample story prompts for inspiration
  static getSamplePrompts() {
    return [
      {
        character: "a brave little mouse",
        setting: "a big library",
        theme: "courage",
        moral: "being brave even when you're small"
      },
      {
        character: "a friendly dragon",
        setting: "a peaceful village",
        theme: "friendship",
        moral: "not judging others by how they look"
      },
      {
        character: "a curious kitten",
        setting: "a garden full of flowers",
        theme: "discovery",
        moral: "being curious and asking questions"
      },
      {
        character: "a wise old owl",
        setting: "a magical treehouse",
        theme: "learning",
        moral: "the importance of education"
      },
      {
        character: "a playful puppy",
        setting: "a colorful playground",
        theme: "sharing",
        moral: "sharing makes everyone happy"
      }
    ];
  }
}