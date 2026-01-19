// Flow Engine - Character-by-character text flow system

export class FlowEngine {
    constructor() {
        this.container = null;
        this.mode = 'wave';
        this.speed = 5;
        this.density = 5;
        this.activeCharacters = [];
        this.flowModes = {
            wave: new WaveFlow(),
            probability: new ProbabilityFlow(),
            cascade: new CascadeFlow(),
            chaos: new ChaosFlow(),
            matrix: new MatrixFlow(),
            spiral: new SpiralFlow(),
            explosion: new ExplosionFlow(),
            river: new RiverFlow(),
            orbit: new OrbitFlow(),
            redacted: new RedactedFlow(),
            typewriter: new TypewriterFlow(),
            overwrite: new OverwriteFlow(),
            ticker: new TickerFlow(),
            takeover: new TakeoverFlow()
        };
        this.animationFrame = null;
        this.lastTime = 0;
    }

    initialize(container) {
        this.container = container;
    }

    start() {
        this.animate(0);
    }

    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    setMode(mode) {
        this.mode = mode;

        // Clear all active characters from screen
        this.activeCharacters.forEach(char => {
            if (char.element && char.element.parentNode) {
                char.element.remove();
            }
        });
        this.activeCharacters = [];

        // Clear any featured headlines
        const headlines = this.container.querySelectorAll('.featured-headline');
        headlines.forEach(h => h.remove());

        // Reset the new flow mode
        this.flowModes[mode].reset();
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    setDensity(density) {
        this.density = density;
    }

    addItem(data) {
        // Split text into words instead of characters for readability
        const text = data.isLogo ? `${data.content}` : `[${data.source}] ${data.content}`;
        const words = text.split(' ');

        words.forEach((word, index) => {
            setTimeout(() => {
                // Allow flow mode to potentially transform the word (for takeover mode)
                const transformedWord = this.flowModes[this.mode].transformWord
                    ? this.flowModes[this.mode].transformWord(word + ' ')
                    : word + ' ';
                const wordElement = this.createWord(transformedWord, data.source, data.isLogo);
                this.activeCharacters.push(wordElement);
                this.container.appendChild(wordElement.element);
                this.flowModes[this.mode].initializeCharacter(wordElement);
            }, index * 200); // Stagger word appearance
        });
    }

    addFeaturedHeadline(data) {
        // Create a large, slow-moving, centered headline for important news
        const element = document.createElement('div');
        element.className = 'featured-headline';

        // Get the source color
        const sourceColor = this.getSourceColor(data.source);

        element.innerHTML = `
            <div class="featured-source">${data.source}</div>
            <div class="featured-content">${data.content}</div>
        `;

        this.container.appendChild(element);

        // Position at center
        element.style.position = 'absolute';
        element.style.left = '50%';
        element.style.top = '50%';
        element.style.transform = 'translate(-50%, -50%)';
        element.style.opacity = '0';

        // Apply dynamic color based on source
        element.style.border = `2px solid ${sourceColor}`;
        element.style.boxShadow = `0 0 30px ${sourceColor}80, 0 0 60px ${sourceColor}50`;
        element.querySelector('.featured-source').style.color = sourceColor;

        // Fade in
        setTimeout(() => {
            element.style.transition = 'opacity 1s';
            element.style.opacity = '1';
        }, 100);

        // Fade out and remove after 8 seconds
        setTimeout(() => {
            element.style.transition = 'opacity 1s';
            element.style.opacity = '0';
            setTimeout(() => element.remove(), 1000);
        }, 8000);
    }

    createWord(word, source, isLogo = false) {
        const element = document.createElement('span');
        element.className = 'flowing-word';
        element.textContent = word;

        // Color code by source type
        const color = this.getSourceColor(source);
        element.style.color = color;

        // Make logo larger
        if (isLogo) {
            element.style.fontSize = '64px';
            element.style.fontWeight = '900';
            element.style.textShadow = '0 0 20px currentColor, 0 0 40px currentColor';
        }

        return {
            element,
            word,
            source,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            age: 0,
            opacity: 1
        };
    }

    createCharacter(char, source, isLogo = false) {
        const element = document.createElement('span');
        element.className = 'flowing-char';
        element.textContent = char;

        // Color code by source type
        const color = this.getSourceColor(source);
        element.style.color = color;

        // Make logo larger
        if (isLogo) {
            element.style.fontSize = '32px';
            element.style.fontWeight = '700';
            element.style.textShadow = '0 0 10px currentColor, 0 0 20px currentColor';
        }

        return {
            element,
            char,
            source,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            age: 0,
            opacity: 1
        };
    }

    getSourceColor(source) {
        // Color coding for different source types
        if (source === 'OVERHEARD.COM') {
            return '#4af'; // Bright blue for logo
        } else if (source.includes('NY Times')) {
            return '#ffaa00'; // Gold/orange for NY Times - "All the News That's Fit to Print"
        } else if (source.includes('News') || source.includes('BBC') || source.includes('Guardian') ||
            source.includes('Reuters') || source.includes('NPR') || source.includes('Jazeera')) {
            return '#ff6b6b'; // Red for news
        } else if (source.includes('GitHub') || source.includes('Stack') || source.includes('DEV')) {
            return '#4ecdc4'; // Cyan for code
        } else if (source.includes('Reddit') || source.includes('Mastodon')) {
            return '#95e1d3'; // Green for social
        } else if (source.includes('Crypto') || source.includes('Weather')) {
            return '#ffe66d'; // Yellow for data
        } else if (source.includes('YouTube') || source.includes('Medium')) {
            return '#ff9ff3'; // Pink for content
        } else {
            return '#a8dadc'; // Light blue default
        }
    }

    animate(time) {
        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        // Update all characters using current flow mode
        this.activeCharacters = this.activeCharacters.filter(character => {
            const shouldKeep = this.flowModes[this.mode].updateCharacter(character, deltaTime, this.speed);

            // Update DOM
            character.element.style.transform = `translate(${character.x}px, ${character.y}px)`;
            character.element.style.opacity = character.opacity;

            if (!shouldKeep) {
                character.element.remove();
            }

            return shouldKeep;
        });

        this.animationFrame = requestAnimationFrame((t) => this.animate(t));
    }

    getStats() {
        const currentFlow = this.flowModes[this.mode];
        const speeds = this.activeCharacters.map(c => Math.sqrt(c.vx * c.vx + c.vy * c.vy));
        const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

        return {
            activeCards: this.activeCharacters.length,
            mode: this.mode,
            avgSpeed,
            flowStats: currentFlow.getStats ? currentFlow.getStats() : {}
        };
    }
}

// Flow Mode: Wave Flow - Horizontal waves with sine motion
class WaveFlow {
    constructor() {
        this.waveOffset = 0;
    }

    reset() {
        this.waveOffset = 0;
    }

    initializeCharacter(character) {
        character.x = -50;
        character.y = Math.random() * (window.innerHeight - 50);
        character.vx = 0;
        character.baseY = character.y;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;

        // Even slower horizontal movement for better readability
        character.x += speed * 0.5;

        // Wave motion
        const waveFreq = 0.003;
        const waveAmp = 30;
        character.y = character.baseY + Math.sin(character.x * waveFreq + this.waveOffset) * waveAmp;

        this.waveOffset += 0.008;

        // Fade out near end
        if (character.x > window.innerWidth - 300) {
            character.opacity = Math.max(0, (window.innerWidth - character.x) / 300);
        }

        return character.x < window.innerWidth + 50;
    }
}

// Flow Mode: AI Probability Flow
class ProbabilityFlow {
    constructor() {
        this.probabilityField = [];
        this.generateField();
    }

    reset() {
        this.generateField();
    }

    generateField() {
        this.probabilityField = [];
        const gridSize = 20;

        for (let i = 0; i < gridSize; i++) {
            this.probabilityField[i] = [];
            for (let j = 0; j < gridSize; j++) {
                const noise = Math.sin(i * 0.5) * Math.cos(j * 0.3);
                this.probabilityField[i][j] = {
                    vx: noise * 3 + 2.5, // Increased minimum velocity to prevent sticking
                    vy: Math.sin(i * 0.3) * 1.5,
                    probability: Math.abs(noise)
                };
            }
        }
    }

    initializeCharacter(character) {
        character.x = -50;
        character.y = Math.random() * (window.innerHeight - 50);
        character.vx = 0;
        character.vy = 0;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;

        const gridX = Math.floor((character.x / window.innerWidth) * 20);
        const gridY = Math.floor((character.y / window.innerHeight) * 20);

        if (gridX >= 0 && gridX < 20 && gridY >= 0 && gridY < 20) {
            const field = this.probabilityField[gridX][gridY];
            character.vx = field.vx * speed * 0.5;
            character.vy = field.vy * speed * 0.5;
            character.opacity = 0.5 + field.probability * 0.5;
        } else {
            // If outside grid, give it a push to the right
            character.vx = speed * 1.5;
        }

        character.x += character.vx;
        character.y += character.vy;

        // Keep in vertical bounds
        character.y = Math.max(0, Math.min(window.innerHeight - 50, character.y));

        // Remove if stuck on left side too long or off right side
        if (character.age > 3000 && character.x < 100) {
            return false; // Remove stuck characters
        }

        return character.x < window.innerWidth + 50;
    }

    getStats() {
        return { fieldSize: this.probabilityField.length };
    }
}

// Flow Mode: Cascade
class CascadeFlow {
    initializeCharacter(character) {
        character.x = Math.random() * window.innerWidth;
        character.y = -50;
        character.vx = (Math.random() - 0.5) * 4;
        character.vy = 0;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;
        character.vy += 0.3;
        character.x += character.vx;
        character.y += character.vy * speed * 0.3;

        return character.y < window.innerHeight + 50;
    }

    reset() {}
}

// Flow Mode: Chaos
class ChaosFlow {
    initializeCharacter(character) {
        const angle = Math.random() * Math.PI * 2;
        const side = Math.floor(Math.random() * 4);

        if (side === 0) { character.x = -50; character.y = Math.random() * window.innerHeight; }
        else if (side === 1) { character.x = window.innerWidth + 50; character.y = Math.random() * window.innerHeight; }
        else if (side === 2) { character.x = Math.random() * window.innerWidth; character.y = -50; }
        else { character.x = Math.random() * window.innerWidth; character.y = window.innerHeight + 50; }

        character.vx = Math.cos(angle) * 5;
        character.vy = Math.sin(angle) * 5;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;

        character.x += character.vx * speed * 0.3;
        character.y += character.vy * speed * 0.3;

        character.vx += (Math.random() - 0.5) * 0.2;
        character.vy += (Math.random() - 0.5) * 0.2;

        const inBounds = character.x > -100 && character.x < window.innerWidth + 100 &&
                        character.y > -100 && character.y < window.innerHeight + 100;

        return inBounds && character.age < 10000;
    }

    reset() {}
}

// Flow Mode: Matrix Rain
class MatrixFlow {
    constructor() {
        this.columns = Math.floor(window.innerWidth / 20);
        this.columnDelays = Array(this.columns).fill(0).map(() => Math.random() * 2000);
    }

    reset() {
        this.columnDelays = Array(this.columns).fill(0).map(() => Math.random() * 2000);
    }

    initializeCharacter(character) {
        const column = Math.floor(Math.random() * this.columns);
        character.x = column * 20 + 10;
        character.y = -50;
        character.vx = 0;
        character.vy = 3;
        character.column = column;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;
        character.y += character.vy * speed;

        return character.y < window.innerHeight + 50;
    }
}

// Flow Mode: Spiral Vortex
class SpiralFlow {
    constructor() {
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;
        this.angle = 0;
    }

    reset() {
        this.angle = 0;
    }

    initializeCharacter(character) {
        character.radius = Math.random() * 50 + 10;
        character.spiralAngle = Math.random() * Math.PI * 2;
        character.x = this.centerX;
        character.y = this.centerY;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;
        character.spiralAngle += 0.02 * speed;
        character.radius += speed * 0.3;

        character.x = this.centerX + Math.cos(character.spiralAngle) * character.radius;
        character.y = this.centerY + Math.sin(character.spiralAngle) * character.radius;

        return character.radius < Math.max(window.innerWidth, window.innerHeight);
    }
}

// Flow Mode: Explosion (from center)
class ExplosionFlow {
    constructor() {
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;
    }

    reset() {}

    initializeCharacter(character) {
        const angle = Math.random() * Math.PI * 2;
        character.x = this.centerX;
        character.y = this.centerY;
        character.vx = Math.cos(angle) * 3;
        character.vy = Math.sin(angle) * 3;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;
        character.x += character.vx * speed;
        character.y += character.vy * speed;

        // Accelerate outward
        character.vx *= 1.01;
        character.vy *= 1.01;

        const inBounds = character.x > -100 && character.x < window.innerWidth + 100 &&
                        character.y > -100 && character.y < window.innerHeight + 100;

        return inBounds;
    }
}

// Flow Mode: River Stream (diagonal flow)
class RiverFlow {
    initializeCharacter(character) {
        character.x = -100;
        character.y = Math.random() * window.innerHeight;
        character.baseY = character.y;
        character.vx = 2;
        character.vy = 0.5;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;
        character.x += character.vx * speed;
        character.y += character.vy * speed;

        // Add meandering
        character.y += Math.sin(character.age * 0.001) * 2;

        return character.x < window.innerWidth + 100 && character.y < window.innerHeight + 100;
    }

    reset() {}
}

// Flow Mode: Orbital (circle around center)
class OrbitFlow {
    constructor() {
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;
    }

    reset() {}

    initializeCharacter(character) {
        character.orbitRadius = Math.random() * 300 + 100;
        character.orbitAngle = Math.random() * Math.PI * 2;
        character.orbitSpeed = (Math.random() - 0.5) * 0.02;
        character.x = this.centerX + Math.cos(character.orbitAngle) * character.orbitRadius;
        character.y = this.centerY + Math.sin(character.orbitAngle) * character.orbitRadius;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;
        character.orbitAngle += character.orbitSpeed * speed;

        character.x = this.centerX + Math.cos(character.orbitAngle) * character.orbitRadius;
        character.y = this.centerY + Math.sin(character.orbitAngle) * character.orbitRadius;

        return character.age < 20000;
    }
}

// Flow Mode: Redacted (words appear and overlap like redacted documents)
class RedactedFlow {
    constructor() {
        this.currentLine = 0;
        this.currentX = 50;
        this.lineHeight = 80;
        this.maxLines = Math.floor((window.innerHeight - 200) / this.lineHeight);
    }

    reset() {
        this.currentLine = 0;
        this.currentX = 50;
    }

    initializeCharacter(character) {
        character.x = this.currentX;
        character.y = this.currentLine * this.lineHeight + 100;
        character.vx = 0;
        character.vy = 0;
        character.lineNumber = this.currentLine;

        this.currentX += 35;
        if (this.currentX > window.innerWidth - 150) {
            this.currentX = 50;
            this.currentLine++;
            if (this.currentLine >= this.maxLines) {
                this.currentLine = 0;
            }
        }
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;

        // Keep text visible for 8 seconds before fading
        if (character.age > 8000) {
            character.opacity = Math.max(0, 1 - (character.age - 8000) / 2000);
        }

        return character.opacity > 0;
    }
}

// Flow Mode: Typewriter (scrolling - old text disappears from bottom as new appears)
class TypewriterFlow {
    constructor() {
        this.currentLine = 0;
        this.currentX = 100;
        this.lineHeight = 70;
        this.maxLines = Math.floor((window.innerHeight - 200) / this.lineHeight);
        this.lineNumber = 0; // Track absolute line number
    }

    reset() {
        this.currentLine = 0;
        this.currentX = 100;
        this.lineNumber = 0;
    }

    initializeCharacter(character) {
        const word = character.word || '';

        // Position at current typing location
        character.x = this.currentX;
        character.y = this.currentLine * this.lineHeight + 150;
        character.vx = 0;
        character.vy = 0;
        character.opacity = 1;
        character.lineNumber = this.lineNumber; // Tag with absolute line number

        // Calculate word width for positioning next word
        const wordWidth = word.length * 22;
        this.currentX += wordWidth + 10;

        // Wrap to next line if needed
        if (this.currentX > window.innerWidth - 200) {
            this.currentX = 100;
            this.currentLine++;
            this.lineNumber++;

            // When we reach max lines, wrap back to top
            if (this.currentLine >= this.maxLines) {
                this.currentLine = 0;
            }
        }
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;

        // Remove characters that are on lines we're about to overwrite or have already passed
        const currentActiveLine = this.lineNumber;
        const linesBehind = currentActiveLine - character.lineNumber;

        // If we've written more than maxLines since this character, it should be gone
        // Also remove characters on the current line we're typing on (to clear before new text)
        if (linesBehind >= this.maxLines ||
            (character.lineNumber < currentActiveLine &&
             character.y === this.currentLine * this.lineHeight + 150)) {
            // Immediately remove old text
            return false;
        }

        return character.opacity > 0;
    }
}

// Flow Mode: Overwrite (overwrites text at top when reaching bottom)
class OverwriteFlow {
    constructor() {
        this.currentLine = 0;
        this.currentX = 100;
        this.lineHeight = 70;
        this.maxLines = Math.floor((window.innerHeight - 200) / this.lineHeight);
    }

    reset() {
        this.currentLine = 0;
        this.currentX = 100;
    }

    initializeCharacter(character) {
        const word = character.word || '';

        // Position at current typing location
        character.x = this.currentX;
        character.y = this.currentLine * this.lineHeight + 150;
        character.vx = 0;
        character.vy = 0;
        character.opacity = 1;

        // Calculate word width for positioning next word
        const wordWidth = word.length * 22;
        this.currentX += wordWidth + 10;

        // Wrap to next line if needed
        if (this.currentX > window.innerWidth - 200) {
            this.currentX = 100;
            this.currentLine++;

            // Wrap back to top - overwrites old text
            if (this.currentLine >= this.maxLines) {
                this.currentLine = 0;
            }
        }
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;

        // Keep visible for long time, then fade out
        if (character.age > 20000) {
            character.opacity = Math.max(0, 1 - (character.age - 20000) / 3000);
        }

        return character.opacity > 0;
    }
}

// Flow Mode: News Ticker (bottom scrolling)
class TickerFlow {
    constructor() {
        this.tickerY = window.innerHeight - 80;
    }

    reset() {}

    initializeCharacter(character) {
        character.x = window.innerWidth + 50;
        character.y = this.tickerY;
        character.vx = -3;
        character.vy = 0;
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;
        character.x += character.vx * speed;

        return character.x > -500;
    }
}

// Flow Mode: Takeover - "fuck you" gradually takes over all words
class TakeoverFlow {
    constructor() {
        this.startTime = Date.now();
        this.takeoverWords = ['fuck', 'you'];
        this.waveOffset = 0;
    }

    reset() {
        this.startTime = Date.now();
        this.waveOffset = 0;
    }

    transformWord(word) {
        const elapsed = Date.now() - this.startTime;
        const takeoverProgress = Math.min(elapsed / 30000, 1); // Full takeover in 30 seconds

        // Gradually increase probability of replacement
        if (Math.random() < takeoverProgress) {
            return this.takeoverWords[Math.floor(Math.random() * this.takeoverWords.length)] + ' ';
        }

        return word;
    }

    initializeCharacter(character) {
        character.x = -50;
        character.y = Math.random() * (window.innerHeight - 50);
        character.vx = 0;
        character.baseY = character.y;

        // Apply takeover styling to "fuck" and "you" words
        const wordText = character.word.trim().toLowerCase();
        if (wordText === 'fuck' || wordText === 'you') {
            character.element.style.fontSize = '48px';
            character.element.style.fontWeight = '900';
            character.element.style.color = '#ff0000';
            character.element.style.textShadow = '0 0 20px #ff0000, 0 0 40px #ff0000';
            character.isTakeoverWord = true;
        }
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;
        const elapsed = Date.now() - this.startTime;
        const takeoverProgress = Math.min(elapsed / 30000, 1);

        // Slower movement for normal words, faster for takeover words
        const moveSpeed = character.isTakeoverWord ? speed * 0.8 : speed * 0.3;
        character.x += moveSpeed;

        // Wave motion
        const waveFreq = 0.003;
        const waveAmp = character.isTakeoverWord ? 50 : 30;
        character.y = character.baseY + Math.sin(character.x * waveFreq + this.waveOffset) * waveAmp;

        this.waveOffset += 0.008;

        // Transform existing words into "fuck you" as takeover progresses
        if (!character.isTakeoverWord && Math.random() < takeoverProgress * 0.001) {
            const newWord = this.takeoverWords[Math.floor(Math.random() * this.takeoverWords.length)];
            character.element.textContent = newWord + ' ';
            character.word = newWord + ' ';
            character.element.style.fontSize = '48px';
            character.element.style.fontWeight = '900';
            character.element.style.color = '#ff0000';
            character.element.style.textShadow = '0 0 20px #ff0000, 0 0 40px #ff0000';
            character.isTakeoverWord = true;
        }

        // Make takeover words more opaque as time goes on
        if (character.isTakeoverWord) {
            character.opacity = Math.min(1, 0.7 + takeoverProgress * 0.3);
        } else {
            // Fade out normal words as takeover progresses
            character.opacity = Math.max(0.3, 1 - takeoverProgress * 0.5);
        }

        // Fade out near end
        if (character.x > window.innerWidth - 300) {
            character.opacity = Math.max(0, (window.innerWidth - character.x) / 300);
        }

        return character.x < window.innerWidth + 50;
    }
}
