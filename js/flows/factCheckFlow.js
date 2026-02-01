// Fact Check Flow - Quote appears centered, then fact-check rating reveals below
// Clean, readable display with dramatic reveal of truth rating

export class FactCheckFlow {
    constructor() {
        this.containerElement = null;
        this.currentQuote = null;
        this.animationPhase = 'idle'; // idle, quote, factcheck, hold, fading
        this.phaseStartTime = 0;
        this.updateLoopRunning = false;

        this.factCheckRatings = {
            'false': { label: 'FALSE', color: '#ff0000', description: 'This claim is not accurate' },
            'mostly-false': { label: 'MOSTLY FALSE', color: '#ff6600', description: 'This claim contains significant inaccuracies' },
            'half-true': { label: 'HALF TRUE', color: '#ffcc00', description: 'This claim is partially accurate' },
            'mostly-true': { label: 'MOSTLY TRUE', color: '#99cc00', description: 'This claim is largely accurate' },
            'true': { label: 'TRUE', color: '#00cc00', description: 'This claim is accurate' },
            'unverified': { label: 'UNVERIFIED', color: '#666666', description: 'This claim has not been verified' }
        };
    }

    reset() {
        this.currentQuote = null;
        this.animationPhase = 'idle';
        this.updateLoopRunning = false;

        if (this.containerElement) {
            this.containerElement.remove();
            this.containerElement = null;
        }
    }

    createContainer(parentContainer) {
        this.containerElement = document.createElement('div');
        this.containerElement.className = 'factcheck-container';
        this.containerElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #000000;
            overflow: hidden;
            pointer-events: none;
        `;
        parentContainer.appendChild(this.containerElement);
    }

    initializeCharacter(character) {
        character.element.style.display = 'none';
    }

    addQuote(quoteData, parentContainer) {
        if (!this.containerElement && parentContainer) {
            this.createContainer(parentContainer);
        }

        // Clear any existing content
        if (this.containerElement) {
            while (this.containerElement.firstChild) {
                this.containerElement.removeChild(this.containerElement.firstChild);
            }
        }

        this.currentQuote = quoteData;
        this.buildDisplay(quoteData);
        this.animationPhase = 'quote';
        this.phaseStartTime = performance.now();
        this.startUpdateLoop();
    }

    buildDisplay(quoteData) {
        if (!this.containerElement) return;

        const speakerColor = quoteData.speakerColor || '#cc0000';
        const factCheck = quoteData.factCheck || { rating: 'unverified' };
        // Normalize rating to lowercase for lookup
        const normalizedRating = (factCheck.rating || 'unverified').toLowerCase().replace(/ /g, '-');
        const ratingInfo = this.factCheckRatings[normalizedRating] || this.factCheckRatings['unverified'];

        // Main wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'factcheck-wrapper';
        wrapper.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 900px;
            padding: 60px;
            text-align: center;
        `;

        // Speaker label
        const speakerLabel = document.createElement('div');
        speakerLabel.className = 'factcheck-speaker';
        speakerLabel.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: ${speakerColor};
            text-transform: uppercase;
            letter-spacing: 6px;
            margin-bottom: 30px;
            opacity: 0;
            transform: translateY(-20px);
            transition: opacity 0.8s ease, transform 0.8s ease;
        `;
        speakerLabel.textContent = quoteData.speaker || 'Unknown';
        wrapper.appendChild(speakerLabel);

        // Quote text - large and prominent
        const quoteEl = document.createElement('div');
        quoteEl.className = 'factcheck-quote';
        quoteEl.style.cssText = `
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 32px;
            line-height: 1.5;
            color: #ffffff;
            margin-bottom: 20px;
            opacity: 0;
            transform: scale(0.95);
            transition: opacity 1s ease 0.3s, transform 1s ease 0.3s;
        `;
        quoteEl.textContent = '"' + quoteData.text + '"';
        wrapper.appendChild(quoteEl);

        // Date and source
        if (quoteData.date) {
            const dateEl = document.createElement('div');
            dateEl.className = 'factcheck-date';
            dateEl.style.cssText = `
                font-family: 'Helvetica Neue', sans-serif;
                font-size: 14px;
                color: #666666;
                margin-bottom: 50px;
                opacity: 0;
                transition: opacity 0.8s ease 0.5s;
            `;
            dateEl.textContent = quoteData.date;
            wrapper.appendChild(dateEl);
        }

        // Fact check section - initially hidden
        const factCheckSection = document.createElement('div');
        factCheckSection.className = 'factcheck-section';
        factCheckSection.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 1s ease, transform 1s ease;
        `;

        // Divider line
        const divider = document.createElement('div');
        divider.className = 'factcheck-divider';
        divider.style.cssText = `
            width: 100px;
            height: 2px;
            background: linear-gradient(to right, transparent, ${ratingInfo.color}, transparent);
            margin-bottom: 30px;
        `;
        factCheckSection.appendChild(divider);

        // "FACT CHECK" label
        const factCheckLabel = document.createElement('div');
        factCheckLabel.className = 'factcheck-label';
        factCheckLabel.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 12px;
            font-weight: 600;
            color: #888888;
            letter-spacing: 4px;
            margin-bottom: 20px;
        `;
        factCheckLabel.textContent = 'FACT CHECK';
        factCheckSection.appendChild(factCheckLabel);

        // Rating badge - large and dramatic
        const ratingBadge = document.createElement('div');
        ratingBadge.className = 'factcheck-rating';
        ratingBadge.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 48px;
            font-weight: 900;
            color: ${ratingInfo.color};
            letter-spacing: 6px;
            text-shadow: 0 0 40px ${ratingInfo.color}, 0 0 80px ${ratingInfo.color}50;
            margin-bottom: 20px;
        `;
        ratingBadge.textContent = ratingInfo.label;
        factCheckSection.appendChild(ratingBadge);

        // Source attribution
        if (factCheck.source) {
            const sourceEl = document.createElement('div');
            sourceEl.className = 'factcheck-source';
            sourceEl.style.cssText = `
                font-family: 'Helvetica Neue', sans-serif;
                font-size: 14px;
                color: #555555;
                font-style: italic;
            `;
            sourceEl.textContent = 'Source: ' + factCheck.source;
            factCheckSection.appendChild(sourceEl);
        }

        wrapper.appendChild(factCheckSection);
        this.containerElement.appendChild(wrapper);

        // Start quote animation immediately
        requestAnimationFrame(() => {
            speakerLabel.style.opacity = '1';
            speakerLabel.style.transform = 'translateY(0)';
            quoteEl.style.opacity = '1';
            quoteEl.style.transform = 'scale(1)';
            const dateEl = wrapper.querySelector('.factcheck-date');
            if (dateEl) {
                dateEl.style.opacity = '1';
            }
        });
    }

    revealFactCheck() {
        if (!this.containerElement) return;

        const factCheckSection = this.containerElement.querySelector('.factcheck-section');
        if (factCheckSection) {
            factCheckSection.style.opacity = '1';
            factCheckSection.style.transform = 'translateY(0)';
        }
    }

    startUpdateLoop() {
        if (this.updateLoopRunning) return;
        this.updateLoopRunning = true;

        const loop = () => {
            if (!this.updateLoopRunning) return;

            const now = performance.now();
            const elapsed = now - this.phaseStartTime;

            switch (this.animationPhase) {
                case 'quote':
                    // Show quote for 3 seconds before fact check
                    if (elapsed > 3000) {
                        this.animationPhase = 'factcheck';
                        this.phaseStartTime = now;
                        this.revealFactCheck();
                    }
                    break;

                case 'factcheck':
                    // Fact check reveal animation takes 1 second
                    if (elapsed > 1000) {
                        this.animationPhase = 'hold';
                        this.phaseStartTime = now;
                    }
                    break;

                case 'hold':
                    // Hold for 6 seconds to read
                    if (elapsed > 6000) {
                        this.animationPhase = 'fading';
                        this.phaseStartTime = now;
                        this.fadeOut();
                    }
                    break;

                case 'fading':
                    // Fade out takes 2 seconds
                    if (elapsed > 2000) {
                        this.animationPhase = 'idle';
                        if (this.containerElement) {
                            while (this.containerElement.firstChild) {
                                this.containerElement.removeChild(this.containerElement.firstChild);
                            }
                        }
                    }
                    break;
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    fadeOut() {
        if (!this.containerElement) return;

        const wrapper = this.containerElement.querySelector('.factcheck-wrapper');
        if (wrapper) {
            wrapper.style.transition = 'opacity 2s ease';
            wrapper.style.opacity = '0';
        }
    }

    updateCharacter(character, deltaTime, speed) {
        character.element.style.display = 'none';
        return false;
    }

    update(currentTime) {
        // Main update handled by startUpdateLoop
    }

    getStats() {
        return {
            mode: 'factcheck',
            phase: this.animationPhase,
            currentQuote: this.currentQuote ? this.currentQuote.text.substring(0, 30) : null
        };
    }
}
