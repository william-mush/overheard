// Accumulation Flow - Quotes stack, scroll, and cycle through speakers
// Complete control over speaker selection and timing
// REFINED: Scrolling, speaker sequencing, configurable timing

export class AccumulationFlow {
    constructor() {
        this.quotes = [];
        this.containerElement = null;
        this.quotesContainer = null;
        this.speakerLabel = null;
        this.progressBar = null;
        this.lineHeight = 52;
        this.visibleRows = 0;
        this.totalQuotesAdded = 0;
        this.scrollOffset = 0;
        this.updateLoopRunning = false;

        // Speaker sequencing
        this.speakerQueue = [];
        this.currentSpeakerIndex = 0;
        this.currentSpeaker = null;
        this.speakerStartTime = 0;

        // Configurable timing (in ms)
        this.config = {
            speakerDuration: 30000,      // 30 seconds per speaker
            quotesPerSpeaker: 15,        // Max quotes before switching
            scrollSpeed: 0.5,            // Pixels per frame when scrolling
            quoteInterval: 2500,         // Time between quotes
            transitionDuration: 2000     // Fade between speakers
        };

        // Control state
        this.isPaused = false;
        this.isTransitioning = false;
    }

    reset() {
        this.quotes = [];
        this.totalQuotesAdded = 0;
        this.scrollOffset = 0;
        this.currentSpeakerIndex = 0;
        this.currentSpeaker = null;
        this.speakerStartTime = 0;
        this.updateLoopRunning = false;
        this.isPaused = false;
        this.isTransitioning = false;

        if (this.containerElement) {
            this.containerElement.remove();
            this.containerElement = null;
        }
        this.quotesContainer = null;
        this.speakerLabel = null;
        this.progressBar = null;
    }

    // Configure the flow
    configure(options = {}) {
        if (options.speakerDuration) this.config.speakerDuration = options.speakerDuration;
        if (options.quotesPerSpeaker) this.config.quotesPerSpeaker = options.quotesPerSpeaker;
        if (options.scrollSpeed) this.config.scrollSpeed = options.scrollSpeed;
        if (options.quoteInterval) this.config.quoteInterval = options.quoteInterval;
        if (options.speakers) this.setSpeakerQueue(options.speakers);
    }

    // Set the speaker queue
    setSpeakerQueue(speakers) {
        this.speakerQueue = speakers;
        this.currentSpeakerIndex = 0;
        if (speakers.length > 0) {
            this.currentSpeaker = speakers[0];
        }
    }

    // Get current speaker filter
    getCurrentSpeaker() {
        return this.currentSpeaker;
    }

    createContainer(parentContainer) {
        this.containerElement = document.createElement('div');
        this.containerElement.className = 'accumulation-container';
        this.containerElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            padding: 80px 60px 100px 60px;
            box-sizing: border-box;
            overflow: hidden;
            pointer-events: none;
            background: #000000;
        `;
        parentContainer.appendChild(this.containerElement);

        // Speaker label at top
        this.speakerLabel = document.createElement('div');
        this.speakerLabel.className = 'accumulation-speaker-label';
        this.speakerLabel.style.cssText = `
            position: absolute;
            top: 30px;
            left: 60px;
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: #cc0000;
            text-transform: uppercase;
            letter-spacing: 4px;
            opacity: 0;
            transition: opacity 0.8s ease, color 0.5s ease;
        `;
        this.containerElement.appendChild(this.speakerLabel);

        // Progress bar under speaker label
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'accumulation-progress';
        this.progressBar.style.cssText = `
            position: absolute;
            top: 55px;
            left: 60px;
            width: 200px;
            height: 2px;
            background: #222222;
            overflow: hidden;
        `;
        const progressFill = document.createElement('div');
        progressFill.className = 'accumulation-progress-fill';
        progressFill.style.cssText = `
            width: 0%;
            height: 100%;
            background: #cc0000;
            transition: width 0.3s linear;
        `;
        this.progressBar.appendChild(progressFill);
        this.containerElement.appendChild(this.progressBar);

        // Quotes container with scroll capability
        this.quotesContainer = document.createElement('div');
        this.quotesContainer.className = 'accumulation-quotes';
        this.quotesContainer.style.cssText = `
            position: absolute;
            top: 80px;
            left: 60px;
            right: 60px;
            bottom: 100px;
            overflow: hidden;
        `;
        this.containerElement.appendChild(this.quotesContainer);

        // Inner scrolling container
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.className = 'accumulation-scroll';
        this.scrollContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 6px;
            transform: translateY(0px);
            transition: transform 0.3s ease-out;
        `;
        this.quotesContainer.appendChild(this.scrollContainer);

        // Calculate visible rows
        const containerHeight = window.innerHeight - 180;
        this.visibleRows = Math.floor(containerHeight / this.lineHeight);

        // Quote counter at bottom
        this.counterElement = document.createElement('div');
        this.counterElement.className = 'accumulation-counter';
        this.counterElement.style.cssText = `
            position: absolute;
            bottom: 30px;
            right: 60px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #444444;
        `;
        this.containerElement.appendChild(this.counterElement);
    }

    initializeCharacter(character) {
        character.element.style.display = 'none';
    }

    addQuote(quoteData, parentContainer) {
        if (!this.containerElement && parentContainer) {
            this.createContainer(parentContainer);
        }

        // Don't filter here - main.js handles speaker selection
        // Just display whatever quote is sent to us
        this.addQuoteToScreen(quoteData);
        this.startUpdateLoop();
    }

    addQuoteToScreen(quoteData) {
        if (!this.scrollContainer) return;

        const speakerColor = quoteData.speakerColor || '#cc0000';

        // Update speaker label
        if (this.speakerLabel) {
            this.speakerLabel.textContent = quoteData.speaker || 'Unknown';
            this.speakerLabel.style.color = speakerColor;
            this.speakerLabel.style.opacity = '1';
        }

        // Create quote element
        const quoteLine = document.createElement('div');
        quoteLine.className = 'accumulation-quote';
        quoteLine.style.cssText = `
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 20px;
            line-height: 1.4;
            color: #ffffff;
            opacity: 0;
            transform: translateX(-20px);
            transition: opacity 0.6s ease, transform 0.6s ease;
            padding: 8px 0;
            padding-left: 16px;
            border-left: 3px solid ${speakerColor};
        `;

        quoteLine.textContent = `"${quoteData.text}"`;

        // Add date if available
        if (quoteData.date) {
            const dateSpan = document.createElement('span');
            dateSpan.style.cssText = `
                font-family: 'Helvetica Neue', sans-serif;
                font-size: 11px;
                color: #555555;
                margin-left: 16px;
            `;
            dateSpan.textContent = quoteData.date;
            quoteLine.appendChild(dateSpan);
        }

        this.scrollContainer.appendChild(quoteLine);
        this.quotes.push(quoteLine);
        this.totalQuotesAdded++;

        // Animate in
        requestAnimationFrame(() => {
            quoteLine.style.opacity = '1';
            quoteLine.style.transform = 'translateX(0)';
        });

        // Scroll if we have more quotes than visible
        this.updateScroll();
        this.updateCounter();
    }

    updateScroll() {
        const totalHeight = this.quotes.length * this.lineHeight;
        const containerHeight = window.innerHeight - 180;

        if (totalHeight > containerHeight) {
            // Scroll to show latest quotes
            const scrollAmount = totalHeight - containerHeight + 20;
            this.scrollContainer.style.transform = `translateY(-${scrollAmount}px)`;
        }
    }

    updateCounter() {
        if (this.counterElement) {
            this.counterElement.textContent = `${this.totalQuotesAdded} statements`;
        }
    }

    updateProgress(elapsed) {
        if (this.progressBar) {
            const progress = Math.min((elapsed / this.config.speakerDuration) * 100, 100);
            const fill = this.progressBar.querySelector('.accumulation-progress-fill');
            if (fill) {
                fill.style.width = `${progress}%`;
            }
        }
    }

    // Transition to next speaker
    async transitionToNextSpeaker() {
        if (this.speakerQueue.length === 0) return;

        this.isTransitioning = true;

        // Fade out current quotes
        this.quotes.forEach((q, i) => {
            setTimeout(() => {
                q.style.opacity = '0';
                q.style.transform = 'translateX(20px)';
            }, i * 50);
        });

        // Fade out speaker label
        if (this.speakerLabel) {
            this.speakerLabel.style.opacity = '0';
        }

        // Wait for fade out
        await new Promise(resolve => setTimeout(resolve, this.config.transitionDuration));

        // Clear quotes
        this.quotes.forEach(q => q.remove());
        this.quotes = [];
        this.scrollContainer.style.transform = 'translateY(0)';

        // Move to next speaker
        this.currentSpeakerIndex = (this.currentSpeakerIndex + 1) % this.speakerQueue.length;
        this.currentSpeaker = this.speakerQueue[this.currentSpeakerIndex];
        this.speakerStartTime = performance.now();
        this.totalQuotesAdded = 0;

        // Reset progress
        if (this.progressBar) {
            const fill = this.progressBar.querySelector('.accumulation-progress-fill');
            if (fill) {
                fill.style.transition = 'none';
                fill.style.width = '0%';
                requestAnimationFrame(() => {
                    fill.style.transition = 'width 0.3s linear';
                });
            }
        }

        this.isTransitioning = false;
    }

    startUpdateLoop() {
        if (this.updateLoopRunning) return;
        this.updateLoopRunning = true;
        this.speakerStartTime = performance.now();

        const loop = () => {
            if (!this.updateLoopRunning) return;

            const now = performance.now();
            const elapsed = now - this.speakerStartTime;

            // Update progress bar
            this.updateProgress(elapsed);

            // Check if it's time to switch speakers
            if (this.speakerQueue.length > 1 && !this.isTransitioning) {
                const shouldSwitch = elapsed >= this.config.speakerDuration ||
                                    this.totalQuotesAdded >= this.config.quotesPerSpeaker;

                if (shouldSwitch) {
                    this.transitionToNextSpeaker();
                }
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    updateCharacter(character, deltaTime, speed) {
        character.element.style.display = 'none';
        return false;
    }

    update(currentTime) {
        // Main update handled by startUpdateLoop
    }

    // Pause/resume
    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    // Skip to next speaker
    skipToNextSpeaker() {
        if (!this.isTransitioning) {
            this.transitionToNextSpeaker();
        }
    }

    getStats() {
        return {
            mode: 'accumulation',
            quotesOnScreen: this.quotes.length,
            totalQuotes: this.totalQuotesAdded,
            currentSpeaker: this.currentSpeaker,
            speakerIndex: this.currentSpeakerIndex,
            speakerQueue: this.speakerQueue
        };
    }
}
