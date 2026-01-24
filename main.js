import { FlowEngine } from './js/flowEngine.js';
import { DataSourceManager } from './js/dataSourceManager.js';
import { AnalyticsCollector } from './js/analytics.js';
import { CustomContentManager } from './js/customContentManager.js';

// Initialize systems
const flowEngine = new FlowEngine();
const dataSource = new DataSourceManager();
const analytics = new AnalyticsCollector();
const customContent = new CustomContentManager();

// UI Elements
const flowModeSelect = document.getElementById('flowMode');
const speedControl = document.getElementById('speedControl');
const densityControl = document.getElementById('densityControl');
const toggleAnalyticsBtn = document.getElementById('toggleAnalytics');
const analyticsPanel = document.getElementById('analyticsPanel');
const analyticsData = document.getElementById('analyticsData');

// Custom Content UI Elements
const toggleCustomContentBtn = document.getElementById('toggleCustomContent');
const customContentPanel = document.getElementById('customContentPanel');
const closeCustomPanelBtn = document.getElementById('closeCustomPanel');
const useCustomContentCheckbox = document.getElementById('useCustomContent');
const customTextInput = document.getElementById('customTextInput');
const imageInput = document.getElementById('imageInput');
const uploadImageBtn = document.getElementById('uploadImageBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const clearImageBtn = document.getElementById('clearImageBtn');
const clearTextBtn = document.getElementById('clearTextBtn');
const imageModeSection = document.getElementById('imageModeSection');
const imageModeRadios = document.querySelectorAll('input[name="imageMode"]');
const loopContentCheckbox = document.getElementById('loopContent');
const applyCustomContentBtn = document.getElementById('applyCustomContent');
const customStats = document.getElementById('customStats');
const statsDisplay = document.getElementById('statsDisplay');

// State
let analyticsEnabled = false;
let customContentInterval = null;

// Initialize
async function init() {
    console.log('Initializing overheard.com...');

    // Set up flow engine
    flowEngine.initialize(document.getElementById('oceanContainer'));
    flowEngine.start();
    console.log('Flow engine started');

    // Add some immediate test data to verify flow is working
    addTestData();

    // Start data sources
    console.log('Starting data sources...');
    await dataSource.initialize();

    // Subscribe to new data
    dataSource.on('newData', (data) => {
        console.log('New data received:', data.source);

        // Filter data based on flow mode
        const currentMode = flowEngine.mode;
        const isNYTimesMode = currentMode === 'nytimeschaos' || currentMode === 'nytimestypewriter';
        const isNYTimesData = data.source.includes('NY Times');

        // If we're in NY Times mode, only show NY Times content
        // If we're in regular mode, show everything
        if (isNYTimesMode && !isNYTimesData) {
            return; // Skip non-NY Times data in NY Times modes
        }

        flowEngine.addItem(data);
        analytics.track(data);
    });

    // Start analytics update loop
    setInterval(updateAnalytics, 1000);
    console.log('Initialization complete');
}

// Add test data to verify flow is working
function addTestData() {
    const testItems = [
        { source: 'Test', content: 'Testing wave flow...', timestamp: Date.now(), url: '#' },
        { source: 'Test', content: 'Information flowing like the ocean...', timestamp: Date.now(), url: '#' },
        { source: 'Test', content: 'Welcome to overheard.com', timestamp: Date.now(), url: '#' }
    ];

    testItems.forEach((item, index) => {
        setTimeout(() => {
            flowEngine.addItem(item);
            analytics.track(item);
        }, index * 1000);
    });

    // Add logo constantly as part of the stream
    setInterval(() => {
        flowEngine.addItem({
            source: 'OVERHEARD.COM',
            content: 'overheard.com',
            timestamp: Date.now(),
            url: '#',
            isLogo: true
        });
    }, 3000); // Every 3 seconds
}

// Track major news headlines for featured display
let recentMainstreamNews = [];

// Subscribe to news items and track mainstream sources (in addition to the one in init)
setTimeout(() => {
    dataSource.on('newData', (data) => {
        // Exclude NY Times from featured headlines - we want them to flow only
        const isMainstream = data.source.includes('BBC') ||
                            data.source.includes('Guardian') ||
                            data.source.includes('Reuters') ||
                            data.source.includes('NPR') ||
                            data.source.includes('Jazeera') ||
                            data.source.includes('CNN') ||
                            data.source.includes('AP') ||
                            data.source.includes('Bloomberg');

        if (isMainstream) {
            recentMainstreamNews.push(data);
            if (recentMainstreamNews.length > 20) {
                recentMainstreamNews.shift();
            }
        }
    });

    // Display featured headline every 20 seconds
    setInterval(() => {
        if (recentMainstreamNews.length > 0) {
            const headline = recentMainstreamNews[Math.floor(Math.random() * recentMainstreamNews.length)];
            flowEngine.addFeaturedHeadline(headline);
        }
    }, 20000);
}, 1000);

// Event Handlers
flowModeSelect.addEventListener('change', (e) => {
    flowEngine.setMode(e.target.value);
    if (analyticsEnabled) {
        analytics.logEvent('flow_mode_change', { mode: e.target.value });
    }
});

speedControl.addEventListener('input', (e) => {
    flowEngine.setSpeed(parseInt(e.target.value));
});

densityControl.addEventListener('input', (e) => {
    flowEngine.setDensity(parseInt(e.target.value));
});

toggleAnalyticsBtn.addEventListener('click', () => {
    analyticsEnabled = !analyticsEnabled;
    analyticsPanel.style.display = analyticsEnabled ? 'block' : 'none';
    toggleAnalyticsBtn.textContent = `Analytics: ${analyticsEnabled ? 'ON' : 'OFF'}`;
    toggleAnalyticsBtn.style.background = analyticsEnabled ? 'rgba(68, 170, 255, 0.4)' : 'rgba(68, 170, 255, 0.2)';
});

function updateAnalytics() {
    if (!analyticsEnabled) return;

    const stats = analytics.getStats();
    const flowStats = flowEngine.getStats();

    analyticsData.innerHTML = `
        <div><strong>Total Items:</strong> ${stats.totalItems}</div>
        <div><strong>Items/min:</strong> ${stats.itemsPerMinute.toFixed(1)}</div>
        <div><strong>Active Cards:</strong> ${flowStats.activeCards}</div>
        <div><strong>Flow Mode:</strong> ${flowStats.mode}</div>
        <div><strong>Avg Speed:</strong> ${flowStats.avgSpeed.toFixed(2)}px/s</div>
        <div><strong>Sources:</strong></div>
        ${Object.entries(stats.sourceBreakdown).map(([source, count]) =>
            `<div style="margin-left: 10px;">• ${source}: ${count}</div>`
        ).join('')}
    `;
}

// Custom Content Event Handlers

// Toggle custom content panel
toggleCustomContentBtn.addEventListener('click', () => {
    customContentPanel.style.display = customContentPanel.style.display === 'none' ? 'block' : 'none';
});

closeCustomPanelBtn.addEventListener('click', () => {
    customContentPanel.style.display = 'none';
});

// Toggle custom content mode
useCustomContentCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        console.log('Custom content mode enabled');
        customContent.setActive(true);
    } else {
        console.log('Custom content mode disabled');
        customContent.setActive(false);
        stopCustomContentFlow();
    }
});

// Loop content toggle
loopContentCheckbox.addEventListener('change', (e) => {
    customContent.setLoop(e.target.checked);
});

// Image upload
uploadImageBtn.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
        previewImg.src = event.target.result;
        imagePreview.style.display = 'block';
        imageModeSection.style.display = 'block';
    };
    reader.readAsDataURL(file);

    // Set image in custom content manager
    const success = await customContent.setImage(file);
    if (success) {
        console.log('Image loaded successfully');
        updateCustomStats();
    } else {
        alert('Failed to load image. Please try a different image.');
    }
});

// Clear image
clearImageBtn.addEventListener('click', () => {
    customContent.clearImage();
    imagePreview.style.display = 'none';
    imageModeSection.style.display = 'none';
    imageInput.value = '';
    updateCustomStats();
});

// Clear text
clearTextBtn.addEventListener('click', () => {
    customTextInput.value = '';
    customContent.clearText();
    updateCustomStats();
});

// Image mode change
imageModeRadios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
        if (e.target.checked) {
            console.log(`Changing image mode to: ${e.target.value}`);
            await customContent.setImageMode(e.target.value);
            updateCustomStats();
        }
    });
});

// Apply custom content
applyCustomContentBtn.addEventListener('click', () => {
    const text = customTextInput.value.trim();

    if (!text && !customContent.imageData) {
        alert('Please enter some text or upload an image first!');
        return;
    }

    // Set text
    if (text) {
        customContent.setText(text);
    }

    // Enable custom content mode
    customContent.setActive(true);
    useCustomContentCheckbox.checked = true;

    // Stop live data if custom content is active
    if (customContent.isActive) {
        console.log('Starting custom content flow...');
        startCustomContentFlow();
    }

    // Update stats
    updateCustomStats();
    customStats.style.display = 'block';

    // Close panel
    customContentPanel.style.display = 'none';

    console.log('Custom content applied!', customContent.getStats());
});

// Start custom content flow
function startCustomContentFlow() {
    // Stop any existing flow
    stopCustomContentFlow();

    // Clear screen
    flowEngine.activeCharacters.forEach(char => {
        if (char.element && char.element.parentNode) {
            char.element.remove();
        }
    });
    flowEngine.activeCharacters = [];

    // If we have text, add it all at once
    if (customContent.customText) {
        const textItems = customContent.getAllTextItems();
        console.log(`Adding ${textItems.length} text items to flow`);

        textItems.forEach((item, index) => {
            setTimeout(() => {
                flowEngine.addItem(item);
                analytics.track(item);
            }, index * 150); // Stagger slightly
        });
    }

    // If we have image in ASCII mode, add characters
    if (customContent.imageData && customContent.imageMode === 'ascii') {
        const asciiItems = customContent.getASCIIItems();
        console.log(`Adding ${asciiItems.length} ASCII characters to flow`);

        asciiItems.forEach((item, index) => {
            setTimeout(() => {
                flowEngine.addItem(item);
                analytics.track(item);
            }, index * 10); // Fast for images
        });
    }

    // If we have image in particle mode, add particles
    if (customContent.imageData && customContent.imageMode === 'particles') {
        const particleItems = customContent.getParticleItems();
        console.log(`Adding ${particleItems.length} particles to flow`);

        particleItems.forEach((item, index) => {
            setTimeout(() => {
                flowEngine.addItem(item);
                analytics.track(item);
            }, index * 5); // Very fast for particles
        });
    }

    // If we have background image mode, set background
    if (customContent.imageData && customContent.imageMode === 'background') {
        const container = document.getElementById('oceanContainer');
        container.style.backgroundImage = `url(${customContent.imageData.imageUrl})`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
        container.style.opacity = '0.3';

        // Still add text if available
        if (customContent.customText) {
            const textItems = customContent.getAllTextItems();
            textItems.forEach((item, index) => {
                setTimeout(() => {
                    flowEngine.addItem(item);
                    analytics.track(item);
                }, index * 150);
            });
        }
    }

    // Set up interval to keep adding content if looping
    if (customContent.loopContent && customContent.customText) {
        customContentInterval = setInterval(() => {
            const textItems = customContent.getAllTextItems();
            textItems.forEach((item, index) => {
                setTimeout(() => {
                    flowEngine.addItem(item);
                    analytics.track(item);
                }, index * 150);
            });
        }, textItems.length * 150 + 5000); // Wait a bit before looping
    }
}

// Stop custom content flow
function stopCustomContentFlow() {
    if (customContentInterval) {
        clearInterval(customContentInterval);
        customContentInterval = null;
    }

    // Remove background image if set
    const container = document.getElementById('oceanContainer');
    container.style.backgroundImage = '';
    container.style.opacity = '1';
}

// Update custom stats display
function updateCustomStats() {
    if (!customContent.hasContent()) {
        customStats.style.display = 'none';
        return;
    }

    const stats = customContent.getStats();
    statsDisplay.innerHTML = `
        <div><strong>Text:</strong> ${stats.hasText ? `${stats.textWords} words` : 'None'}</div>
        <div><strong>Image:</strong> ${stats.hasImage ? `${stats.imageElements} ${stats.imageMode} elements` : 'None'}</div>
        <div><strong>Looping:</strong> ${stats.looping ? 'Yes' : 'No'}</div>
    `;
}

// Start the application
init();
