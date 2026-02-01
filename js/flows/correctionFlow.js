// The Correction Flow - Quote appears, then fact-check strikes through
// The lie and truth coexist - the lie doesn't get to disappear
// REFINED: Clear staging, readable text, precise fact-check display

export class CorrectionFlow {
    constructor() {
        this.containerElement = null;
        this.currentQuote = null;
        this.phase = 'waiting'; // waiting, quote, crack, correction, hold, fade
        this.phaseStartTime = 0;
        this.quoteElement = null;
        this.speakerElement = null;
        this.correctionElement = null;
        this.sourceElement = null;
        this.strikeElement = null;
        this.updateLoopRunning = false;

        this.timing = {
            quoteAppear: 1000,
            quoteHold: 5000,       // Time to read the claim
            strikeDuration: 800,   // Strike-through animation
            correctionAppear: 600,
            holdBoth: 6000,        // Time to absorb both
            fadeOut: 1200,
            betweenQuotes: 2500
        };

        this.ratingMessages = {
            'false': 'FALSE',
            'mostly-false': 'MOSTLY FALSE',
            'half-true': 'MISLEADING',
            'mostly-true': 'PARTIALLY TRUE',
            'true': 'VERIFIED',
            'unverified': 'UNVERIFIED'
        };

        this.ratingColors = {
            'false': '#ff0000',
            'mostly-false': '#ff6600',
            'half-true': '#ffaa00',
            'mostly-true': '#88cc00',
            'true': '#00cc00',
            'unverified': '#888888'
        };
    }

    reset() {
        this.phase = 'waiting';
        this.currentQuote = null;
        this.updateLoopRunning = false;
        if (this.containerElement) {
            this.containerElement.remove();
            this.containerElement = null;
        }
    }

    createContainer(parentContainer) {
        this.containerElement = document.createElement('div');
        this.containerElement.className = 'correction-container';
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

        // Quote wrapper for positioning strike-through
        const quoteWrapper = document.createElement('div');
        quoteWrapper.style.cssText = `
            position: relative;
            max-width: 900px;
            text-align: center;
        `;
        this.containerElement.appendChild(quoteWrapper);

        // Quote text element
        this.quoteElement = document.createElement('div');
        this.quoteElement.className = 'correction-quote';
        this.quoteElement.style.cssText = `
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: clamp(24px, 4vw, 48px);
            color: #ffffff;
            text-align: center;
            line-height: 1.6;
            opacity: 0;
            transition: opacity 1s ease, color 0.8s ease;
            position: relative;
            z-index: 1;
        `;
        quoteWrapper.appendChild(this.quoteElement);

        // Strike-through element (animated separately)
        this.strikeElement = document.createElement('div');
        this.strikeElement.className = 'correction-strike';
        this.strikeElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 0;
            width: 100%;
            height: 4px;
            background: #ff0000;
            transform: scaleX(0);
            transform-origin: left center;
            transition: transform 0.8s ease-out;
            z-index: 2;
        `;
        quoteWrapper.appendChild(this.strikeElement);

        // Speaker attribution
        this.speakerElement = document.createElement('div');
        this.speakerElement.className = 'correction-speaker';
        this.speakerElement.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 14px;
            color: #888888;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-top: 30px;
            opacity: 0;
            transition: opacity 0.8s ease;
        `;
        this.containerElement.appendChild(this.speakerElement);

        // Correction verdict
        this.correctionElement = document.createElement('div');
        this.correctionElement.className = 'correction-verdict';
        this.correctionElement.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 32px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 8px;
            margin-top: 50px;
            opacity: 0;
            transition: opacity 0.6s ease;
        `;
        this.containerElement.appendChild(this.correctionElement);

        // Fact-check source
        this.sourceElement = document.createElement('div');
        this.sourceElement.className = 'correction-source';
        this.sourceElement.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 12px;
            color: #666666;
            margin-top: 16px;
            opacity: 0;
            transition: opacity 0.6s ease;
        `;
        this.containerElement.appendChild(this.sourceElement);
    }

    initializeCharacter(character) {
        character.element.style.display = 'none';
    }

    addQuote(quoteData, parentContainer) {
        if (this.phase !== 'waiting') return;

        if (!this.containerElement && parentContainer) {
            this.createContainer(parentContainer);
        }

        this.showQuote(quoteData);
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

    showQuote(quoteData) {
        this.currentQuote = quoteData;
        this.phase = 'quote';
        this.phaseStartTime = performance.now();

        // Reset all elements
        this.quoteElement.style.opacity = '0';
        this.quoteElement.style.color = '#ffffff';
        this.speakerElement.style.opacity = '0';
        this.strikeElement.style.transform = 'scaleX(0)';
        this.correctionElement.style.opacity = '0';
        this.sourceElement.style.opacity = '0';

        // Set quote text
        this.quoteElement.textContent = `"${quoteData.text}"`;

        // Set speaker
        this.speakerElement.textContent = `— ${quoteData.speaker || 'Unknown'}`;

        // Prepare correction based on fact-check rating
        const rating = quoteData.factCheck?.rating || 'unverified';
        const color = this.ratingColors[rating];
        this.correctionElement.textContent = this.ratingMessages[rating];
        this.correctionElement.style.color = color;
        this.correctionElement.style.textShadow = `0 0 40px ${color}80`;

        // Set source if available
        if (quoteData.factCheck?.source) {
            this.sourceElement.textContent = `Source: ${quoteData.factCheck.source}`;
        } else {
            this.sourceElement.textContent = '';
        }

        // Determine if this needs strike-through
        this.needsStrike = ['false', 'mostly-false'].includes(rating);
        this.strikeElement.style.background = color;

        // Fade in quote
        setTimeout(() => {
            this.quoteElement.style.opacity = '1';
            this.speakerElement.style.opacity = '1';
        }, 100);
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
                    this.phase = 'crack';
                    this.phaseStartTime = currentTime;

                    // Apply strike-through if false
                    if (this.needsStrike) {
                        this.strikeElement.style.transform = 'scaleX(1)';
                        this.quoteElement.style.color = '#666666';
                    }
                }
                break;

            case 'crack':
                if (elapsed > this.timing.strikeDuration) {
                    this.phase = 'correction';
                    this.phaseStartTime = currentTime;
                    this.correctionElement.style.opacity = '1';
                    this.sourceElement.style.opacity = '1';
                }
                break;

            case 'correction':
                if (elapsed > this.timing.holdBoth) {
                    this.phase = 'fade';
                    this.phaseStartTime = currentTime;
                    this.quoteElement.style.opacity = '0';
                    this.speakerElement.style.opacity = '0';
                    this.correctionElement.style.opacity = '0';
                    this.sourceElement.style.opacity = '0';
                    this.strikeElement.style.opacity = '0';
                }
                break;

            case 'fade':
                if (elapsed > this.timing.fadeOut + this.timing.betweenQuotes) {
                    this.phase = 'waiting';
                    this.currentQuote = null;
                    // Reset strike for next quote
                    this.strikeElement.style.opacity = '1';
                    this.strikeElement.style.transform = 'scaleX(0)';
                }
                break;
        }
    }

    getStats() {
        return {
            mode: 'correction',
            phase: this.phase
        };
    }
}
