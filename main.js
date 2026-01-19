import { FlowEngine } from './js/flowEngine.js';
import { DataSourceManager } from './js/dataSourceManager.js';
import { AnalyticsCollector } from './js/analytics.js';

// Initialize systems
const flowEngine = new FlowEngine();
const dataSource = new DataSourceManager();
const analytics = new AnalyticsCollector();

// UI Elements
const flowModeSelect = document.getElementById('flowMode');
const speedControl = document.getElementById('speedControl');
const densityControl = document.getElementById('densityControl');
const toggleAnalyticsBtn = document.getElementById('toggleAnalytics');
const analyticsPanel = document.getElementById('analyticsPanel');
const analyticsData = document.getElementById('analyticsData');

// State
let analyticsEnabled = false;

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

// Start the application
init();
