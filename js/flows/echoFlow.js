// Echo Chamber Flow - Quote repeats with visual echo effect
// Shows how propaganda works through repetition
// REFINED: Clean layered text, no true overlap, readable at all stages

export class EchoFlow {
    constructor() {
        this.containerElement = null;
        this.currentQuote = null;
        this.echoes = [];
        this.echoCount = 0;
        this.maxEchoes = 7; // Fewer echoes for cleaner look
        this.phase = 'waiting';
        this.phaseStartTime = 0;
        this.lastEchoTime = 0;
        this.echoInterval = 600; // Slower echo creation
        this.updateLoopRunning = false;

        this.timing = {
            buildUp: 5000,
            hold: 4000,
            fadeOut: 2000,
            between: 2500
        };
    }

    reset() {
        this.phase = 'waiting';
        this.currentQuote = null;
        this.echoes = [];
        this.echoCount = 0;
        this.updateLoopRunning = false;
        if (this.containerElement) {
            this.containerElement.remove();
            this.containerElement = null;
        }
    }

    createContainer(parentContainer) {
        this.containerElement = document.createElement('div');
        this.containerElement.className = 'echo-container';
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
            pointer-events: none;
            overflow: hidden;
            background: #000000;
        `;
        parentContainer.appendChild(this.containerElement);
    }

    initializeCharacter(character) {
        character.element.style.display = 'none';
    }

    addQuote(quoteData, parentContainer) {
        if (this.phase !== 'waiting') return;

        if (!this.containerElement && parentContainer) {
            this.createContainer(parentContainer);
        }

        this.startEcho(quoteData);
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

    startEcho(quoteData) {
        // Clear previous echoes
        this.echoes.forEach(e => e.remove());
        this.echoes = [];
        this.echoCount = 0;

        this.currentQuote = quoteData;
        this.phase = 'building';
        this.phaseStartTime = performance.now();
        this.lastEchoTime = 0;
    }

    createEcho(index) {
        const echo = document.createElement('div');
        echo.className = 'echo-text';

        // Stack vertically instead of overlapping
        // Each echo is slightly offset and faded
        const yOffset = (index - this.maxEchoes / 2) * 60; // Vertical spread
        const xOffset = Math.sin(index * 0.8) * 30; // Subtle horizontal wave

        // Progressive fade and size reduction
        const opacity = 1 - (index / this.maxEchoes) * 0.6;
        const scale = 1 - (index / this.maxEchoes) * 0.25;
        const blur = index * 0.5;

        const speakerColor = this.currentQuote.speakerColor || '#cc0000';

        echo.style.cssText = `
            position: absolute;
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: clamp(20px, 3.5vw, 40px);
            color: ${index === 0 ? '#ffffff' : speakerColor};
            text-align: center;
            max-width: 70%;
            line-height: 1.5;
            opacity: 0;
            transform: translate(${xOffset}px, ${yOffset}px) scale(${scale});
            filter: blur(${blur}px);
            transition: opacity 0.4s ease;
            z-index: ${this.maxEchoes - index};
            text-shadow: ${index === 0 ? 'none' : `0 0 ${10 + index * 3}px ${speakerColor}40`};
        `;

        echo.textContent = `"${this.currentQuote.text}"`;
        this.containerElement.appendChild(echo);
        this.echoes.push(echo);

        // Fade in
        requestAnimationFrame(() => {
            echo.style.opacity = opacity.toString();
        });
    }

    updateCharacter(character, deltaTime, speed) {
        character.element.style.display = 'none';
        return false;
    }

    update(currentTime) {
        if (!this.currentQuote || !this.containerElement) return;

        const elapsed = currentTime - this.phaseStartTime;

        switch (this.phase) {
            case 'building':
                // Add echoes one by one
                if (this.echoCount < this.maxEchoes) {
                    if (currentTime - this.lastEchoTime > this.echoInterval) {
                        this.createEcho(this.echoCount);
                        this.echoCount++;
                        this.lastEchoTime = currentTime;
                    }
                } else if (elapsed > this.timing.buildUp) {
                    this.phase = 'hold';
                    this.phaseStartTime = currentTime;

                    // Add speaker attribution
                    const attribution = document.createElement('div');
                    attribution.style.cssText = `
                        position: absolute;
                        bottom: 15%;
                        font-family: 'Helvetica Neue', sans-serif;
                        font-size: 16px;
                        font-weight: 500;
                        color: ${this.currentQuote.speakerColor || '#cc0000'};
                        text-transform: uppercase;
                        letter-spacing: 4px;
                        opacity: 0;
                        transition: opacity 0.6s;
                    `;
                    attribution.textContent = this.currentQuote.speaker;
                    this.containerElement.appendChild(attribution);
                    this.echoes.push(attribution);

                    // Add date if available
                    if (this.currentQuote.date) {
                        const dateEl = document.createElement('div');
                        dateEl.style.cssText = `
                            position: absolute;
                            bottom: 11%;
                            font-family: 'Helvetica Neue', sans-serif;
                            font-size: 12px;
                            color: #666666;
                            letter-spacing: 2px;
                            opacity: 0;
                            transition: opacity 0.6s;
                        `;
                        dateEl.textContent = this.currentQuote.date;
                        this.containerElement.appendChild(dateEl);
                        this.echoes.push(dateEl);

                        requestAnimationFrame(() => {
                            dateEl.style.opacity = '1';
                        });
                    }

                    requestAnimationFrame(() => {
                        attribution.style.opacity = '1';
                    });
                }
                break;

            case 'hold':
                // Subtle breathing effect
                const breathe = Math.sin(currentTime / 1000) * 0.02 + 1;
                this.containerElement.style.transform = `scale(${breathe})`;

                if (elapsed > this.timing.hold) {
                    this.phase = 'fade';
                    this.phaseStartTime = currentTime;
                    this.echoes.forEach(e => {
                        e.style.transition = 'opacity 1.5s ease';
                        e.style.opacity = '0';
                    });
                }
                break;

            case 'fade':
                if (elapsed > this.timing.fadeOut + this.timing.between) {
                    this.phase = 'waiting';
                    this.currentQuote = null;
                    this.echoes.forEach(e => e.remove());
                    this.echoes = [];
                    this.containerElement.style.transform = 'scale(1)';
                }
                break;
        }
    }

    getStats() {
        return {
            mode: 'echo',
            phase: this.phase,
            echoCount: this.echoCount
        };
    }
}
