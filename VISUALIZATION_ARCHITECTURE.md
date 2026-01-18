# Visualization Architecture Guide

This document explains how the Overheard visualization system works and how to create new projects using different data sources.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Creating Flow Modes](#creating-flow-modes)
4. [Adding Data Sources](#adding-data-sources)
5. [Creating a New Project](#creating-a-new-project)
6. [Examples](#examples)

---

## Architecture Overview

The system uses a **modular, pluggable architecture** with three main components:

```
┌─────────────────────────────────────────┐
│         Data Source Manager             │
│  - Fetches data from multiple sources   │
│  - Emits events when new data arrives   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           Flow Engine                   │
│  - Receives data items                  │
│  - Creates word elements                │
│  - Applies flow mode algorithms         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         DOM / Screen                    │
│  - Renders flowing text                 │
│  - Animates using requestAnimationFrame │
└─────────────────────────────────────────┘
```

### Key Design Principles

1. **Word-based flow**: Text is split into words, not characters, for readability
2. **Pluggable flow modes**: Each visualization is a separate class implementing a standard interface
3. **Event-driven data**: Data sources emit events; the flow engine subscribes and processes
4. **Continuous animation**: Uses requestAnimationFrame for 60fps smooth rendering
5. **Color coding**: Different source types get different colors for visual categorization

---

## Core Components

### 1. FlowEngine (`js/flowEngine.js`)

The flow engine is the heart of the visualization system.

#### Main Responsibilities:
- Receives data items and splits them into words
- Creates DOM elements for each word
- Manages the animation loop
- Delegates positioning/movement to flow mode algorithms
- Removes words when they're no longer visible

#### Key Methods:

```javascript
class FlowEngine {
    // Initialize with container element
    initialize(container)

    // Start animation loop
    start()

    // Add data item (splits into words)
    addItem(data)

    // Switch visualization mode
    setMode(mode)

    // Create a word DOM element
    createWord(word, source, isLogo)

    // Animation loop (called ~60 times/sec)
    animate(currentTime)
}
```

#### Data Item Format:

```javascript
{
    source: 'SOURCE_NAME',      // e.g., 'Hacker News', 'TIME'
    content: 'text content',    // The actual text to display
    timestamp: Date.now(),      // When this was created
    url: 'https://...',         // Optional link
    isLogo: false              // Optional flag for special styling
}
```

#### Word Element Structure:

Each word is represented as:

```javascript
{
    element: <span>,           // DOM element
    word: 'text',             // The actual word text
    x: 100,                   // X position
    y: 200,                   // Y position
    vx: 2,                    // X velocity
    vy: 0.5,                  // Y velocity
    opacity: 1,               // Current opacity (0-1)
    age: 0,                   // Time alive in ms
    // Flow modes can add custom properties
}
```

---

### 2. Flow Modes

Flow modes are classes that implement visualization algorithms. Each flow mode controls how words move and appear on screen.

#### Flow Mode Interface:

Every flow mode must implement these three methods:

```javascript
class MyFlowMode {
    constructor() {
        // Initialize any state variables
        this.someProperty = value;
    }

    reset() {
        // Reset state when mode is switched
        // Clear any accumulated state
    }

    initializeCharacter(character) {
        // Set initial position and velocity
        // Called once when word is created
        character.x = startX;
        character.y = startY;
        character.vx = velocityX;
        character.vy = velocityY;
        character.opacity = 1;
    }

    updateCharacter(character, deltaTime, speed) {
        // Update position each frame
        // deltaTime = ms since last frame
        // speed = user's speed setting (1-10)

        character.x += character.vx * speed;
        character.y += character.vy * speed;
        character.age += deltaTime;

        // Return false to remove character
        return character.opacity > 0;
    }
}
```

#### Flow Mode Lifecycle:

1. **Construction**: Mode is created when FlowEngine initializes
2. **Reset**: Called when user switches to this mode (clears state)
3. **Initialize**: Called for each new word that appears
4. **Update**: Called ~60 times/second for each active word
5. **Removal**: Word removed when `updateCharacter()` returns false

---

### 3. Data Source Manager (`js/dataSourceManager.js`)

Manages multiple data sources and orchestrates fetching.

#### Responsibilities:
- Contains array of all data sources
- Randomly selects 5-8 sources every 5 seconds
- Fetches data from selected sources
- Emits `newData` events with results

#### Data Source Interface:

Every data source must implement:

```javascript
class MyDataSource {
    constructor() {
        this.name = 'My Source Name';
    }

    async initialize() {
        // One-time setup
        // Load API keys, initial state, etc.
    }

    async fetch() {
        // Fetch new data
        // Return array of items
        const items = [];

        // ... fetch logic ...

        items.push({
            source: this.name,
            content: 'Some text',
            timestamp: Date.now(),
            url: 'https://example.com'
        });

        return items;
    }
}
```

#### Adding a Data Source:

1. Create a new class implementing the interface
2. Add it to the `sources` array in DataSourceManager constructor:

```javascript
this.sources = [
    new MyNewSource(),
    // ... other sources
];
```

---

## Creating Flow Modes

Here are examples of different flow mode patterns:

### Pattern 1: Horizontal Flow (Simple)

```javascript
class HorizontalFlow {
    constructor() {
        // No state needed
    }

    reset() {}

    initializeCharacter(character) {
        // Start from left, random Y
        character.x = 0;
        character.y = Math.random() * window.innerHeight;
        character.vx = 2; // Move right
        character.vy = 0;
        character.opacity = 1;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;
        character.x += character.vx * speed;

        // Remove when off right edge
        return character.x < window.innerWidth + 100;
    }
}
```

### Pattern 2: Wave Motion

```javascript
class WaveFlow {
    constructor() {
        this.waveOffset = 0;
    }

    reset() {
        this.waveOffset = 0;
    }

    initializeCharacter(character) {
        character.x = -100;
        character.startY = Math.random() * window.innerHeight;
        character.vx = 2;
        character.opacity = 1;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;
        character.x += character.vx * speed * 0.5;

        // Sine wave motion
        const wave = Math.sin((character.x + this.waveOffset) * 0.005) * 50;
        character.y = character.startY + wave;

        this.waveOffset += 0.1;

        return character.x < window.innerWidth + 100;
    }
}
```

### Pattern 3: Stationary Text (Typewriter)

```javascript
class TypewriterFlow {
    constructor() {
        this.currentX = 100;
        this.currentY = 100;
        this.lineHeight = 70;
    }

    reset() {
        this.currentX = 100;
        this.currentY = 100;
    }

    initializeCharacter(character) {
        // Place at current position
        character.x = this.currentX;
        character.y = this.currentY;
        character.vx = 0;
        character.vy = 0;
        character.opacity = 1;

        // Advance position for next word
        const wordWidth = (character.word?.length || 1) * 22;
        this.currentX += wordWidth + 10;

        // Wrap to next line
        if (this.currentX > window.innerWidth - 200) {
            this.currentX = 100;
            this.currentY += this.lineHeight;
        }
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;

        // Fade out after 15 seconds
        if (character.age > 15000) {
            character.opacity = Math.max(0, 1 - (character.age - 15000) / 3000);
        }

        return character.opacity > 0;
    }
}
```

### Pattern 4: Physics-Based (Gravity)

```javascript
class GravityFlow {
    constructor() {
        this.gravity = 0.5;
    }

    reset() {}

    initializeCharacter(character) {
        character.x = Math.random() * window.innerWidth;
        character.y = 0;
        character.vx = (Math.random() - 0.5) * 4;
        character.vy = 0;
        character.opacity = 1;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;

        // Apply gravity
        character.vy += this.gravity * speed * 0.1;

        // Update position
        character.x += character.vx * speed;
        character.y += character.vy * speed;

        // Remove when off bottom
        return character.y < window.innerHeight + 100;
    }
}
```

---

## Adding Data Sources

### Example 1: Simple API Source

```javascript
class WeatherSource {
    constructor() {
        this.name = 'Weather';
        this.apiUrl = 'https://api.weather.gov/points/40.7,-74.0';
    }

    async initialize() {
        // Could pre-fetch location data here
    }

    async fetch() {
        const items = [];

        try {
            const response = await fetch(this.apiUrl);
            const data = await response.json();

            items.push({
                source: this.name,
                content: `Temperature: ${data.temperature}°F, ${data.conditions}`,
                timestamp: Date.now(),
                url: 'https://weather.gov'
            });
        } catch (error) {
            console.error('Weather fetch error:', error);
        }

        return items;
    }
}
```

### Example 2: RSS Feed Source

```javascript
class RSSSource {
    constructor() {
        this.name = 'My RSS Feed';
        this.feedUrl = 'https://example.com/rss';
    }

    async initialize() {}

    async fetch() {
        const items = [];

        try {
            // Use CORS proxy for RSS feeds
            const response = await fetch(
                `https://api.allorigins.win/get?url=${encodeURIComponent(this.feedUrl)}`
            );
            const data = await response.json();
            const parser = new DOMParser();
            const xml = parser.parseFromString(data.contents, 'text/xml');

            const entries = xml.querySelectorAll('item');
            entries.forEach(entry => {
                const title = entry.querySelector('title')?.textContent;
                const link = entry.querySelector('link')?.textContent;

                if (title) {
                    items.push({
                        source: this.name,
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            });
        } catch (error) {
            console.error('RSS fetch error:', error);
        }

        return items;
    }
}
```

### Example 3: Generated Data Source

```javascript
class RandomFactsSource {
    constructor() {
        this.name = 'Random Facts';
        this.facts = [
            'The Earth is 4.5 billion years old',
            'Light travels at 299,792,458 meters per second',
            'The human brain has 86 billion neurons',
            // ... more facts
        ];
    }

    async initialize() {}

    async fetch() {
        const items = [];

        // Return a random fact
        const randomFact = this.facts[
            Math.floor(Math.random() * this.facts.length)
        ];

        items.push({
            source: this.name,
            content: randomFact,
            timestamp: Date.now(),
            url: '#'
        });

        return items;
    }
}
```

---

## Creating a New Project

### Step 1: Copy Base Files

Copy these core files to your new project:

```
your-project/
├── index.html
├── styles.css
├── main.js
└── js/
    ├── flowEngine.js
    └── dataSourceManager.js
```

### Step 2: Modify DataSourceManager

Replace all data sources with your own:

```javascript
// js/dataSourceManager.js

export class DataSourceManager {
    constructor() {
        this.listeners = [];
        this.sources = [
            // YOUR DATA SOURCES HERE
            new MyCustomSource1(),
            new MyCustomSource2(),
            new MyCustomSource3(),
        ];
        this.updateInterval = 5000; // Adjust as needed
        this.isRunning = false;
    }

    // Keep all the other methods unchanged
    // ...
}

// Add your custom source classes
class MyCustomSource1 {
    constructor() {
        this.name = 'Custom Source 1';
    }

    async initialize() {
        // Setup
    }

    async fetch() {
        // Return data items
        return [{
            source: this.name,
            content: 'Your data here',
            timestamp: Date.now(),
            url: '#'
        }];
    }
}
```

### Step 3: Customize Flow Modes (Optional)

You can keep the existing flow modes or create new ones:

```javascript
// In flowEngine.js

this.flowModes = {
    // Keep existing modes you like
    wave: new WaveFlow(),
    matrix: new MatrixFlow(),

    // Add your custom modes
    myCustomFlow: new MyCustomFlow(),
};
```

### Step 4: Update HTML

Modify the dropdown to show your flow modes:

```html
<select id="flowMode">
    <option value="wave">Wave Flow</option>
    <option value="myCustomFlow">My Custom Flow</option>
    <!-- Add your modes -->
</select>
```

### Step 5: Customize Styling

Edit `styles.css` to match your project's theme:

```css
/* Change colors */
:root {
    --primary-color: #your-color;
    --background: #your-bg;
}

/* Adjust text size */
.flowing-word {
    font-size: 48px; /* Your preferred size */
}
```

---

## Examples

### Example Project 1: Stock Market Visualizer

**Data Sources:**
- Real-time stock prices (Alpha Vantage API)
- Crypto prices (CoinGecko API)
- Market news (Financial Times RSS)
- Economic indicators

**Flow Modes:**
- **Ticker**: Traditional ticker tape across bottom
- **Bubble**: Stocks as floating bubbles, size = market cap
- **Waterfall**: Prices falling like rain (speed = volatility)
- **Network**: Stocks connected by sector relationships

### Example Project 2: Social Media Stream

**Data Sources:**
- Mastodon public timeline
- Reddit trending posts
- YouTube trending (via RSS)
- GitHub trending repos

**Flow Modes:**
- **Timeline**: Chronological vertical scroll
- **Viral**: Popular posts larger and brighter
- **Constellation**: Posts as stars, connections = replies
- **Wave**: Trending topics create wave patterns

### Example Project 3: Scientific Data Visualizer

**Data Sources:**
- arXiv latest papers
- NASA image of the day
- Weather stations
- Earthquake data (USGS)
- ISS position

**Flow Modes:**
- **Orbital**: Data orbits like planets
- **Spectrum**: Data arranged by category (like light spectrum)
- **Timeline**: Scientific discoveries in chronological order
- **Network**: Papers connected by citations

---

## Advanced Techniques

### Custom Properties per Word

Flow modes can add custom properties to words:

```javascript
initializeCharacter(character) {
    character.x = 100;
    character.y = 100;

    // Custom properties
    character.temperature = Math.random() * 100;
    character.size = 1.0;
    character.rotationSpeed = Math.random();
}

updateCharacter(character, deltaTime, speed) {
    // Use custom properties
    character.size += 0.01;
    character.element.style.fontSize = `${character.size * 42}px`;

    // Rotate based on temperature
    const rotation = character.age * character.rotationSpeed * 0.1;
    character.element.style.transform = `rotate(${rotation}deg)`;

    return true;
}
```

### Conditional Coloring

Override the default color scheme:

```javascript
createWord(word, source, isLogo) {
    const element = document.createElement('span');
    element.className = 'flowing-word';
    element.textContent = word;

    // Custom color logic
    if (word.includes('URGENT')) {
        element.style.color = '#ff0000';
    } else if (word.includes('$')) {
        element.style.color = '#00ff00';
    }

    return { element, word, /* ... */ };
}
```

### Interactive Words

Make words clickable:

```javascript
createWord(word, source, isLogo) {
    const element = document.createElement('span');
    element.className = 'flowing-word';
    element.textContent = word;

    // Add click handler
    element.style.cursor = 'pointer';
    element.addEventListener('click', () => {
        window.open(url, '_blank');
    });

    return { element, word, /* ... */ };
}
```

### Performance Optimization

For large numbers of words, use object pooling:

```javascript
class FlowEngine {
    constructor() {
        this.wordPool = [];
        this.maxWords = 500; // Limit active words
    }

    updateCharacter(character, deltaTime, speed) {
        // Limit total words
        if (this.activeCharacters.length > this.maxWords) {
            return false; // Remove oldest words
        }

        // ... normal update logic
    }
}
```

---

## Summary

The Overheard visualization system is built on three pillars:

1. **FlowEngine**: Manages animation and word lifecycle
2. **Flow Modes**: Define movement and appearance algorithms
3. **Data Sources**: Provide content to visualize

To create a new project:
- Keep FlowEngine unchanged (it's universal)
- Replace data sources with your own
- Customize or create new flow modes
- Style to match your theme

The modular design means you can mix and match components, making it easy to create unique visualizations for any type of streaming data.
