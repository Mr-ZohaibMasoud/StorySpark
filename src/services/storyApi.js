// Kids Story Teller AI API Service
// Adapted from Z.AI Chat Completions for story generation

const API_URL = "https://api.z.ai/api/paas/v4/chat/completions";

// Dual GLM Account Configuration
const GLM_ACCOUNTS = {
  ACCOUNT_1: {
    key: "06d2e3ddefa64b11a60f58d01c2d3f97.SKMJ53iT1AOsXTaP",
    purpose: "Story Outline Generation"
  },
  ACCOUNT_2: {
    key: "2f7559b0015841d49cb98c0eabef729f.roqdp02mDPHhzMKj", // Replace with your second API key
    purpose: "Scene Details & Image Prompts"
  }
};

// Primary API key (Account 1 for story generation)
const API_KEY = GLM_ACCOUNTS.ACCOUNT_1.key;

export class StoryAPI {
  static requestQueue = [];
  static isProcessingQueue = false;
  static rateLimitDelay = 1000; // 1 second between requests (reduced from 2)
  static maxRetries = 2; // Reduced retries to fail faster

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
            }, (retryCount + 1) * 3000); // Exponential backoff
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
      
      // Wait before processing next request
      if (this.requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      }
    }

    this.isProcessingQueue = false;
  }

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

    // Enhanced system prompt with mood and complexity awareness
    const systemPrompt = `You are a professional children's story writer creating ${mood} stories for kids aged ${ageGroup}. 
    
    STORY REQUIREMENTS:
    - Age-appropriate for ${ageGroup} with ${complexity} language and concepts
    - Mood: ${mood} - ensure the story captures this feeling throughout
    - Safe, educational, and engaging content
    - ${storyLength === 'short' ? 'About 150-250 words' : storyLength === 'medium' ? 'About 300-450 words' : 'About 500-700 words'}
    - Clear moral lesson about ${moral}
    - Proper paragraph structure for easy reading aloud
    
    WRITING STYLE:
    - Use ${complexity === 'very simple' ? 'very simple words and short sentences' : 
              complexity === 'simple' ? 'simple vocabulary with some descriptive language' :
              complexity === 'medium' ? 'rich vocabulary and varied sentence structure' :
              'advanced vocabulary and complex narrative techniques'}
    - Include vivid, child-friendly descriptions
    - Create emotional connection and engagement
    - Maintain the ${mood} tone throughout the story
    
    Make it a memorable, impactful story that children will love!`;

    const userPrompt = `Create a ${mood} children's story featuring ${character} in ${setting}. 

    IMPORTANT: Start your response with a title on the first line in this exact format:
    TITLE: [Your Creative Title Here]
    
    Then provide the story content below.
    
    The story should:
    - Focus on the theme of ${theme}
    - Be perfectly suited for ${ageGroup} children
    - Capture a ${mood} mood and atmosphere
    - Include the character ${character} as the main protagonist
    - Take place in ${setting}
    - Teach the moral lesson: ${moral}
    
    Make it engaging, memorable, and perfectly tailored to the specified age group and mood!`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    const body = {
      model: "glm-4.5-flash",
      messages,
      thinking: { type: "enabled" },
      max_tokens: 1500,
      temperature: 0.8, // Higher creativity for stories
    };

    try {
      const data = await this.makeRateLimitedRequest(async () => {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        try {
          const response = await fetch(API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${API_KEY}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          const text = await response.text();
          
          if (!response.ok) {
            throw new Error(`API Error ${response.status}: ${text || "(no response body)"}`);
          }

          let data;
          try { 
            data = JSON.parse(text); 
          } catch { 
            throw new Error("Invalid JSON response from API"); 
          }

          return data;
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('Request timeout - API took too long to respond');
          }
          throw error;
        }
      });

      if (typeof data === "object" && data.choices?.[0]?.message?.content) {
        const content = data.choices[0].message.content;
        
        // Extract title and story content
        let title = "Untitled Story";
        let story = content;
        
        if (content.includes("TITLE:")) {
          const lines = content.split('\n');
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
          model: data.model,
          usage: data.usage
        };
      } else {
        throw new Error("Unexpected API response format");
      }
    } catch (error) {
      console.error("Story generation failed:", error);
      return {
        success: false,
        error: error.message || "Failed to generate story",
        story: null
      };
    }
  }

  // Generate scene-specific image prompts using GLM AI (Account 2 for specialized tasks)
  static async generateSceneImagePrompts(scenes, storyTitle) {
    const systemPrompt = `You are an expert children's book illustrator prompt creator. Your job is to create detailed, vivid image prompts for AI art generation that will bring each scene of a children's story to life.

    REQUIREMENTS:
    - Create ONE specific image prompt per scene that captures the key visual elements
    - Make prompts child-friendly, colorful, and engaging
    - Include specific details about characters, setting, mood, and visual style
    - Each prompt should be 1-2 sentences describing exactly what to illustrate
    - Focus on the main action or moment in each scene
    - Use artistic style keywords: "whimsical children's book illustration", "colorful digital art", "fantasy style"
    
    FORMAT: Return a JSON array with one prompt per scene:
    [
      "Scene 1 image prompt here",
      "Scene 2 image prompt here",
      ...
    ]`;

    const userPrompt = `Create individual image prompts for each scene of the story "${storyTitle}". Here are the scenes:

${scenes.map((scene, index) => `**Scene ${index + 1}:**
${scene.trim()}

`).join('')}

Generate a specific, detailed image prompt for each scene that captures its unique visual elements and mood.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    const body = {
      model: "glm-4.5-flash",
      messages,
      thinking: { type: "enabled" },
      max_tokens: 1000,
      temperature: 0.7, // Balanced creativity for consistent but varied prompts
    };

    // Use Account 2 for image prompt generation if available, fallback to Account 1
    const imageApiKey = GLM_ACCOUNTS.ACCOUNT_2.key !== "YOUR_SECOND_GLM_API_KEY_HERE" 
      ? GLM_ACCOUNTS.ACCOUNT_2.key 
      : GLM_ACCOUNTS.ACCOUNT_1.key;
    
    try {
      const data = await this.makeRateLimitedRequest(async () => {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${imageApiKey}`,
          },
          body: JSON.stringify(body),
        });

        const text = await response.text();
        
        if (!response.ok) {
          throw new Error(`API Error ${response.status}: ${text || "(no response body)"}`);
        }

        let data;
        try { 
          data = JSON.parse(text); 
        } catch { 
          throw new Error("Invalid JSON response from API"); 
        }

        return data;
      });

      if (typeof data === "object" && data.choices?.[0]?.message?.content) {
        const content = data.choices[0].message.content;
        // Parse the response content with multiple fallback strategies
        
        // Try multiple parsing strategies
        let imagePrompts = null;
        
        // Strategy 1: Look for JSON array
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            imagePrompts = JSON.parse(jsonMatch[0]);
            // console.log("Parsed JSON array:", imagePrompts);
          }
        } catch (e) {
          console.log("JSON array parsing failed:", e.message);
        }
        
        // Strategy 2: Look for quoted strings (one per line)
        if (!imagePrompts) {
          try {
            const quotedLines = content.match(/"([^"]+)"/g);
            if (quotedLines && quotedLines.length >= scenes.length) {
              imagePrompts = quotedLines.slice(0, scenes.length).map(line => line.replace(/"/g, ''));
              console.log("Parsed quoted strings:", imagePrompts);
            }
          } catch (e) {
            console.log("Quoted strings parsing failed:", e.message);
          }
        }
        
        // Strategy 3: Split by lines and clean up
        if (!imagePrompts) {
          try {
            const lines = content.split('\n')
              .map(line => line.trim())
              .filter(line => 
                line && 
                line.length > 30 && // Reasonable prompt length
                !line.toLowerCase().includes('scene') && // Skip scene headers
                !line.includes('[') && // Skip JSON markers
                !line.includes(']')
              );
            
            if (lines.length >= scenes.length) {
              imagePrompts = lines.slice(0, scenes.length);
              console.log("Parsed line-by-line:", imagePrompts);
            }
          } catch (e) {
            console.log("Line parsing failed:", e.message);
          }
        }
        
        // Strategy 4: Use the entire content as one prompt and duplicate
        if (!imagePrompts && content.trim().length > 50) {
          const singlePrompt = content.trim();
          imagePrompts = scenes.map((scene, index) => 
            `${singlePrompt} - Scene ${index + 1}: ${scene.slice(0, 100)}...`
          );
          // console.log("Using single prompt strategy:", imagePrompts);
        }
        
        // If we got valid prompts, return them
        if (imagePrompts && Array.isArray(imagePrompts) && imagePrompts.length >= scenes.length) {
          return {
            success: true,
            imagePrompts: imagePrompts.slice(0, scenes.length), // Ensure exact scene count
            model: data.model,
            usage: data.usage
          };
        }
      }
      
      // If all parsing failed, use fallback prompts
      console.log("All parsing strategies failed, using fallback prompts");
      const fallbackPrompts = scenes.map((scene, index) => {
        // Create prompts from scene content
        const scenePreview = scene.slice(0, 100).replace(/[^\w\s]/g, ' ').trim();
        return `A whimsical children's book illustration showing: ${scenePreview}. Colorful, engaging, fantasy digital art style, child-friendly storybook artwork.`;
      });
      
      return {
        success: true, // Still success since we have fallback prompts
        imagePrompts: fallbackPrompts,
        model: data?.model || 'fallback',
        usage: data?.usage || null
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
        imagePrompts: fallbackPrompts // Always provide fallback
      };
    }
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

  // Generate AI-powered story title using GLM
  static async generateStoryTitle(story, originalPrompt) {
    const systemPrompt = `You are a creative children's book title generator. Create engaging, catchy titles for children's stories.
    
    REQUIREMENTS:
    - Create a single, perfect title (2-6 words)
    - Make it magical, engaging, and child-friendly
    - Capture the essence of the story
    - Use vivid, imaginative language
    - NO quotation marks or extra formatting
    - Return ONLY the title, nothing else
    
    Examples of good titles:
    - "The Brave Little Mouse"
    - "Dragon's First Friend" 
    - "Adventures in Rainbow Forest"
    - "The Magic Wishing Well"`;

    const userPrompt = `Create a perfect children's story title for this story:

${story.slice(0, 500)}...

Original prompt: ${originalPrompt}

Generate ONE creative, engaging title:`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    const body = {
      model: "glm-4.5-flash",
      messages,
      thinking: { type: "enabled" },
      max_tokens: 50, // Short response for just a title
      temperature: 0.8, // Higher creativity for titles
    };

    // Use Account 1 for title generation
    const titleApiKey = GLM_ACCOUNTS.ACCOUNT_1.key;

    try {
      const data = await this.makeRateLimitedRequest(async () => {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${titleApiKey}`,
          },
          body: JSON.stringify(body),
        });

        const text = await response.text();
        
        if (!response.ok) {
          throw new Error(`API Error ${response.status}: ${text || "(no response body)"}`);
        }

        let data;
        try { 
          data = JSON.parse(text); 
        } catch { 
          throw new Error("Invalid JSON response from API"); 
        }

        return data;
      });

      if (typeof data === "object" && data.choices?.[0]?.message?.content) {
        const title = data.choices[0].message.content.trim()
          .replace(/^["']|["']$/g, '') // Remove quotes
          .replace(/^Title:\s*/i, '') // Remove "Title:" prefix
          .trim();
        
        // console.log("Generated AI title:", title);
        
        if (title && title.length > 0) {
          return {
            success: true,
            title: title,
            model: data.model,
            usage: data.usage
          };
        }
      }
      
      throw new Error("Invalid title response");
    } catch (error) {
      console.error("Title generation failed:", error);
      
      // Fallback to a generated title based on story content
      const fallbackTitle = generateFallbackTitle(story, originalPrompt);
      
      return {
        success: false,
        error: error.message || "Failed to generate title",
        title: fallbackTitle
      };
    }
  }
}

// Helper function to generate fallback titles
function generateFallbackTitle(story, originalPrompt) {
  // Extract key characters and themes from the story
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