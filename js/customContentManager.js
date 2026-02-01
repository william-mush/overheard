// Custom Content Manager - Handles user text and image input

import { ImageProcessor } from './imageProcessor.js';

export class CustomContentManager {
    constructor() {
        this.imageProcessor = new ImageProcessor();
        this.customText = '';
        this.customImage = null;
        this.imageMode = 'whole'; // 'whole', 'tiles', 'repeated'
        this.isActive = false;
        this.loopContent = true;
        this.textIndex = 0;
        this.imageData = null;
        this.imageUrl = null;
    }

    /**
     * Set custom text
     * @param {string} text - User's custom text
     */
    setText(text) {
        this.customText = text;
        this.textIndex = 0;
    }

    /**
     * Set custom image
     * @param {File} imageFile - Image file from user
     */
    async setImage(imageFile) {
        try {
            this.customImage = imageFile;

            // Process image based on mode
            await this.processImage();

            return true;
        } catch (error) {
            console.error('Error processing image:', error);
            return false;
        }
    }

    /**
     * Process image based on current mode
     */
    async processImage() {
        if (!this.customImage) {
            this.imageData = null;
            this.imageUrl = null;
            return;
        }

        console.log(`Processing image in ${this.imageMode} mode...`);

        // Load the image and get its URL
        const img = await this.imageProcessor.loadImage(this.customImage);
        this.imageUrl = img.src;

        switch (this.imageMode) {
            case 'whole':
                // Store image dimensions and URL for whole image mode
                this.imageData = {
                    type: 'whole',
                    url: img.src,
                    width: img.width,
                    height: img.height
                };
                console.log(`Whole image ready: ${img.width}x${img.height}`);
                break;

            case 'tiles':
                // Break image into tiles (e.g., 4x4 grid = 16 tiles)
                this.imageData = await this.imageProcessor.imageToTiles(this.customImage, 4, 4);
                console.log(`Generated ${this.imageData.tiles.length} image tiles`);
                break;

            case 'repeated':
                // Just store the URL - we'll create multiple copies in flow
                this.imageData = {
                    type: 'repeated',
                    url: img.src,
                    width: img.width,
                    height: img.height
                };
                console.log(`Repeated image ready for flow`);
                break;
        }
    }

    /**
     * Set image display mode
     * @param {string} mode - 'ascii', 'particles', or 'background'
     */
    async setImageMode(mode) {
        this.imageMode = mode;
        if (this.customImage) {
            await this.processImage();
        }
    }

    /**
     * Toggle custom content mode
     * @param {boolean} active
     */
    setActive(active) {
        this.isActive = active;
        this.textIndex = 0; // Reset when toggling
    }

    /**
     * Toggle content looping
     * @param {boolean} loop
     */
    setLoop(loop) {
        this.loopContent = loop;
    }

    /**
     * Clear custom content
     */
    clear() {
        this.customText = '';
        this.customImage = null;
        this.imageData = null;
        this.textIndex = 0;
    }

    /**
     * Clear just the text
     */
    clearText() {
        this.customText = '';
        this.textIndex = 0;
    }

    /**
     * Clear just the image
     */
    clearImage() {
        this.customImage = null;
        this.imageData = null;
    }

    /**
     * Get next chunk of content to display
     * @returns {Object|null} Content object with text and/or image data
     */
    getNextContent() {
        if (!this.isActive) {
            return null;
        }

        const content = {};
        let hasContent = false;

        // Handle text content
        if (this.customText) {
            const words = this.customText.split(/\s+/);

            if (this.textIndex < words.length) {
                // Get next chunk of words (1-5 words at a time for varied flow)
                const chunkSize = Math.floor(Math.random() * 5) + 1;
                const chunk = words.slice(this.textIndex, this.textIndex + chunkSize);
                content.text = chunk.join(' ');
                this.textIndex += chunkSize;
                hasContent = true;
            } else if (this.loopContent) {
                // Loop back to beginning
                this.textIndex = 0;
                const chunk = words.slice(0, 3);
                content.text = chunk.join(' ');
                this.textIndex = 3;
                hasContent = true;
            }
        }

        // Handle image content
        if (this.imageData) {
            if (this.imageMode === 'ascii') {
                // Return a batch of ASCII characters
                content.asciiChars = this.imageData;
                hasContent = true;
            } else if (this.imageMode === 'particles') {
                // Return particle data
                content.particles = this.imageData;
                hasContent = true;
            } else if (this.imageMode === 'background') {
                // Return background image URL
                content.backgroundImage = this.imageData.imageUrl;
                hasContent = true;
            }
        }

        return hasContent ? content : null;
    }

    /**
     * Get all text as items for immediate display
     * @returns {Array} Array of text items
     */
    getAllTextItems() {
        if (!this.customText) return [];

        const words = this.customText.split(/\s+/).filter(w => w.length > 0);

        return words.map((word, index) => ({
            source: 'Custom',
            content: word,
            timestamp: Date.now() + index,
            url: '#',
            isCustom: true
        }));
    }

    /**
     * Get whole image item for flow
     * @returns {Object|null} Image item
     */
    getWholeImageItem() {
        if (!this.imageData || this.imageMode !== 'whole') return null;

        return {
            source: 'Custom Image',
            content: '', // No text content
            timestamp: Date.now(),
            url: '#',
            isCustom: true,
            isImage: true,
            imageUrl: this.imageData.url,
            imageWidth: this.imageData.width,
            imageHeight: this.imageData.height
        };
    }

    /**
     * Get image tiles as items
     * @returns {Array} Array of tile items
     */
    getTileItems() {
        if (!this.imageData || this.imageMode !== 'tiles') return [];

        return this.imageData.tiles.map((tile, index) => ({
            source: 'Custom Image',
            content: '', // No text content
            timestamp: Date.now() + index,
            url: '#',
            isCustom: true,
            isImage: true,
            isTile: true,
            imageUrl: tile.url,
            imageWidth: tile.width,
            imageHeight: tile.height,
            tileCol: tile.col,
            tileRow: tile.row
        }));
    }

    /**
     * Get repeated image item (will be added multiple times)
     * @returns {Object|null} Image item
     */
    getRepeatedImageItem() {
        if (!this.imageData || this.imageMode !== 'repeated') return null;

        return {
            source: 'Custom Image',
            content: '', // No text content
            timestamp: Date.now(),
            url: '#',
            isCustom: true,
            isImage: true,
            isRepeated: true,
            imageUrl: this.imageData.url,
            imageWidth: this.imageData.width,
            imageHeight: this.imageData.height
        };
    }

    /**
     * Check if has any content
     * @returns {boolean}
     */
    hasContent() {
        return !!(this.customText || this.imageData);
    }

    /**
     * Get content stats
     * @returns {Object}
     */
    getStats() {
        return {
            hasText: !!this.customText,
            textLength: this.customText.length,
            textWords: this.customText ? this.customText.split(/\s+/).length : 0,
            hasImage: !!this.imageData,
            imageMode: this.imageMode,
            imageElements: this.imageData ? this.imageData.length : 0,
            isActive: this.isActive,
            looping: this.loopContent
        };
    }
}
