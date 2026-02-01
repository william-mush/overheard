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

// Political Speech UI Elements
const togglePoliticalPanelBtn = document.getElementById('togglePoliticalPanel');
const politicalPanel = document.getElementById('politicalPanel');
const closePoliticalPanelBtn = document.getElementById('closePoliticalPanel');
const politicalOnlyModeCheckbox = document.getElementById('politicalOnlyMode');
const speakerFiltersDiv = document.getElementById('speakerFilters');
const topicFilterSelect = document.getElementById('topicFilter');
const rhetoricFilterSelect = document.getElementById('rhetoricFilter');

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
let customContentIntervals = []; // Array to hold multiple intervals
let logoInterval = null;
let testDataTimeouts = [];
let activeSpeakerFilters = new Set();
let activeTopicFilter = '';
let activeRhetoricFilter = '';
let enabledContradictionIds = null; // null means all enabled

// Initialize - Display mode only (controlled via control.html)
async function init() {
    console.log('Initializing overheard.com display...');

    try {
        // Set up flow engine
        const container = document.getElementById('oceanContainer');
        if (!container) {
            console.error('oceanContainer not found!');
            return;
        }
        flowEngine.initialize(container);
        flowEngine.start();
        console.log('Flow engine started');

        // Start data sources
        console.log('Starting data sources...');
        await dataSource.initialize();
        console.log('Data sources initialized');

        // Get political source and verify it loaded
        const politicalSource = dataSource.getPoliticalSpeechSource();
        console.log('Political source:', politicalSource);
        console.log('Contradictions available:', politicalSource.getContradictions().length);

        // Start in contradiction mode by default
        flowEngine.setMode('contradiction');
        if (flowModeSelect) flowModeSelect.value = 'contradiction';
        document.body.classList.add('art-mode-active');

        // Start contradiction mode immediately since data is already loaded
        console.log('Starting contradiction mode...');
        startContradictionMode(politicalSource);

        console.log('Display initialized - controlled via control.html');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Set up remote control via BroadcastChannel
function setupRemoteControl() {
    // This is handled later in the file via controlChannel
}

// Initialize political speech panel with speakers and filters
async function initPoliticalSpeechPanel() {
    const politicalSource = dataSource.getPoliticalSpeechSource();

    // Wait for political source to be ready
    setTimeout(() => {
        // Populate speaker filters
        const speakers = politicalSource.getAllSpeakers();
        if (speakerFiltersDiv && speakers.length > 0) {
            speakerFiltersDiv.replaceChildren();
            speakers.forEach(speaker => {
                const label = document.createElement('label');
                label.className = 'speaker-checkbox';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = speaker.id;
                checkbox.checked = true;

                const colorSpan = document.createElement('span');
                colorSpan.className = 'speaker-color';
                colorSpan.style.background = speaker.color;

                const nameSpan = document.createElement('span');
                nameSpan.className = 'speaker-name';
                nameSpan.textContent = speaker.name;

                label.appendChild(checkbox);
                label.appendChild(colorSpan);
                label.appendChild(nameSpan);
                speakerFiltersDiv.appendChild(label);

                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        activeSpeakerFilters.delete(e.target.value);
                    } else {
                        activeSpeakerFilters.add(e.target.value);
                    }
                });
            });
        }

        // Populate topic filter
        const topics = politicalSource.getTopics();
        if (topicFilterSelect && Object.keys(topics).length > 0) {
            // Keep the first "All Topics" option
            while (topicFilterSelect.options.length > 1) {
                topicFilterSelect.remove(1);
            }
            Object.entries(topics).forEach(([id, topic]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = topic.label;
                topicFilterSelect.appendChild(option);
            });
        }

        // Populate rhetoric filter
        const rhetoric = politicalSource.getRhetoricTypes();
        if (rhetoricFilterSelect && Object.keys(rhetoric).length > 0) {
            // Keep the first "All Types" option
            while (rhetoricFilterSelect.options.length > 1) {
                rhetoricFilterSelect.remove(1);
            }
            Object.entries(rhetoric).forEach(([id, type]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = type.label;
                rhetoricFilterSelect.appendChild(option);
            });
        }
    }, 1000);
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

    // Add logo constantly as part of the stream (unless custom content is active)
    logoInterval = setInterval(() => {
        if (!customContent.isActive) {
            flowEngine.addItem({
                source: 'OVERHEARD.COM',
                content: 'overheard.com',
                timestamp: Date.now(),
                url: '#',
                isLogo: true
            });
        }
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

    // Display featured headline every 20 seconds (unless custom content is active)
    setInterval(() => {
        if (!customContent.isActive && recentMainstreamNews.length > 0) {
            const headline = recentMainstreamNews[Math.floor(Math.random() * recentMainstreamNews.length)];
            flowEngine.addFeaturedHeadline(headline);
        }
    }, 20000);
}, 1000);

// Event Handlers
flowModeSelect.addEventListener('change', (e) => {
    const selectedMode = e.target.value;
    const politicalModes = ['testimony'];
    const artModes = ['therecord', 'accumulation', 'correction', 'echo', 'whosaidit', 'contradiction', 'factcheck'];

    // Handle Custom Text mode specially
    if (selectedMode === 'customtext') {
        // Open custom content panel
        customContentPanel.style.display = 'block';
        document.body.classList.remove('art-mode-active');

        // Set flow mode to typewriter (most readable for custom text)
        flowEngine.setMode('typewriter');

        // Don't activate custom content yet - let user enter text first
    } else if (artModes.includes(selectedMode)) {
        // Political art mode selected
        if (customContent.isActive) {
            customContent.setActive(false);
            useCustomContentCheckbox.checked = false;
            stopCustomContentFlow();
        }

        // Enable political only mode automatically
        dataSource.setPoliticalOnlyMode(true);
        if (politicalOnlyModeCheckbox) {
            politicalOnlyModeCheckbox.checked = true;
        }

        // Add art mode class for full dark mode
        document.body.classList.add('art-mode-active');

        // Hide panels for immersive experience
        if (politicalPanel) politicalPanel.style.display = 'none';
        if (customContentPanel) customContentPanel.style.display = 'none';
        if (analyticsPanel) analyticsPanel.style.display = 'none';

        flowEngine.setMode(selectedMode);

        // Start feeding political quotes to the art mode
        startArtModeQuotes(selectedMode);
    } else if (politicalModes.includes(selectedMode)) {
        // Political speech mode selected
        if (customContent.isActive) {
            customContent.setActive(false);
            useCustomContentCheckbox.checked = false;
            stopCustomContentFlow();
        }

        document.body.classList.remove('art-mode-active');

        // Enable political only mode automatically
        dataSource.setPoliticalOnlyMode(true);
        if (politicalOnlyModeCheckbox) {
            politicalOnlyModeCheckbox.checked = true;
        }

        // Show political panel
        if (politicalPanel) {
            politicalPanel.style.display = 'block';
        }

        flowEngine.setMode(selectedMode);
    } else {
        // Regular mode selected - deactivate custom content
        if (customContent.isActive) {
            customContent.setActive(false);
            useCustomContentCheckbox.checked = false;
            stopCustomContentFlow();
        }
        document.body.classList.remove('art-mode-active');
        flowEngine.setMode(selectedMode);
    }

    if (analyticsEnabled) {
        analytics.logEvent('flow_mode_change', { mode: selectedMode });
    }
});

// Art mode quote feeder
let artModeInterval = null;

function startArtModeQuotes(mode) {
    // Stop any existing intervals
    if (artModeInterval) {
        clearInterval(artModeInterval);
        artModeInterval = null;
    }
    if (accumulationInterval) {
        clearInterval(accumulationInterval);
        accumulationInterval = null;
    }

    // For accumulation mode, show the panel and wait for user to configure
    if (mode === 'accumulation') {
        showAccumulationPanel();
        // Don't auto-start - let user configure and click "Start Accumulation"
        return;
    }

    const politicalSource = dataSource.getPoliticalSpeechSource();

    // Handle contradiction mode specially - show THEN vs NOW quotes
    if (mode === 'contradiction') {
        startContradictionMode(politicalSource);
        return;
    }

    // Handle factcheck mode - only show quotes with fact checks
    if (mode === 'factcheck') {
        startFactCheckMode(politicalSource);
        return;
    }

    // Timing varies by mode
    const intervals = {
        'therecord': 15000,    // 15 seconds between quotes
        'correction': 12000,   // 12 seconds - needs time for fact-check
        'whosaidit': 12000     // 12 seconds - needs countdown time
    };

    const interval = intervals[mode] || 10000;

    // Send first quote immediately
    const quotes = politicalSource.getRandomQuotes(1);
    if (quotes.length > 0) {
        const quote = quotes[0];
        quote.isPolitical = true;
        quote.speakerColor = politicalSource.getSpeakerColor(quote.speakerId);
        flowEngine.addItem(quote);
    }

    // Then continue at interval
    artModeInterval = setInterval(() => {
        const quotes = politicalSource.getRandomQuotes(1);
        if (quotes.length > 0) {
            const quote = quotes[0];
            quote.isPolitical = true;
            quote.speakerColor = politicalSource.getSpeakerColor(quote.speakerId);
            flowEngine.addItem(quote);
        }
    }, interval);
}

// Contradiction mode feeder
let contradictionIndex = 0;
let contradictionList = [];

function startContradictionMode(politicalSource) {
    // Get all contradictions
    let allContradictions = politicalSource.getContradictions();
    if (allContradictions.length === 0) {
        console.log('No contradictions found');
        return;
    }

    // Filter by enabled list if set
    if (enabledContradictionIds !== null) {
        allContradictions = allContradictions.filter(c => enabledContradictionIds.has(c.id));
    }

    // Shuffle the list
    contradictionList = [...allContradictions].sort(() => Math.random() - 0.5);
    contradictionIndex = 0;

    console.log('Starting contradiction mode with', contradictionList.length, 'contradictions');

    if (contradictionList.length === 0) {
        console.log('No enabled contradictions');
        return;
    }

    // Send first contradiction
    sendNextContradiction(politicalSource);

    // 13 seconds total: 3s showing + 8s hold + 2s fade
    const interval = 15000;

    artModeInterval = setInterval(() => {
        sendNextContradiction(politicalSource);
    }, interval);
}

function sendNextContradiction(politicalSource) {
    if (contradictionList.length === 0) return;

    const contradiction = contradictionList[contradictionIndex];
    contradictionIndex = (contradictionIndex + 1) % contradictionList.length;

    // Add speaker color
    const enrichedContradiction = {
        ...contradiction,
        speakerColor: politicalSource.getSpeakerColor(contradiction.speakerId),
        isPolitical: true
    };

    // Get the contradiction flow and send it directly
    const contradictionFlow = flowEngine.flowModes['contradiction'];
    const container = flowEngine.container || document.getElementById('oceanContainer');

    if (contradictionFlow && contradictionFlow.showContradiction && container) {
        contradictionFlow.showContradiction(enrichedContradiction, container);
    }
}

// Fact Check mode feeder - only shows quotes with fact check ratings
let factCheckQuotes = [];
let factCheckIndex = 0;

function startFactCheckMode(politicalSource) {
    // Get quotes that have fact check ratings (not just unverified)
    factCheckQuotes = politicalSource.getFactCheckedQuotes();

    // If no fact-checked quotes, get all quotes
    if (factCheckQuotes.length === 0) {
        console.log('No fact-checked quotes found, using all quotes');
        factCheckQuotes = politicalSource.getRandomQuotes(50);
    }

    // Shuffle the list
    factCheckQuotes = [...factCheckQuotes].sort(() => Math.random() - 0.5);
    factCheckIndex = 0;

    console.log('Starting fact check mode with', factCheckQuotes.length, 'quotes');

    // Send first quote
    sendNextFactCheckQuote(politicalSource);

    // 12 seconds total: 3s quote + 1s reveal + 6s hold + 2s fade
    const interval = 14000;

    artModeInterval = setInterval(() => {
        sendNextFactCheckQuote(politicalSource);
    }, interval);
}

function sendNextFactCheckQuote(politicalSource) {
    if (factCheckQuotes.length === 0) return;

    const quote = factCheckQuotes[factCheckIndex];
    factCheckIndex = (factCheckIndex + 1) % factCheckQuotes.length;

    // Enrich with color
    const enrichedQuote = {
        ...quote,
        text: quote.content,
        speakerColor: politicalSource.getSpeakerColor(quote.speakerId),
        isPolitical: true
    };

    console.log('Sending fact check quote:', quote.content.substring(0, 40));

    // Send to flow engine
    flowEngine.addItem(enrichedQuote);
}

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

    // Set dropdown to Custom Text mode
    flowModeSelect.value = 'customtext';

    // Set flow engine to typewriter mode (most readable)
    flowEngine.setMode('typewriter');

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

    // If we have image in whole mode, add single image
    if (customContent.imageData && customContent.imageMode === 'whole') {
        const imageItem = customContent.getWholeImageItem();
        console.log('Adding whole image to flow');

        flowEngine.addImageItem(imageItem);
        analytics.track(imageItem);
    }

    // If we have image in tiles mode, add all tiles
    if (customContent.imageData && customContent.imageMode === 'tiles') {
        const tileItems = customContent.getTileItems();
        console.log(`Adding ${tileItems.length} image tiles to flow`);

        tileItems.forEach((item, index) => {
            setTimeout(() => {
                flowEngine.addImageItem(item);
                analytics.track(item);
            }, index * 100); // Stagger tiles
        });
    }

    // If we have image in repeated mode, add multiple copies
    if (customContent.imageData && customContent.imageMode === 'repeated') {
        const imageItem = customContent.getRepeatedImageItem();
        console.log('Adding repeated images to flow');

        // Add first instance
        flowEngine.addImageItem(imageItem);
        analytics.track(imageItem);

        // Set up interval to keep adding more copies
        const imageInterval = setInterval(() => {
            const newItem = customContent.getRepeatedImageItem();
            flowEngine.addImageItem(newItem);
            analytics.track(newItem);
        }, 2000); // New copy every 2 seconds
        customContentIntervals.push(imageInterval);
    }

    // Set up interval to keep adding text content continuously
    if (customContent.customText) {
        // Calculate how long it takes for all text to be added
        const textItems = customContent.getAllTextItems();
        const totalTime = textItems.length * 150;

        // Loop: keep adding text every cycle
        const textInterval = setInterval(() => {
            const textItems = customContent.getAllTextItems();
            textItems.forEach((item, index) => {
                setTimeout(() => {
                    flowEngine.addItem(item);
                    analytics.track(item);
                }, index * 150);
            });
        }, totalTime + 3000); // Loop with 3 second gap between cycles
        customContentIntervals.push(textInterval);
    }
}

// Stop custom content flow
function stopCustomContentFlow() {
    // Clear all custom content intervals
    customContentIntervals.forEach(interval => clearInterval(interval));
    customContentIntervals = [];

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
    const textDiv = document.createElement('div');
    textDiv.innerHTML = '<strong>Text:</strong> ';
    textDiv.appendChild(document.createTextNode(stats.hasText ? `${stats.textWords} words` : 'None'));

    const imageDiv = document.createElement('div');
    imageDiv.innerHTML = '<strong>Image:</strong> ';
    imageDiv.appendChild(document.createTextNode(stats.hasImage ? `${stats.imageElements} ${stats.imageMode} elements` : 'None'));

    const loopDiv = document.createElement('div');
    loopDiv.innerHTML = '<strong>Looping:</strong> ';
    loopDiv.appendChild(document.createTextNode(stats.looping ? 'Yes' : 'No'));

    statsDisplay.replaceChildren(textDiv, imageDiv, loopDiv);
}

// Political Panel Event Handlers
if (togglePoliticalPanelBtn) {
    togglePoliticalPanelBtn.addEventListener('click', () => {
        politicalPanel.style.display = politicalPanel.style.display === 'none' ? 'block' : 'none';
    });
}

if (closePoliticalPanelBtn) {
    closePoliticalPanelBtn.addEventListener('click', () => {
        politicalPanel.style.display = 'none';
    });
}

if (politicalOnlyModeCheckbox) {
    politicalOnlyModeCheckbox.addEventListener('change', (e) => {
        dataSource.setPoliticalOnlyMode(e.target.checked);
    });
}

if (topicFilterSelect) {
    topicFilterSelect.addEventListener('change', (e) => {
        activeTopicFilter = e.target.value;
    });
}

if (rhetoricFilterSelect) {
    rhetoricFilterSelect.addEventListener('change', (e) => {
        activeRhetoricFilter = e.target.value;
    });
}

// Accumulation Panel Elements and Controls
const accumulationPanel = document.getElementById('accumulationPanel');
const closeAccumulationPanelBtn = document.getElementById('closeAccumulationPanel');
const speakerSequenceDiv = document.getElementById('speakerSequence');
const speakerDurationSlider = document.getElementById('speakerDuration');
const speakerDurationLabel = document.getElementById('speakerDurationLabel');
const quoteIntervalSlider = document.getElementById('quoteInterval');
const quoteIntervalLabel = document.getElementById('quoteIntervalLabel');
const quotesPerSpeakerSlider = document.getElementById('quotesPerSpeaker');
const quotesPerSpeakerLabel = document.getElementById('quotesPerSpeakerLabel');
const startAccumulationBtn = document.getElementById('startAccumulation');
const skipSpeakerBtn = document.getElementById('skipSpeaker');

// Speaker data for accumulation mode
const accumulationSpeakers = [
    { id: 'donald-trump', name: 'Donald Trump', color: '#cc0000', enabled: true },
    { id: 'stephen-miller', name: 'Stephen Miller', color: '#990000', enabled: true },
    { id: 'kristi-noem', name: 'Kristi Noem', color: '#aa0000', enabled: true },
    { id: 'jd-vance', name: 'JD Vance', color: '#bb0000', enabled: false },
    { id: 'marjorie-taylor-greene', name: 'Marjorie Taylor Greene', color: '#dd4400', enabled: false },
    { id: 'matt-gaetz', name: 'Matt Gaetz', color: '#cc4400', enabled: false },
    { id: 'jim-jordan', name: 'Jim Jordan', color: '#aa4400', enabled: false }
];

// Populate speaker sequence
function populateSpeakerSequence() {
    if (!speakerSequenceDiv) return;

    speakerSequenceDiv.innerHTML = '';

    accumulationSpeakers.forEach((speaker, index) => {
        const item = document.createElement('div');
        item.className = 'speaker-sequence-item' + (speaker.enabled ? ' active' : '');
        item.dataset.speakerId = speaker.id;
        item.draggable = true;

        item.innerHTML = `
            <input type="checkbox" ${speaker.enabled ? 'checked' : ''}>
            <div class="speaker-color" style="background: ${speaker.color}"></div>
            <span class="speaker-name">${speaker.name}</span>
            <span class="drag-handle">☰</span>
        `;

        // Checkbox toggle
        item.querySelector('input').addEventListener('change', (e) => {
            speaker.enabled = e.target.checked;
            item.classList.toggle('active', speaker.enabled);
        });

        // Drag and drop for reordering
        item.addEventListener('dragstart', (e) => {
            item.classList.add('dragging');
            e.dataTransfer.setData('text/plain', index);
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = accumulationSpeakers.findIndex(s => s.id === speaker.id);

            // Reorder array
            const [moved] = accumulationSpeakers.splice(fromIndex, 1);
            accumulationSpeakers.splice(toIndex, 0, moved);

            // Rebuild UI
            populateSpeakerSequence();
        });

        speakerSequenceDiv.appendChild(item);
    });
}

// Slider event handlers
if (speakerDurationSlider) {
    speakerDurationSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        speakerDurationLabel.textContent = `${value} seconds`;
    });
}

if (quoteIntervalSlider) {
    quoteIntervalSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        quoteIntervalLabel.textContent = `${value} seconds`;
    });
}

if (quotesPerSpeakerSlider) {
    quotesPerSpeakerSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        quotesPerSpeakerLabel.textContent = `${value} quotes`;
    });
}

// Close panel
if (closeAccumulationPanelBtn) {
    closeAccumulationPanelBtn.addEventListener('click', () => {
        accumulationPanel.style.display = 'none';
    });
}

// Start accumulation with selected speakers
if (startAccumulationBtn) {
    startAccumulationBtn.addEventListener('click', () => {
        const enabledSpeakers = accumulationSpeakers.filter(s => s.enabled).map(s => s.id);

        if (enabledSpeakers.length === 0) {
            alert('Please select at least one speaker');
            return;
        }

        // Get timing settings
        const speakerDuration = parseInt(speakerDurationSlider.value) * 1000;
        const quoteInterval = parseInt(quoteIntervalSlider.value) * 1000;
        const quotesPerSpeaker = parseInt(quotesPerSpeakerSlider.value);

        // Configure the accumulation flow
        const accumulationFlow = flowEngine.flowModes['accumulation'];
        if (accumulationFlow && accumulationFlow.configure) {
            accumulationFlow.configure({
                speakers: enabledSpeakers,
                speakerDuration: speakerDuration,
                quoteInterval: quoteInterval,
                quotesPerSpeaker: quotesPerSpeaker
            });
        }

        // Reset and start
        if (accumulationFlow && accumulationFlow.reset) {
            accumulationFlow.reset();
        }

        // Make sure we're in accumulation mode
        if (flowEngine.mode !== 'accumulation') {
            flowModeSelect.value = 'accumulation';
            flowEngine.setMode('accumulation');
            document.body.classList.add('art-mode-active');
        }

        // Start feeding quotes
        startAccumulationQuotes(enabledSpeakers, quoteInterval);
    });
}

// Skip to next speaker
if (skipSpeakerBtn) {
    skipSpeakerBtn.addEventListener('click', () => {
        const accumulationFlow = flowEngine.flowModes['accumulation'];
        if (accumulationFlow && accumulationFlow.skipToNextSpeaker) {
            accumulationFlow.skipToNextSpeaker();
        }
    });
}

// Accumulation quote feeder with speaker filtering
let accumulationInterval = null;
let currentAccumulationSpeakerIndex = 0;
let accumulationSpeakerQueue = [];

function startAccumulationQuotes(speakers, interval) {
    // Stop any existing intervals
    if (accumulationInterval) {
        clearInterval(accumulationInterval);
        accumulationInterval = null;
    }
    if (artModeInterval) {
        clearInterval(artModeInterval);
        artModeInterval = null;
    }

    accumulationSpeakerQueue = [...speakers];
    currentAccumulationSpeakerIndex = 0;

    const politicalSource = dataSource.getPoliticalSpeechSource();

    // Reset shown quotes tracking
    if (politicalSource.resetShownQuotes) {
        politicalSource.resetShownQuotes();
    }

    console.log('Starting accumulation with speakers:', accumulationSpeakerQueue);

    const sendQuote = () => {
        if (accumulationSpeakerQueue.length === 0) {
            console.log('No speakers in queue');
            return;
        }

        // Get the current speaker from the flow, or use the first in queue
        const accFlow = flowEngine.flowModes['accumulation'];
        let currentSpeakerId = accumulationSpeakerQueue[currentAccumulationSpeakerIndex];

        if (accFlow && accFlow.getCurrentSpeaker && accFlow.getCurrentSpeaker()) {
            currentSpeakerId = accFlow.getCurrentSpeaker();
            // Update our index to match
            const idx = accumulationSpeakerQueue.indexOf(currentSpeakerId);
            if (idx >= 0) {
                currentAccumulationSpeakerIndex = idx;
            }
        }

        console.log('Fetching quote for speaker:', currentSpeakerId);

        // Get a quote for this specific speaker
        let quotes = [];
        if (politicalSource.getQuotesBySpeakerSequential) {
            quotes = politicalSource.getQuotesBySpeakerSequential(currentSpeakerId);
        } else {
            quotes = politicalSource.getQuotesBySpeaker(currentSpeakerId, 1);
        }

        if (quotes.length > 0) {
            const quote = quotes[0];
            quote.isPolitical = true;
            quote.speakerColor = politicalSource.getSpeakerColor(quote.speakerId);
            console.log('Adding quote from:', quote.speaker, '-', quote.content.substring(0, 50));
            flowEngine.addItem(quote);
        } else {
            console.log('No quotes found for speaker:', currentSpeakerId);
        }
    };

    // Send first quote immediately
    sendQuote();

    // Then continue at interval
    accumulationInterval = setInterval(sendQuote, interval);
}

// Show accumulation panel when accumulation mode is selected
function showAccumulationPanel() {
    if (accumulationPanel) {
        accumulationPanel.style.display = 'block';
        populateSpeakerSequence();
    }
}

// Update the flow mode change handler to show accumulation panel
const originalFlowModeHandler = flowModeSelect.onchange;
flowModeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'accumulation') {
        showAccumulationPanel();
    } else if (accumulationPanel) {
        accumulationPanel.style.display = 'none';
    }
});

// Start the application
init();

// Initialize accumulation panel on load
populateSpeakerSequence();

// ============================================
// Remote Control Panel Communication
// ============================================
const controlChannel = new BroadcastChannel('overheard-control');
let quotesShownCount = 0;

// Authenticated control panel tokens (registered when control panel connects)
const authorizedTokens = new Set();
let tokenRegistrationEnabled = true;

// Disable new token registration after 5 minutes for security
setTimeout(() => {
    tokenRegistrationEnabled = false;
    console.log('Token registration window closed');
}, 5 * 60 * 1000);

// Rate limiting for control commands
const rateLimiter = {
    lastCommand: 0,
    minInterval: 100, // Minimum 100ms between commands
    commandCount: 0,
    windowStart: Date.now(),
    maxPerWindow: 60, // Max 60 commands per minute

    check() {
        const now = Date.now();

        // Reset window every minute
        if (now - this.windowStart > 60000) {
            this.windowStart = now;
            this.commandCount = 0;
        }

        // Check rate limits
        if (now - this.lastCommand < this.minInterval) {
            console.warn('Rate limit: too fast');
            return false;
        }

        if (this.commandCount >= this.maxPerWindow) {
            console.warn('Rate limit: too many commands');
            return false;
        }

        this.lastCommand = now;
        this.commandCount++;
        return true;
    }
};

// Valid modes for setMode command validation
const VALID_MODES = [
    'wave', 'customtext', 'probability', 'cascade', 'chaos', 'matrix',
    'spiral', 'explosion', 'river', 'orbit', 'redacted', 'typewriter',
    'overwrite', 'ticker', 'takeover', 'nytimeschaos', 'nytimestypewriter',
    'testimony', 'contradiction', 'factcheck', 'therecord', 'accumulation',
    'correction', 'whosaidit'
];

// Send heartbeat to control panel
setInterval(() => {
    controlChannel.postMessage({ type: 'heartbeat', timestamp: Date.now() });

    // Send stats
    const flowStats = flowEngine.getStats();
    const accFlow = flowEngine.flowModes['accumulation'];
    controlChannel.postMessage({
        type: 'stats',
        data: {
            quotesShown: quotesShownCount,
            mode: flowEngine.mode,
            currentSpeaker: accFlow && accFlow.getCurrentSpeaker ? accFlow.getCurrentSpeaker() : null
        }
    });
}, 1000);

// Listen for commands from control panel
controlChannel.onmessage = (event) => {
    const { type, data, token } = event.data;

    // Commands that don't require auth
    const publicCommands = ['ping', 'heartbeat', 'stats', 'currentQuote'];

    // If not a public command, verify token and rate limit
    if (!publicCommands.includes(type)) {
        // Check rate limiting
        if (!rateLimiter.check()) {
            return;
        }

        if (token) {
            // Register token if registration is still open
            if (tokenRegistrationEnabled && !authorizedTokens.has(token)) {
                authorizedTokens.add(token);
                console.log('Registered new control panel token');
            }

            // Verify token is authorized
            if (!authorizedTokens.has(token)) {
                console.warn('Unauthorized control command rejected:', type);
                return;
            }
        } else {
            console.warn('Control command without token rejected:', type);
            return;
        }
    }

    switch (type) {
        case 'ping':
            controlChannel.postMessage({ type: 'heartbeat', timestamp: Date.now() });
            break;

        case 'setMode':
            // Validate mode
            if (!VALID_MODES.includes(data)) {
                console.warn('Invalid mode rejected:', data);
                break;
            }
            console.log('Remote control: setMode', data);
            // Stop any existing art mode intervals
            if (artModeInterval) {
                clearInterval(artModeInterval);
                artModeInterval = null;
            }
            if (accumulationInterval) {
                clearInterval(accumulationInterval);
                accumulationInterval = null;
            }

            // Set the mode directly
            flowEngine.setMode(data);
            flowModeSelect.value = data;

            // Handle art modes (must match list at line 268)
            const artModes = ['therecord', 'accumulation', 'correction', 'echo', 'whosaidit', 'contradiction', 'factcheck'];
            if (artModes.includes(data)) {
                document.body.classList.add('art-mode-active');
                const politicalSource = dataSource.getPoliticalSpeechSource();

                if (data === 'contradiction') {
                    startContradictionMode(politicalSource);
                } else if (data === 'factcheck') {
                    startFactCheckMode(politicalSource);
                } else if (data === 'accumulation') {
                    // Accumulation needs speaker config - use all enabled
                    const enabledSpeakers = accumulationSpeakers.filter(s => s.enabled).map(s => s.id);
                    if (enabledSpeakers.length > 0) {
                        startAccumulationQuotes(enabledSpeakers, 3000);
                    }
                } else {
                    startArtModeQuotes(data);
                }
            } else {
                document.body.classList.remove('art-mode-active');
            }
            break;

        case 'setSpeed':
            // Validate speed (1-10)
            const speed = parseInt(data);
            if (isNaN(speed) || speed < 1 || speed > 10) {
                console.warn('Invalid speed rejected:', data);
                break;
            }
            speedControl.value = speed;
            flowEngine.setSpeed(speed);
            break;

        case 'setDensity':
            // Validate density (1-10)
            const density = parseInt(data);
            if (isNaN(density) || density < 1 || density > 10) {
                console.warn('Invalid density rejected:', data);
                break;
            }
            densityControl.value = density;
            flowEngine.setDensity(density);
            break;

        case 'setSpeakers':
            // Update speaker selection
            const selectedSet = new Set(data);
            accumulationSpeakers.forEach(speaker => {
                speaker.enabled = selectedSet.has(speaker.id);
            });
            populateSpeakerSequence();
            break;

        case 'startArt':
            // Start art mode with specified settings
            const accFlow = flowEngine.flowModes['accumulation'];
            if (accFlow && accFlow.configure) {
                accFlow.configure({
                    speakers: data.speakers,
                    speakerDuration: data.speakerTime,
                    quoteInterval: data.quoteInterval,
                    quotesPerSpeaker: data.quotesPerSpeaker
                });
            }
            if (accFlow && accFlow.reset) {
                accFlow.reset();
            }
            startAccumulationQuotes(data.speakers, data.quoteInterval);
            break;

        case 'skipSpeaker':
            const accumulationFlow = flowEngine.flowModes['accumulation'];
            if (accumulationFlow && accumulationFlow.skipToNextSpeaker) {
                accumulationFlow.skipToNextSpeaker();
            }
            break;

        case 'stopArt':
            if (artModeInterval) {
                clearInterval(artModeInterval);
                artModeInterval = null;
            }
            if (accumulationInterval) {
                clearInterval(accumulationInterval);
                accumulationInterval = null;
            }
            break;

        case 'setContradictions':
            // Filter contradictions to only enabled ones
            enabledContradictionIds = new Set(data);
            console.log('Enabled contradictions:', enabledContradictionIds.size);
            break;
    }
};

// Track quotes shown and notify control panel
const originalAddItem = flowEngine.addItem.bind(flowEngine);
flowEngine.addItem = function(data) {
    originalAddItem(data);
    if (data.isPolitical) {
        quotesShownCount++;
        controlChannel.postMessage({
            type: 'currentQuote',
            data: {
                text: data.content || data.text,
                speaker: data.speaker
            }
        });
    }
};
