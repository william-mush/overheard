// Testimony Flow - Words scroll up like closed captions at a podium

export class TestimonyFlow {
    constructor() {
        this.speakerName = '';
        this.speakerColor = '#ffffff';
    }

    reset() {
        this.speakerName = '';
        this.speakerColor = '#ffffff';
    }

    setSpeaker(name, color) {
        this.speakerName = name;
        this.speakerColor = color;
    }

    initializeCharacter(character) {
        // Position at bottom center, will scroll up
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;

        // Center horizontally with some randomness
        character.x = containerWidth / 2 - 200 + (Math.random() - 0.5) * 100;
        character.y = containerHeight - 100; // Start near bottom

        character.vx = 0;
        character.vy = -1.5; // Scroll upward

        // Larger font for testimony feel
        character.element.style.fontSize = '48px';
        character.element.style.fontWeight = '600';
        character.element.style.textAlign = 'center';
        character.element.style.maxWidth = '600px';
        character.element.style.lineHeight = '1.4';

        // Apply speaker color if available
        if (character.speakerColor) {
            character.element.style.color = character.speakerColor;
            character.element.style.textShadow = `0 0 20px ${character.speakerColor}, 0 0 40px ${character.speakerColor}`;
        }
    }

    updateCharacter(character, deltaTime, speed) {
        character.age += deltaTime;

        // Move upward
        character.y += character.vy * speed * 0.5;

        // Fade in at start
        if (character.age < 500) {
            character.opacity = character.age / 500;
        }
        // Fade out as it reaches the top
        else if (character.y < 200) {
            character.opacity = Math.max(0, character.y / 200);
        } else {
            character.opacity = 1;
        }

        // Remove when off screen or too old
        return character.y > -50 && character.age < 15000;
    }

    getStats() {
        return {
            mode: 'testimony',
            speaker: this.speakerName
        };
    }
}
