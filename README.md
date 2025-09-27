# ✨ StorySpark - AI-Powered Interactive Storytelling

<div align="center">

![StorySpark Logo](public/StorySparkLogoSVG.svg)

**Transform imagination into interactive adventures with AI-powered storytelling**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-ai--storyspark.web.app-blue?style=for-the-badge)](https://ai-storyspark.web.app)
[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.7-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![CSS3](https://img.shields.io/badge/CSS3-Responsive-1572B6?style=for-the-badge&logo=css3)](https://developer.mozilla.org/en-US/docs/Web/CSS)

[🚀 Live Demo](https://ai-storyspark.web.app) | [📖 Documentation](#features) | [🛠️ Installation](#installation) | [🤝 Contributing](#contributing)

</div>

---

## 🌟 Overview

StorySpark is a revolutionary AI-powered storytelling platform that creates personalized, interactive stories for children. With intelligent device detection, immersive audio narration, and beautiful AI-generated illustrations, StorySpark transforms simple prompts into magical adventures tailored for any screen size.

### 🚀 **Live Demo: [https://ai-storyspark.web.app](https://ai-storyspark.web.app)**

**Try it now!** Create your first AI-powered story in seconds - no registration required!

### 🎯 Key Highlights

- 🆓 **100% FREE & Open Source** - No API keys required, powered by Pollinations.ai
- 🤖 **AI Story Generation** - Create unique stories from simple prompts
- 📱 **Mobile-First Design** - Optimized for all devices with smart image sizing
- 🎨 **Dynamic Illustrations** - AI-generated images that match your story
- 🔊 **Audio Narration** - Professional voice synthesis with scene-by-scene playback
- ⚡ **Lightning Fast** - Built with Vite for optimal performance
- 🌍 **Deploy Anywhere** - No API keys or secrets to manage
- 🌙 **Theme Support** - Dark and light mode compatibility

---

## ✨ Features

### 🎪 Story Creation
- **Intelligent Prompting** - Transform simple ideas into rich narratives
- **Theme Selection** - Choose from adventure, mystery, gentle, and more
- **Age-Appropriate Content** - Tailored for different age groups
- **Instant Generation** - Stories created in seconds

### 📱 Device Optimization
- **Smart Image Sizing** - Desktop gets landscape, mobile gets portrait
- **Responsive Layout** - Perfect viewing on any screen size
- **Touch-Friendly Controls** - Optimized for mobile interaction
- **Performance Scaling** - Adapts to device capabilities

### 🎨 Visual Experience
- **AI-Generated Art** - Unique illustrations for every scene
- **Scene-by-Scene Images** - Visual storytelling that matches the narrative
- **Progressive Loading** - Smooth image loading with fallbacks
- **High-Quality Output** - Crisp images optimized for each device

### 🔊 Audio Features
- **Scene Narration** - Professional voice synthesis for each scene
- **Auto-Play Mode** - Seamless story progression
- **Voice Selection** - Multiple narrator voices available
- **Audio Controls** - Play, pause, and scene navigation

### 🎮 Interactive Controls
- **Keyboard Navigation** - Arrow keys for scene navigation
- **Scene Indicators** - Visual progress tracking
- **Story Management** - Save and resume reading progress
- **Accessibility** - Screen reader compatible

---

## 🛠️ Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Mr-ZohaibMasoud/StorySpark.git

# Navigate to project directory
cd StorySpark

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## 🚀 Deployment

### Build Process
```bash
npm run build
```
This creates an optimized production build in the `dist/` folder.

### Deployment Options

#### 🌐 Netlify (Recommended)
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`

#### ⚡ Vercel
1. Import your GitHub repository
2. Vercel auto-detects Vite configuration
3. Deploy with zero configuration

#### 📄 GitHub Pages
1. Enable GitHub Pages in repository settings
2. Upload `dist/` folder contents
3. Your app will be live at `https://yourusername.github.io/StorySpark`

#### � Firebase Hosting (Current Deployment)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Build and deploy
npm run build
firebase deploy

# Live at: https://ai-storyspark.web.app
```

#### �🐳 Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

---

## 🏗️ Architecture

### Project Structure
```
StorySpark/
├── 📁 src/
│   ├── 📁 components/        # React components
│   │   ├── Main_Content.jsx  # Story creation interface
│   │   ├── StoryViewer.jsx   # Story display component
│   │   └── StoryControls.jsx # Navigation controls
│   ├── 📁 utils/            # Utility functions
│   │   ├── deviceDetection.js # Smart device detection
│   │   └── storyProcessing.js # Story parsing logic
│   ├── 📁 services/         # API integrations
│   │   ├── storyApi.js      # Story generation API
│   │   └── audioApi.js      # Audio synthesis API
│   └── 📁 hooks/            # Custom React hooks
│       ├── useAudioManager.js    # Audio playback logic
│       └── useStoryNavigation.js # Story navigation
├── 📁 public/               # Static assets
├── 📁 dist/                 # Production build
└── 📄 vite.config.js        # Vite configuration
```

### Tech Stack
- **Frontend**: React 19.1.1, CSS3, JavaScript ES6+
- **Build Tool**: Vite 7.1.7
- **AI Services**: Pollinations.ai for text, images, and audio (100% FREE!)
- **Styling**: Custom CSS with CSS Variables
- **State Management**: React Hooks
- **Device Detection**: Custom utility with screen analysis
- **Open Source**: No API keys, completely transparent and forkable

---

## 🔧 Configuration

### Environment Variables
**No environment variables required!** StorySpark uses Pollinations.ai which requires no API keys or configuration.

Optionally, you can create a `.env` file for custom endpoints:

```env
# Optional: Custom Pollinations endpoints (defaults work great!)
VITE_STORY_API_URL=https://text.pollinations.ai/
VITE_IMAGE_API_URL=https://image.pollinations.ai/
VITE_AUDIO_API_URL=https://text.pollinations.ai/
```

**🎉 Zero Configuration Needed** - Just clone, install, and run!

### Device Detection Settings
Modify `src/utils/deviceDetection.js` to customize device detection:

```javascript
// Mobile breakpoint
const MOBILE_BREAKPOINT = 768;

// Image dimensions
const MOBILE_DIMENSIONS = { width: 480, height: 960 };
const DESKTOP_DIMENSIONS = { width: 1024, height: 768 };
```

---

## 🎨 Customization

### Themes
Add custom themes in `src/App.css`:

```css
:root {
  --primary-color: #f9c859;
  --secondary-color: #101f3a;
  --accent-color: #1a2b47;
}
```

### Story Prompts
Customize story generation in `src/components/Main_Content.jsx`:

```javascript
const customMoods = [
  { id: 'custom', label: 'Custom Theme', color: '#your-color' }
];
```

---

## 📊 Performance

### Optimization Features
- ⚡ **Code Splitting** - Dynamic imports for optimal loading
- 🖼️ **Image Optimization** - Device-specific image dimensions
- 📱 **Mobile Performance** - Lightweight mobile experience
- 🔄 **Progressive Loading** - Background scene pre-loading
- 💾 **Caching** - Smart caching for repeated story elements

### Performance Metrics
- **First Load**: < 2s on 3G
- **Image Generation**: 3-8s per scene
- **Audio Loading**: 5-15s per scene
- **Mobile Optimized**: 60fps animations

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Contribution Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure mobile compatibility
- Test on multiple devices

### Areas for Contribution
- 🌍 **Internationalization** - Multi-language support
- 🎵 **Audio Improvements** - More voice options
- 🎨 **Visual Enhancements** - New illustration styles
- 📱 **Mobile Features** - Advanced mobile interactions
- 🧪 **Testing** - Unit and integration tests

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Zohaib Masoud** - [@Mr-ZohaibMasoud](https://github.com/Mr-ZohaibMasoud)

- 💼 **LinkedIn**: [Connect with me](https://www.linkedin.com/in/zohaib-masoud)
- 🐦 **Twitter**: [@zohaibmasoud](https://twitter.com/zohaibmasoud)
- 📧 **Email**: zohaibmasoud@gmail.com

---

## 🙏 Acknowledgments

- 🤖 **Pollinations.ai** - For AI image and audio generation
- ⚛️ **React Team** - For the amazing framework
- ⚡ **Vite** - For the lightning-fast build tool
- 🎨 **CSS Community** - For responsive design inspiration
- 👥 **Open Source Community** - For continuous inspiration

---

## 📈 Roadmap

### Upcoming Features
- [ ] 🌍 Multi-language story generation
- [ ] 👥 User accounts and story saving
- [ ] 📚 Story library and favorites
- [ ] 🎵 Background music integration
- [ ] 🖼️ Custom illustration styles
- [ ] 📱 Progressive Web App (PWA)
- [ ] 🎮 Interactive story elements
- [ ] 📊 Advanced analytics

### Version History
- **v1.0.0** - Initial release with core features
- **v1.1.0** - Mobile optimization and device detection
- **v1.2.0** - Audio narration system
- **Current** - Professional GitHub release

---

<div align="center">

**⭐ Star this repository if you found it helpful!**

[Report Bug](https://github.com/Mr-ZohaibMasoud/StorySpark/issues) • [Request Feature](https://github.com/Mr-ZohaibMasoud/StorySpark/issues) • [View Demo](https://ai-storyspark.web.app)

Made with ❤️ for storytellers everywhere

</div>+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
