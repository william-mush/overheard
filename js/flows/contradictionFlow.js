// Contradiction Flow - Show THEN vs NOW quotes side by side
// Reveals speaker hypocrisy through their own words

export class ContradictionFlow {
    constructor() {
        this.containerElement = null;
        this.currentContradiction = null;
        this.animationPhase = 'idle'; // idle, showing, hold, fading
        this.phaseStartTime = 0;
        this.updateLoopRunning = false;
    }

    reset() {
        this.currentContradiction = null;
        this.animationPhase = 'idle';
        this.updateLoopRunning = false;

        if (this.containerElement) {
            this.containerElement.remove();
            this.containerElement = null;
        }
    }

    createContainer(parentContainer) {
        this.containerElement = document.createElement('div');
        this.containerElement.className = 'contradiction-container';
        this.containerElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000000;
            overflow: hidden;
            pointer-events: none;
            z-index: 1000;
        `;
        parentContainer.appendChild(this.containerElement);
    }

    initializeCharacter(character) {
        character.element.style.display = 'none';
    }

    // This is called by flowEngine for the contradiction data
    addQuote(quoteData, parentContainer) {
        // For contradiction mode, we expect contradiction data
        // But the engine might send regular quotes too
        if (quoteData.quote1 && quoteData.quote2) {
            this.showContradiction(quoteData, parentContainer);
        }
    }

    // Method to directly show a contradiction
    showContradiction(contradiction, parentContainer) {
        if (!this.containerElement && parentContainer) {
            this.createContainer(parentContainer);
        }

        // Clear any existing content
        if (this.containerElement) {
            while (this.containerElement.firstChild) {
                this.containerElement.removeChild(this.containerElement.firstChild);
            }
        }

        this.currentContradiction = contradiction;
        this.buildContradictionDisplay(contradiction);
        this.animationPhase = 'showing';
        this.phaseStartTime = performance.now();
        this.startUpdateLoop();
    }

    buildContradictionDisplay(contradiction) {
        if (!this.containerElement) return;

        const speakerColor = contradiction.speakerColor || '#cc0000';

        // Main wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'contradiction-wrapper';
        wrapper.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            max-width: 1400px;
            padding: 40px;
            opacity: 0;
            transition: opacity 1s ease;
        `;

        // Speaker name at top
        const speakerLabel = document.createElement('div');
        speakerLabel.className = 'contradiction-speaker';
        speakerLabel.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: ${speakerColor};
            text-transform: uppercase;
            letter-spacing: 6px;
            margin-bottom: 20px;
            opacity: 0;
            transform: translateY(-20px);
            transition: opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s;
        `;
        speakerLabel.textContent = contradiction.speaker;
        wrapper.appendChild(speakerLabel);

        // Topic label
        if (contradiction.topic) {
            const topicLabel = document.createElement('div');
            topicLabel.className = 'contradiction-topic';
            topicLabel.style.cssText = `
                font-family: 'Helvetica Neue', sans-serif;
                font-size: 12px;
                color: #666666;
                letter-spacing: 3px;
                margin-bottom: 40px;
                opacity: 0;
                transition: opacity 0.8s ease 0.5s;
            `;
            topicLabel.textContent = 'ON ' + contradiction.topic.toUpperCase();
            wrapper.appendChild(topicLabel);
        }

        // Quotes container
        const quotesContainer = document.createElement('div');
        quotesContainer.className = 'contradiction-quotes';
        quotesContainer.style.cssText = `
            display: flex;
            width: 100%;
            gap: 60px;
            justify-content: center;
            align-items: stretch;
        `;

        // THEN quote (left)
        const thenQuote = this.createQuotePanel(
            'THEN',
            contradiction.quote1.text,
            contradiction.quote1.date,
            contradiction.quote1.source,
            speakerColor,
            'left'
        );
        quotesContainer.appendChild(thenQuote);

        // VS divider
        const divider = this.createDivider(speakerColor);
        quotesContainer.appendChild(divider);

        // NOW quote (right)
        const nowQuote = this.createQuotePanel(
            'NOW',
            contradiction.quote2.text,
            contradiction.quote2.date,
            contradiction.quote2.source,
            speakerColor,
            'right'
        );
        quotesContainer.appendChild(nowQuote);

        wrapper.appendChild(quotesContainer);
        this.containerElement.appendChild(wrapper);

        // Trigger animations
        requestAnimationFrame(() => {
            wrapper.style.opacity = '1';
            speakerLabel.style.opacity = '1';
            speakerLabel.style.transform = 'translateY(0)';
            const topicEl = wrapper.querySelector('.contradiction-topic');
            if (topicEl) {
                topicEl.style.opacity = '1';
            }
            thenQuote.style.opacity = '1';
            thenQuote.style.transform = 'translateX(0)';

            // Delay the right quote slightly
            setTimeout(() => {
                nowQuote.style.opacity = '1';
                nowQuote.style.transform = 'translateX(0)';
                divider.style.opacity = '1';
                divider.style.transform = 'scale(1)';
            }, 800);
        });
    }

    createDivider(color) {
        const divider = document.createElement('div');
        divider.className = 'contradiction-divider';
        divider.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: scale(0.5);
            transition: opacity 0.8s ease 1.5s, transform 0.8s ease 1.5s;
        `;

        // Top line
        const topLine = document.createElement('div');
        topLine.style.cssText = `
            width: 2px;
            height: 60px;
            background: linear-gradient(to bottom, transparent, ${color}, transparent);
        `;
        divider.appendChild(topLine);

        // VS text
        const vsText = document.createElement('div');
        vsText.style.cssText = `
            font-family: 'Georgia', serif;
            font-size: 24px;
            font-style: italic;
            color: ${color};
            padding: 20px 0;
        `;
        vsText.textContent = 'vs';
        divider.appendChild(vsText);

        // Bottom line
        const bottomLine = document.createElement('div');
        bottomLine.style.cssText = `
            width: 2px;
            height: 60px;
            background: linear-gradient(to bottom, transparent, ${color}, transparent);
        `;
        divider.appendChild(bottomLine);

        return divider;
    }

    createQuotePanel(label, text, date, source, color, side) {
        const panel = document.createElement('div');
        panel.className = 'contradiction-panel contradiction-' + side;

        const translateStart = side === 'left' ? '-50px' : '50px';
        panel.style.cssText = `
            flex: 1;
            max-width: 500px;
            padding: 30px;
            background: rgba(20, 20, 20, 0.9);
            border-radius: 4px;
            border-left: 4px solid ${color};
            opacity: 0;
            transform: translateX(${translateStart});
            transition: opacity 1s ease ${side === 'left' ? '0.7s' : '1.5s'},
                        transform 1s ease ${side === 'left' ? '0.7s' : '1.5s'};
        `;

        // Label (THEN/NOW)
        const labelEl = document.createElement('div');
        labelEl.className = 'quote-label';
        labelEl.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 12px;
            font-weight: 700;
            color: ${color};
            letter-spacing: 4px;
            margin-bottom: 20px;
        `;
        labelEl.textContent = label;
        panel.appendChild(labelEl);

        // Quote text
        const quoteEl = document.createElement('div');
        quoteEl.className = 'quote-text';
        quoteEl.style.cssText = `
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 22px;
            line-height: 1.5;
            color: #ffffff;
            margin-bottom: 20px;
        `;
        quoteEl.textContent = '"' + text + '"';
        panel.appendChild(quoteEl);

        // Date
        const dateEl = document.createElement('div');
        dateEl.className = 'quote-date';
        dateEl.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 14px;
            color: #888888;
            margin-bottom: 5px;
        `;
        dateEl.textContent = date;
        panel.appendChild(dateEl);

        // Source
        const sourceEl = document.createElement('div');
        sourceEl.className = 'quote-source';
        sourceEl.style.cssText = `
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 12px;
            color: #555555;
            font-style: italic;
        `;
        sourceEl.textContent = source;
        panel.appendChild(sourceEl);

        return panel;
    }

    startUpdateLoop() {
        if (this.updateLoopRunning) return;
        this.updateLoopRunning = true;

        const loop = () => {
            if (!this.updateLoopRunning) return;

            const now = performance.now();
            const elapsed = now - this.phaseStartTime;

            switch (this.animationPhase) {
                case 'showing':
                    // Showing animation lasts 3 seconds
                    if (elapsed > 3000) {
                        this.animationPhase = 'hold';
                        this.phaseStartTime = now;
                    }
                    break;

                case 'hold':
                    // Hold for 8 seconds to let viewer read
                    if (elapsed > 8000) {
                        this.animationPhase = 'fading';
                        this.phaseStartTime = now;
                        this.fadeOut();
                    }
                    break;

                case 'fading':
                    // Fade out takes 2 seconds
                    if (elapsed > 2000) {
                        this.animationPhase = 'idle';
                        // Clear the display
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

        const wrapper = this.containerElement.querySelector('.contradiction-wrapper');
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
            mode: 'contradiction',
            phase: this.animationPhase,
            currentContradiction: this.currentContradiction ? this.currentContradiction.id : null
        };
    }
}
