# Overheard.com

> The internet, washing over you

An experimental web experience where information from across the internet flows across your screen like ocean waves.

## Concept

Overheard visualizes the constant stream of information from the internet as a flowing ocean. News, code, social media posts, and updates from various sources flow across the screen in different patterns, mimicking the way information washes over us in the digital age.

## Features

### Multiple Flow Modes

1. **Wave Flow** - Information flows in horizontal waves from left to right
2. **AI Probability Flow** - Text movement mimics AI token probability distributions
3. **Cascade** - Information falls like a waterfall
4. **Chaos** - Multi-directional chaotic flow from all edges
5. **Matrix Rain** - Vertical columns like the Matrix

### Live Data Sources

- **Hacker News** - Latest tech news and discussions
- **Reddit** - Popular posts from programming, technology, science, and more
- **Dev.to** - Developer articles and tutorials
- **GitHub** - Trending repositories
- **News APIs** - Breaking news (configurable)

### Analytics

Toggle analytics to track and analyze information flows:
- Items per minute
- Source breakdown
- Active cards on screen
- Flow patterns
- Export data as JSON or CSV

## Setup

1. Open `index.html` in a modern web browser
2. Use the controls at the bottom to:
   - Switch flow modes
   - Adjust speed and density
   - Toggle analytics

## Architecture

```
overheard/
├── index.html              # Main HTML structure
├── styles.css              # Visual styling
├── main.js                 # Application initialization
└── js/
    ├── flowEngine.js       # Flow algorithms and card animations
    ├── dataSourceManager.js # Live data fetching from APIs
    └── analytics.js        # Data tracking and analysis
```

### Flow Engine

The `FlowEngine` class manages different flow algorithms. Each flow mode is a separate class that implements:
- `initializeCard(card)` - Set initial position and velocity
- `updateCard(card, deltaTime, speed)` - Update card position each frame
- `reset()` - Reset flow state when mode changes

Adding new flow modes is simple - create a new class and add it to the `flowModes` object.

### Data Sources

Each data source is a class that implements:
- `initialize()` - Set up API connections
- `fetch()` - Return array of items with format:
  ```javascript
  {
    source: 'Source Name',
    content: 'Item text',
    timestamp: Date.now(),
    url: 'https://...'
  }
  ```

### Analytics

The `AnalyticsCollector` tracks:
- All items that flow through
- User interactions (flow mode changes, etc.)
- Temporal patterns
- Source correlations
- Topic extraction

Data can be exported for external analysis.

## Configuration

### Adding API Keys

For the News API source, edit `js/dataSourceManager.js`:

```javascript
class NewsAPISource {
    constructor() {
        this.apiKey = 'YOUR_API_KEY_HERE';
        this.useMock = false;
    }
}
```

### Adding New Sources

1. Create a new source class in `dataSourceManager.js`
2. Implement `initialize()` and `fetch()` methods
3. Add to the `sources` array in `DataSourceManager` constructor

### Creating New Flow Modes

1. Create a new flow class in `flowEngine.js`
2. Implement required methods: `initializeCard`, `updateCard`, `reset`
3. Add to `flowModes` object in `FlowEngine` constructor
4. Add option to select element in `index.html`

## Future Ideas

- **AI-Generated Flows**: Use LLMs to generate flow patterns based on content
- **Interactive Elements**: Click/drag to influence flow
- **Sound**: Audio visualization of information density
- **Themes**: Different visual styles (ocean, space, digital, etc.)
- **Filters**: Filter by topic, source, sentiment
- **3D Flows**: WebGL-based 3D particle systems
- **Social Features**: Share interesting flow patterns
- **Machine Learning**: Learn optimal flow patterns from user engagement

## Technical Notes

- Built with vanilla JavaScript (no frameworks)
- Uses ES6 modules
- RequestAnimationFrame for smooth animations
- CORS-friendly APIs only
- Responsive design

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile: Works but best experienced on desktop

## License

MIT
