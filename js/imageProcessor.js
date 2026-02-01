// Image Processor - Convert images to ASCII art and pixel particles

export class ImageProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        // ASCII characters ordered by density (light to dark)
        this.asciiChars = [' ', '.', '·', ':', '-', '=', '+', '*', '#', '%', '@'];
    }

    /**
     * Convert image to ASCII art
     * @param {File|Image} imageSource - Image file or image element
     * @param {number} width - Target width in characters
     * @returns {Promise<Array>} Array of {char, color, x, y} objects
     */
    async imageToASCII(imageSource, width = 100) {
        const img = await this.loadImage(imageSource);

        // Calculate dimensions maintaining aspect ratio
        const aspectRatio = img.height / img.width;
        const height = Math.floor(width * aspectRatio * 0.5); // 0.5 because characters are taller than wide

        // Set canvas size
        this.canvas.width = width;
        this.canvas.height = height;

        // Draw image to canvas
        this.ctx.drawImage(img, 0, 0, width, height);

        // Get pixel data
        const imageData = this.ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        const asciiArt = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];

                // Skip fully transparent pixels
                if (a < 10) continue;

                // Calculate brightness (0-255)
                const brightness = (r + g + b) / 3;

                // Map brightness to ASCII character
                const charIndex = Math.floor((brightness / 255) * (this.asciiChars.length - 1));
                const char = this.asciiChars[charIndex];

                // Get color
                const color = `rgb(${r}, ${g}, ${b})`;

                asciiArt.push({
                    char,
                    color,
                    x,
                    y,
                    brightness
                });
            }
        }

        return asciiArt;
    }

    /**
     * Convert image to pixel particles
     * @param {File|Image} imageSource - Image file or image element
     * @param {number} maxParticles - Maximum number of particles
     * @returns {Promise<Array>} Array of {color, x, y} objects
     */
    async imageToParticles(imageSource, maxParticles = 2000) {
        const img = await this.loadImage(imageSource);

        // Scale image down for performance
        const maxDimension = 100;
        const scale = Math.min(maxDimension / img.width, maxDimension / img.height);
        const width = Math.floor(img.width * scale);
        const height = Math.floor(img.height * scale);

        this.canvas.width = width;
        this.canvas.height = height;

        // Draw image
        this.ctx.drawImage(img, 0, 0, width, height);

        // Get pixel data
        const imageData = this.ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        const particles = [];

        // Sample pixels (skip some for performance)
        const step = Math.ceil((width * height) / maxParticles);

        for (let i = 0; i < pixels.length; i += step * 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];

            // Skip transparent pixels
            if (a < 10) continue;

            // Calculate position
            const pixelIndex = i / 4;
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);

            // Normalize position (0-1)
            const normalizedX = x / width;
            const normalizedY = y / height;

            particles.push({
                color: `rgba(${r}, ${g}, ${b}, ${a / 255})`,
                x: normalizedX,
                y: normalizedY,
                originalX: normalizedX,
                originalY: normalizedY
            });
        }

        return particles;
    }

    /**
     * Extract dominant colors from image
     * @param {File|Image} imageSource
     * @param {number} numColors - Number of colors to extract
     * @returns {Promise<Array>} Array of color strings
     */
    async extractColors(imageSource, numColors = 5) {
        const img = await this.loadImage(imageSource);

        // Small canvas for color sampling
        this.canvas.width = 50;
        this.canvas.height = 50;
        this.ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = this.ctx.getImageData(0, 0, 50, 50);
        const pixels = imageData.data;

        const colorMap = new Map();

        // Count color frequencies
        for (let i = 0; i < pixels.length; i += 40) { // Sample every 10th pixel
            const r = Math.floor(pixels[i] / 32) * 32; // Quantize colors
            const g = Math.floor(pixels[i + 1] / 32) * 32;
            const b = Math.floor(pixels[i + 2] / 32) * 32;
            const a = pixels[i + 3];

            if (a < 10) continue;

            const colorKey = `${r},${g},${b}`;
            colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
        }

        // Sort by frequency and get top colors
        const sortedColors = [...colorMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, numColors)
            .map(([color]) => {
                const [r, g, b] = color.split(',');
                return `rgb(${r}, ${g}, ${b})`;
            });

        return sortedColors;
    }

    /**
     * Load image from file or URL
     * @param {File|Image|string} source
     * @returns {Promise<Image>}
     */
    async loadImage(source) {
        if (source instanceof HTMLImageElement) {
            return source;
        }

        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => resolve(img);
            img.onerror = reject;

            if (source instanceof File) {
                const reader = new FileReader();
                reader.onload = (e) => img.src = e.target.result;
                reader.onerror = reject;
                reader.readAsDataURL(source);
            } else if (typeof source === 'string') {
                img.src = source;
            } else {
                reject(new Error('Invalid image source'));
            }
        });
    }

    /**
     * Get image dimensions
     * @param {File|Image} imageSource
     * @returns {Promise<{width, height}>}
     */
    async getImageDimensions(imageSource) {
        const img = await this.loadImage(imageSource);
        return {
            width: img.width,
            height: img.height
        };
    }

    /**
     * Break image into tiles for independent flow
     * @param {File|Image} imageSource - Image file or image element
     * @param {number} cols - Number of columns
     * @param {number} rows - Number of rows
     * @returns {Promise<Object>} Object with tiles array and metadata
     */
    async imageToTiles(imageSource, cols = 4, rows = 4) {
        const img = await this.loadImage(imageSource);

        // Calculate tile dimensions
        const tileWidth = Math.floor(img.width / cols);
        const tileHeight = Math.floor(img.height / rows);

        const tiles = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Create canvas for this tile
                const tileCanvas = document.createElement('canvas');
                tileCanvas.width = tileWidth;
                tileCanvas.height = tileHeight;
                const tileCtx = tileCanvas.getContext('2d');

                // Draw the tile portion of the image
                tileCtx.drawImage(
                    img,
                    col * tileWidth, row * tileHeight, // Source position
                    tileWidth, tileHeight,             // Source dimensions
                    0, 0,                              // Destination position
                    tileWidth, tileHeight              // Destination dimensions
                );

                tiles.push({
                    url: tileCanvas.toDataURL(),
                    col,
                    row,
                    width: tileWidth,
                    height: tileHeight,
                    originalX: col * tileWidth,
                    originalY: row * tileHeight
                });
            }
        }

        return {
            type: 'tiles',
            tiles,
            cols,
            rows,
            originalWidth: img.width,
            originalHeight: img.height
        };
    }
}
