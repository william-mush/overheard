// The Record Flow - Single quote, stark, centered, speaker revealed after pause
// Forces viewer to confront words before knowing who said them
// REFINED: Maximum readability, clean typography, no overlapping text

export class TheRecordFlow {
    constructor() {
        this.currentQuote = null;
        this.phase = 'waiting'; // waiting, quote, pause, speaker, fade
        this.phaseStartTime = 0;
        this.quoteElement = null;
        this.speakerElement = null;
        this.dateElement = null;
        this.containerElement = null;
        this.updateLoopRunning = false;

        // Timing (ms) - slower for readability
        this.timing = {
            quoteAppear: 800,      // Fade in quote
            quoteHold: 8000,       // Hold quote alone - more time to read
            pauseBeforeSpeaker: 2000, // Uncomfortable pause
            speakerAppear: 600,    // Fade in speaker
            speakerHold: 4000,     // Show both
            fadeOut: 1200,         // Fade everything
            betweenQuotes: 3000    // Black screen between - moment of reflection
        };
    }

    reset() {
        this.phase = 'waiting';
        this.phaseStartTime = 0;
        this.updateLoopRunning = false;
        if (this.containerElement) {
            this.containerElement.remove();
            this.containerElement = null;
        }
        this.quoteElement = null;
        this.speakerElement = null;
        this.dateElement = null;
        this.currentQuote = null;
    }

    createContainer(parentContainer) {
        this.containerElement = document.createElement('div');
        this.containerElement.className = 'the-record-container';
        this.containerElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 8% 12%;
            box-sizing: border-box;
            pointer-events: none;
            background: #000000;
        `;
        parentContainer.appendChild(this.containerElement);

        // Quote element - large, serif, highly readable
        this.quoteElement = document.createElement('div');
        this.quoteElement.className = 'the-record-quote';
        this.quoteElement.style.cssText = `
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: clamp(28px, 4.5vw, 54px);
            font-weight: 400;
            color: #ffffff;
            text-align: center;
            line-height: 1.6;
            max-width: 1000px;
            opacity: 0;
            transition: opacity 0.8s ease;
            letter-spacing: 0.02em;
        `;
        this.containerElement.appendChild(this.quoteElement);

        // Speaker element - small caps, understated
        this.speakerElement = document.createElement('div');
        this.speakerElement.className = 'the-record-speaker';
        this.speakerElement.style.cssText = `
            font-family: 'Helvetica Neue', 'Arial', sans-serif;
            font-size: 16px;
            font-weight: 500;
            color: #cc0000;
            text-transform: uppercase;
            letter-spacing: 4px;
            margin-top: 60px;
            opacity: 0;
            transition: opacity 0.6s ease;
        `;
        this.containerElement.appendChild(this.speakerElement);

        // Date/context element
        this.dateElement = document.createElement('div');
        this.dateElement.className = 'the-record-date';
        this.dateElement.style.cssText = `
            font-family: 'Helvetica Neue', 'Arial', sans-serif;
            font-size: 12px;
            font-weight: 300;
            color: #666666;
            letter-spacing: 2px;
            margin-top: 12px;
            opacity: 0;
            transition: opacity 0.6s ease;
        `;
        this.containerElement.appendChild(this.dateElement);
    }

    initializeCharacter(character) {
        character.element.style.display = 'none';
    }

    addQuote(quoteData, parentContainer) {
        // Only show one quote at a time - never overlap
        if (this.phase !== 'waiting') {
            return;
        }

        if (!this.containerElement && parentContainer) {
            this.createContainer(parentContainer);
        }

        this.currentQuote = quoteData;
        this.phase = 'quote';
        this.phaseStartTime = performance.now();

        // Clear any previous content
        this.quoteElement.style.opacity = '0';
        this.speakerElement.style.opacity = '0';
        this.dateElement.style.opacity = '0';

        // Set quote text with quotation marks
        this.quoteElement.textContent = `"${quoteData.text}"`;

        // Prepare speaker and date
        this.speakerElement.textContent = quoteData.speaker || 'Unknown';
        this.dateElement.textContent = quoteData.date || '';

        // Fade in quote after brief delay
        setTimeout(() => {
            this.quoteElement.style.opacity = '1';
        }, 100);

        this.startUpdateLoop();
    }

    startUpdateLoop() {
        if (this.updateLoopRunning) return;
        this.updateLoopRunning = true;

        const loop = () => {
            if (this.phase !== 'waiting') {
                this.update(performance.now());
                requestAnimationFrame(loop);
            } else {
                this.updateLoopRunning = false;
            }
        };
        requestAnimationFrame(loop);
    }

    updateCharacter(character, deltaTime, speed) {
        character.element.style.display = 'none';
        return false;
    }

    update(currentTime) {
        if (!this.currentQuote || !this.containerElement) return;

        const elapsed = currentTime - this.phaseStartTime;

        switch (this.phase) {
            case 'quote':
                if (elapsed > this.timing.quoteHold) {
                    this.phase = 'pause';
                    this.phaseStartTime = currentTime;
                }
                break;

            case 'pause':
                if (elapsed > this.timing.pauseBeforeSpeaker) {
                    this.phase = 'speaker';
                    this.phaseStartTime = currentTime;
                    this.speakerElement.style.opacity = '1';
                    this.dateElement.style.opacity = '1';
                }
                break;

            case 'speaker':
                if (elapsed > this.timing.speakerHold) {
                    this.phase = 'fade';
                    this.phaseStartTime = currentTime;
                    this.quoteElement.style.opacity = '0';
                    this.speakerElement.style.opacity = '0';
                    this.dateElement.style.opacity = '0';
                }
                break;

            case 'fade':
                if (elapsed > this.timing.fadeOut + this.timing.betweenQuotes) {
                    this.phase = 'waiting';
                    this.currentQuote = null;
                }
                break;
        }
    }

    getStats() {
        return {
            mode: 'therecord',
            phase: this.phase,
            currentSpeaker: this.currentQuote?.speaker || null
        };
    }
}
