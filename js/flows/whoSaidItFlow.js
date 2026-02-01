// Who Said It? Flow - Quote appears without attribution, then reveals speaker
// Forces confrontation with the words before the partisan filter kicks in
// REFINED: Clean typography, clear countdown, dramatic reveal

export class WhoSaidItFlow {
    constructor() {
        this.containerElement = null;
        this.currentQuote = null;
        this.phase = 'waiting';
        this.phaseStartTime = 0;
        this.countdownValue = 5;
        this.countdownElement = null;
        this.quoteElement = null;
        this.revealElement = null;
        this.headerElement = null;
        this.contextElement = null;
        this.updateLoopRunning = false;

        this.timing = {
            quoteAppear: 800,
            countdown: 5000,
            revealPause: 600,
            revealHold: 5000,
            fadeOut: 1200,
            between: 2500
        };
    }

    reset() {
        this.phase = 'waiting';
        this.currentQuote = null;
        this.countdownValue = 5;
        this.updateLoopRunning = false;
        if (this.containerElement) {
            this.containerElement.remove();
            this.containerElement = null;
        }
    }

    createContainer(parentContainer) {
        this.containerElement = document.createElement('div');
        this.containerElement.className = 'whosaidit-container';
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

        // "Who said it?" header
        this.headerElement = document.createElement('div');
        this.headerElement.className = 'whosaidit-header';
        this.headerElement.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 14px;
            color: #666666;
            text-transform: uppercase;
            letter-spacing: 6px;
            margin-bottom: 40px;
            opacity: 0;
            transition: opacity 0.6s;
        `;
        this.headerElement.textContent = 'WHO SAID IT?';
        this.containerElement.appendChild(this.headerElement);

        // Quote element - large and centered
        this.quoteElement = document.createElement('div');
        this.quoteElement.className = 'whosaidit-quote';
        this.quoteElement.style.cssText = `
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: clamp(26px, 4.5vw, 52px);
            color: #ffffff;
            text-align: center;
            line-height: 1.6;
            max-width: 900px;
            opacity: 0;
            transition: opacity 0.8s ease;
        `;
        this.containerElement.appendChild(this.quoteElement);

        // Countdown element
        this.countdownElement = document.createElement('div');
        this.countdownElement.className = 'whosaidit-countdown';
        this.countdownElement.style.cssText = `
            font-family: 'Courier New', monospace;
            font-size: 72px;
            font-weight: 300;
            color: #333333;
            margin-top: 50px;
            opacity: 0;
            transition: opacity 0.3s, color 0.3s, transform 0.15s;
        `;
        this.containerElement.appendChild(this.countdownElement);

        // Reveal element (speaker name) - starts hidden
        this.revealElement = document.createElement('div');
        this.revealElement.className = 'whosaidit-reveal';
        this.revealElement.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 36px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 8px;
            margin-top: 50px;
            opacity: 0;
            transform: scale(0.9);
            transition: opacity 0.6s, transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        this.containerElement.appendChild(this.revealElement);

        // Context/date
        this.contextElement = document.createElement('div');
        this.contextElement.className = 'whosaidit-context';
        this.contextElement.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 12px;
            color: #666666;
            letter-spacing: 2px;
            margin-top: 16px;
            opacity: 0;
            transition: opacity 0.6s;
        `;
        this.containerElement.appendChild(this.contextElement);
    }

    initializeCharacter(character) {
        character.element.style.display = 'none';
    }

    addQuote(quoteData, parentContainer) {
        if (this.phase !== 'waiting') return;

        if (!this.containerElement && parentContainer) {
            this.createContainer(parentContainer);
        }

        this.startQuiz(quoteData);
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

    startQuiz(quoteData) {
        this.currentQuote = quoteData;
        this.phase = 'quote';
        this.phaseStartTime = performance.now();
        this.countdownValue = 5;

        // Reset all elements
        this.headerElement.style.opacity = '0';
        this.quoteElement.style.opacity = '0';
        this.countdownElement.style.opacity = '0';
        this.countdownElement.style.color = '#333333';
        this.countdownElement.style.transform = 'scale(1)';
        this.revealElement.style.opacity = '0';
        this.revealElement.style.transform = 'scale(0.9)';
        this.contextElement.style.opacity = '0';

        // Set quote text
        this.quoteElement.textContent = `"${quoteData.text}"`;

        // Prepare reveal
        const speakerColor = quoteData.speakerColor || '#cc0000';
        this.revealElement.textContent = quoteData.speaker;
        this.revealElement.style.color = speakerColor;
        this.revealElement.style.textShadow = `0 0 50px ${speakerColor}80`;

        // Set context
        const contextParts = [];
        if (quoteData.date) contextParts.push(quoteData.date);
        this.contextElement.textContent = contextParts.join(' · ');

        // Fade in header and quote
        setTimeout(() => {
            this.headerElement.style.opacity = '1';
            this.quoteElement.style.opacity = '1';
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
                if (elapsed > 1200) {
                    this.phase = 'countdown';
                    this.phaseStartTime = currentTime;
                    this.countdownElement.style.opacity = '1';
                    this.countdownElement.textContent = '5';
                }
                break;

            case 'countdown':
                const remaining = Math.ceil((this.timing.countdown - elapsed) / 1000);

                if (remaining !== this.countdownValue && remaining > 0) {
                    this.countdownValue = remaining;
                    this.countdownElement.textContent = remaining.toString();

                    // Pulse animation
                    this.countdownElement.style.transform = 'scale(1.15)';
                    setTimeout(() => {
                        if (this.countdownElement) {
                            this.countdownElement.style.transform = 'scale(1)';
                        }
                    }, 150);

                    // Color intensifies as time runs out
                    if (remaining <= 3) {
                        this.countdownElement.style.color = '#666666';
                    }
                    if (remaining <= 2) {
                        this.countdownElement.style.color = '#996600';
                    }
                    if (remaining <= 1) {
                        this.countdownElement.style.color = '#cc0000';
                    }
                }

                if (elapsed > this.timing.countdown) {
                    this.phase = 'reveal';
                    this.phaseStartTime = currentTime;
                    this.countdownElement.style.opacity = '0';
                    this.headerElement.style.opacity = '0';
                }
                break;

            case 'reveal':
                if (elapsed > this.timing.revealPause && this.revealElement.style.opacity === '0') {
                    this.revealElement.style.opacity = '1';
                    this.revealElement.style.transform = 'scale(1)';
                    this.contextElement.style.opacity = '1';
                }

                if (elapsed > this.timing.revealPause + this.timing.revealHold) {
                    this.phase = 'fade';
                    this.phaseStartTime = currentTime;
                    this.quoteElement.style.opacity = '0';
                    this.revealElement.style.opacity = '0';
                    this.contextElement.style.opacity = '0';
                }
                break;

            case 'fade':
                if (elapsed > this.timing.fadeOut + this.timing.between) {
                    this.phase = 'waiting';
                    this.currentQuote = null;
                }
                break;
        }
    }

    getStats() {
        return {
            mode: 'whosaidit',
            phase: this.phase,
            countdown: this.countdownValue
        };
    }
}
