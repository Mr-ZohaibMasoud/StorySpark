// Device detection and image optimization utility
export class DeviceDetection {
  
  // Detect if user is on mobile device
  static isMobile() {
    // Check multiple indicators for mobile devices
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = [
      'android', 'webos', 'iphone', 'ipad', 'ipod', 
      'blackberry', 'windows phone', 'mobile', 'opera mini'
    ];
    
    // Check user agent
    const isMobileUserAgent = mobileKeywords.some(keyword => userAgent.includes(keyword));
    
    // Check screen width (most reliable)
    const isMobileScreen = window.innerWidth <= 768;
    
    // Check touch capability
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check orientation API (mobile-specific)
    const hasOrientationAPI = 'orientation' in window;
    
    // Combine multiple checks for accuracy
    return isMobileUserAgent || (isMobileScreen && isTouchDevice);
  }
  
  // Detect if user is on tablet
  static isTablet() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIpad = userAgent.includes('ipad');
    const isAndroidTablet = userAgent.includes('android') && !userAgent.includes('mobile');
    const isTabletScreen = window.innerWidth > 768 && window.innerWidth <= 1024;
    
    return isIpad || isAndroidTablet || (isTabletScreen && 'ontouchstart' in window);
  }
  
  // Get optimal image dimensions based on device
  static getOptimalImageDimensions() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    if (this.isMobile()) {
      // Mobile: Full-screen portrait dimensions (minimum width, maximum height)
      const baseWidth = Math.min(480, screenWidth); // Minimum width for clarity
      const baseHeight = Math.max(screenHeight, baseWidth * 2.2); // Double+ height ratio
      
      return {
        width: Math.floor(baseWidth * Math.min(devicePixelRatio, 2)), // Cap at 2x for performance
        height: Math.floor(baseHeight * Math.min(devicePixelRatio, 2)),
        aspectRatio: '9:20', // Mobile portrait aspect ratio (taller than wide)
        quality: 'high'
      };
    } else if (this.isTablet()) {
      // Tablet: Balanced dimensions
      return {
        width: 768,
        height: 1024, // Portrait for tablets too
        aspectRatio: '3:4',
        quality: 'high'
      };
    } else {
      // Desktop: Landscape dimensions
      return {
        width: 1024,
        height: 768,
        aspectRatio: '4:3',
        quality: 'high'
      };
    }
  }
  
  // Get device-specific image enhancement prompts
  static getDeviceOptimizedPrompt(basePrompt) {
    if (this.isMobile()) {
      return `${basePrompt}. Mobile-optimized vertical composition, portrait orientation, clear focus on main subject, simple clean background, high contrast for small screens.`;
    } else if (this.isTablet()) {
      return `${basePrompt}. Tablet-optimized balanced composition, clear details, engaging for touch interaction.`;
    } else {
      return `${basePrompt}. Desktop-optimized landscape composition, rich details, cinematic wide view.`;
    }
  }
  
  // Get Pollinations.ai model based on device performance
  static getOptimalImageModel() {
    if (this.isMobile()) {
      // Faster model for mobile to reduce loading time
      return 'flux-realism';
    } else {
      // Higher quality model for desktop
      return 'flux';
    }
  }
  
  // Cache device detection to avoid repeated calculations
  static _deviceCache = null;
  
  static getDeviceInfo() {
    if (this._deviceCache) {
      return this._deviceCache;
    }
    
    this._deviceCache = {
      isMobile: this.isMobile(),
      isTablet: this.isTablet(),
      isDesktop: !this.isMobile() && !this.isTablet(),
      dimensions: this.getOptimalImageDimensions(),
      model: this.getOptimalImageModel(),
      userAgent: navigator.userAgent,
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1
      }
    };
    
    // Clear cache after 30 seconds in case of orientation change
    setTimeout(() => {
      this._deviceCache = null;
    }, 30000);
    
    return this._deviceCache;
  }
}

// Enhanced image URL generator with device optimization
export const generateOptimizedImageUrl = (prompt, seed = 42) => {
  const deviceInfo = DeviceDetection.getDeviceInfo();
  const { width, height } = deviceInfo.dimensions;
  const model = deviceInfo.model;
  
  // Enhance prompt based on device
  const optimizedPrompt = DeviceDetection.getDeviceOptimizedPrompt(prompt);
  
  // Build Pollinations.ai URL with device-specific parameters
  const baseUrl = 'https://image.pollinations.ai/prompt/';
  const encodedPrompt = encodeURIComponent(optimizedPrompt);
  
  const params = new URLSearchParams({
    width: width.toString(),
    height: height.toString(),
    seed: seed.toString(),
    model: model,
    enhance: 'true',
    nologo: 'true',
    private: 'false'
  });
  
  return `${baseUrl}${encodedPrompt}?${params.toString()}`;
};

// Debug function to log device info (remove in production)
export const logDeviceInfo = () => {
  const info = DeviceDetection.getDeviceInfo();
  console.log('🔍 Device Detection:', {
    deviceType: info.isMobile ? 'Mobile' : info.isTablet ? 'Tablet' : 'Desktop',
    dimensions: `${info.dimensions.width}x${info.dimensions.height}`,
    aspectRatio: info.dimensions.aspectRatio,
    model: info.model,
    screenSize: `${info.screenSize.width}x${info.screenSize.height}`,
    pixelRatio: info.screenSize.pixelRatio
  });
};