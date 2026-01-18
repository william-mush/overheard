// Analytics Collector - Tracks and analyzes information flows

export class AnalyticsCollector {
    constructor() {
        this.data = {
            items: [],
            events: [],
            sources: {},
            flowPatterns: [],
            sessionStart: Date.now()
        };
        this.maxStoredItems = 1000;
    }

    track(item) {
        // Store item data
        this.data.items.push({
            ...item,
            capturedAt: Date.now()
        });

        // Track source
        if (!this.data.sources[item.source]) {
            this.data.sources[item.source] = 0;
        }
        this.data.sources[item.source]++;

        // Limit memory usage
        if (this.data.items.length > this.maxStoredItems) {
            this.data.items.shift();
        }
    }

    logEvent(eventType, metadata = {}) {
        this.data.events.push({
            type: eventType,
            timestamp: Date.now(),
            metadata
        });

        // Limit events
        if (this.data.events.length > 500) {
            this.data.events.shift();
        }
    }

    getStats() {
        const now = Date.now();
        const sessionDuration = now - this.data.sessionStart;
        const oneMinuteAgo = now - 60000;

        // Items in last minute
        const recentItems = this.data.items.filter(item => item.capturedAt > oneMinuteAgo);

        return {
            totalItems: this.data.items.length,
            itemsPerMinute: recentItems.length,
            sourceBreakdown: { ...this.data.sources },
            sessionDuration: Math.floor(sessionDuration / 1000),
            totalEvents: this.data.events.length
        };
    }

    analyzeFlowPatterns() {
        // Analyze temporal patterns
        const hourlyDistribution = this.getHourlyDistribution();
        const sourceCorrelations = this.getSourceCorrelations();
        const topicClusters = this.extractTopics();

        return {
            hourlyDistribution,
            sourceCorrelations,
            topicClusters,
            insights: this.generateInsights()
        };
    }

    getHourlyDistribution() {
        const distribution = {};

        this.data.items.forEach(item => {
            const hour = new Date(item.timestamp).getHours();
            distribution[hour] = (distribution[hour] || 0) + 1;
        });

        return distribution;
    }

    getSourceCorrelations() {
        // Simple co-occurrence analysis
        const correlations = {};

        // Track which sources appear together in time windows
        const windowSize = 60000; // 1 minute
        const windows = [];

        let currentWindow = {
            start: this.data.items[0]?.capturedAt || Date.now(),
            sources: new Set()
        };

        this.data.items.forEach(item => {
            if (item.capturedAt - currentWindow.start > windowSize) {
                windows.push(currentWindow);
                currentWindow = {
                    start: item.capturedAt,
                    sources: new Set()
                };
            }
            currentWindow.sources.add(item.source);
        });

        // Calculate co-occurrence
        windows.forEach(window => {
            const sources = Array.from(window.sources);
            for (let i = 0; i < sources.length; i++) {
                for (let j = i + 1; j < sources.length; j++) {
                    const pair = [sources[i], sources[j]].sort().join('|');
                    correlations[pair] = (correlations[pair] || 0) + 1;
                }
            }
        });

        return correlations;
    }

    extractTopics() {
        // Simple keyword extraction
        const keywords = {};

        this.data.items.forEach(item => {
            const words = item.content
                .toLowerCase()
                .split(/\W+/)
                .filter(w => w.length > 4); // Only words longer than 4 chars

            words.forEach(word => {
                keywords[word] = (keywords[word] || 0) + 1;
            });
        });

        // Get top 20 keywords
        const topKeywords = Object.entries(keywords)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word, count]) => ({ word, count }));

        return topKeywords;
    }

    generateInsights() {
        const stats = this.getStats();
        const insights = [];

        // Most active source
        const topSource = Object.entries(stats.sourceBreakdown)
            .sort((a, b) => b[1] - a[1])[0];

        if (topSource) {
            insights.push({
                type: 'dominant_source',
                message: `${topSource[0]} is the most active source with ${topSource[1]} items`
            });
        }

        // Activity rate
        if (stats.itemsPerMinute > 10) {
            insights.push({
                type: 'high_activity',
                message: 'High information flow detected'
            });
        }

        // Diversity
        const sourceCount = Object.keys(stats.sourceBreakdown).length;
        if (sourceCount > 5) {
            insights.push({
                type: 'diverse_sources',
                message: `Information flowing from ${sourceCount} different sources`
            });
        }

        return insights;
    }

    exportData() {
        // Export data for external analysis
        return {
            ...this.data,
            stats: this.getStats(),
            analysis: this.analyzeFlowPatterns(),
            exportedAt: Date.now()
        };
    }

    exportAsJSON() {
        return JSON.stringify(this.exportData(), null, 2);
    }

    exportAsCSV() {
        const headers = ['timestamp', 'source', 'content', 'capturedAt'];
        const rows = this.data.items.map(item => [
            item.timestamp,
            item.source,
            `"${item.content.replace(/"/g, '""')}"`,
            item.capturedAt
        ]);

        return [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    }
}
