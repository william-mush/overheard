#!/usr/bin/env node

// Transcript Collection Script
// Orchestrates data collection from Congress.gov, YouTube, and White House sources
// Saves results to data/transcripts.json with caching support

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Import sources
import { CongressSource } from '../js/sources/congressSource.js';
import { YouTubeTranscriptSource } from '../js/sources/youtubeTranscriptSource.js';
import { WhiteHouseSource } from '../js/sources/whitehouseSource.js';

// Configuration
const CONFIG = {
    dataDir: path.join(PROJECT_ROOT, 'data'),
    cacheDir: path.join(PROJECT_ROOT, 'data', 'cache'),
    transcriptsFile: path.join(PROJECT_ROOT, 'data', 'transcripts.json'),
    speakersFile: path.join(PROJECT_ROOT, 'data', 'speakers.json'),
    cacheMaxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    maxTranscriptsPerSource: 50,
    delayBetweenRequests: 1000 // ms
};

// Logger utility
const log = {
    info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
    error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
    success: (msg) => console.log(`[SUCCESS] ${new Date().toISOString()} - ${msg}`)
};

// Cache management
class CacheManager {
    constructor(cacheDir) {
        this.cacheDir = cacheDir;
    }

    async initialize() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (error) {
            log.error(`Failed to create cache directory: ${error.message}`);
        }
    }

    getCacheKey(source, identifier) {
        return `${source}-${identifier}`.replace(/[^a-zA-Z0-9-]/g, '_');
    }

    async getCachePath(key) {
        return path.join(this.cacheDir, `${key}.json`);
    }

    async isCached(source, identifier) {
        const key = this.getCacheKey(source, identifier);
        const cachePath = await this.getCachePath(key);

        try {
            const stat = await fs.stat(cachePath);
            const age = Date.now() - stat.mtimeMs;
            return age < CONFIG.cacheMaxAge;
        } catch {
            return false;
        }
    }

    async getFromCache(source, identifier) {
        const key = this.getCacheKey(source, identifier);
        const cachePath = await this.getCachePath(key);

        try {
            const data = await fs.readFile(cachePath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    async saveToCache(source, identifier, data) {
        const key = this.getCacheKey(source, identifier);
        const cachePath = await this.getCachePath(key);

        try {
            await fs.writeFile(cachePath, JSON.stringify(data, null, 2));
        } catch (error) {
            log.error(`Failed to save to cache: ${error.message}`);
        }
    }

    async clearOldCache() {
        try {
            const files = await fs.readdir(this.cacheDir);
            let cleared = 0;

            for (const file of files) {
                const filePath = path.join(this.cacheDir, file);
                const stat = await fs.stat(filePath);
                const age = Date.now() - stat.mtimeMs;

                if (age > CONFIG.cacheMaxAge * 7) { // Clear cache older than 7 days
                    await fs.unlink(filePath);
                    cleared++;
                }
            }

            if (cleared > 0) {
                log.info(`Cleared ${cleared} old cache files`);
            }
        } catch (error) {
            log.warn(`Failed to clear old cache: ${error.message}`);
        }
    }
}

// Transcript collector class
class TranscriptCollector {
    constructor() {
        this.cache = new CacheManager(CONFIG.cacheDir);
        this.speakers = {};
        this.existingTranscripts = { transcripts: [], stats: {} };

        // Initialize sources
        this.sources = {
            congress: new CongressSource(),
            youtube: new YouTubeTranscriptSource(),
            whitehouse: new WhiteHouseSource()
        };
    }

    async initialize() {
        log.info('Initializing transcript collector...');

        // Initialize cache
        await this.cache.initialize();
        await this.cache.clearOldCache();

        // Load speakers
        try {
            const speakersData = await fs.readFile(CONFIG.speakersFile, 'utf-8');
            const parsed = JSON.parse(speakersData);
            this.speakers = parsed.speakers || parsed;
            log.info(`Loaded ${Object.keys(this.speakers).length} speakers`);
        } catch (error) {
            log.warn(`Failed to load speakers: ${error.message}`);
        }

        // Load existing transcripts
        try {
            const transcriptsData = await fs.readFile(CONFIG.transcriptsFile, 'utf-8');
            this.existingTranscripts = JSON.parse(transcriptsData);
            log.info(`Loaded ${this.existingTranscripts.transcripts?.length || 0} existing transcripts`);
        } catch (error) {
            log.warn(`Failed to load existing transcripts: ${error.message}`);
        }

        // Initialize all sources
        await Promise.all([
            this.sources.congress.initialize(),
            this.sources.youtube.initialize(),
            this.sources.whitehouse.initialize()
        ]);

        log.success('Collector initialized');
    }

    // Check if transcript already exists
    isTranscriptDuplicate(newTranscript) {
        const existingIds = new Set(
            this.existingTranscripts.transcripts?.map(t => t.id) || []
        );

        if (existingIds.has(newTranscript.id)) {
            return true;
        }

        // Check by URL
        const existingUrls = new Set(
            this.existingTranscripts.transcripts?.map(t => t.sourceUrl).filter(Boolean) || []
        );

        if (newTranscript.sourceUrl && existingUrls.has(newTranscript.sourceUrl)) {
            return true;
        }

        return false;
    }

    // Collect from Congress.gov
    async collectFromCongress(options = {}) {
        log.info('Collecting from Congress.gov...');
        const transcripts = [];

        try {
            const cacheKey = `congress-daily-${new Date().toISOString().split('T')[0]}`;

            if (await this.cache.isCached('congress', cacheKey)) {
                log.info('Using cached Congress data');
                const cached = await this.cache.getFromCache('congress', cacheKey);
                return cached || [];
            }

            // Fetch Congressional Record
            const records = await this.sources.congress.fetchDailyCongressionalRecord({
                limit: options.limit || CONFIG.maxTranscriptsPerSource
            });

            const crRecords = records.dailyCongressionalRecord || [];
            log.info(`Found ${crRecords.length} Congressional Record entries`);

            for (const record of crRecords) {
                const transcript = this.sources.congress.toTranscriptFormat({
                    id: record.volumeNumber ? `cr-${record.volumeNumber}-${record.issueNumber}` : null,
                    title: record.title || `Congressional Record Vol. ${record.volumeNumber} Issue ${record.issueNumber}`,
                    date: record.publishDate || record.date,
                    url: record.url,
                    text: record.text || '',
                    congress: record.congress,
                    chamber: record.chamber,
                    volumeNumber: record.volumeNumber,
                    issueNumber: record.issueNumber,
                    eventType: 'floor-speech'
                }, this.speakers);

                if (!this.isTranscriptDuplicate(transcript)) {
                    transcripts.push(transcript);
                }
            }

            // Fetch Hearings
            const hearings = await this.sources.congress.fetchHearings({
                limit: 10
            });

            const hearingRecords = hearings.hearings || [];
            log.info(`Found ${hearingRecords.length} hearing entries`);

            for (const hearing of hearingRecords) {
                const transcript = this.sources.congress.toTranscriptFormat({
                    id: hearing.jacketNumber ? `hearing-${hearing.jacketNumber}` : null,
                    title: hearing.title,
                    date: hearing.date,
                    url: hearing.url,
                    text: '',
                    congress: hearing.congress,
                    chamber: hearing.chamber,
                    eventType: 'testimony'
                }, this.speakers);

                if (!this.isTranscriptDuplicate(transcript)) {
                    transcripts.push(transcript);
                }
            }

            // Cache the results
            await this.cache.saveToCache('congress', cacheKey, transcripts);

            log.success(`Collected ${transcripts.length} transcripts from Congress.gov`);
        } catch (error) {
            log.error(`Congress collection failed: ${error.message}`);
        }

        return transcripts;
    }

    // Collect from YouTube
    async collectFromYouTube(options = {}) {
        log.info('Collecting from YouTube...');
        const transcripts = [];

        try {
            // Get speakers to search for
            const speakersToSearch = options.speakers || Object.values(this.speakers)
                .filter(s => s.channels && s.channels.length > 0)
                .slice(0, 5); // Limit to avoid rate limiting

            for (const speaker of speakersToSearch) {
                const speakerName = typeof speaker === 'string' ? speaker : speaker.name;
                const cacheKey = `youtube-${speakerName}-${new Date().toISOString().split('T')[0]}`;

                if (await this.cache.isCached('youtube', cacheKey)) {
                    log.info(`Using cached YouTube data for ${speakerName}`);
                    const cached = await this.cache.getFromCache('youtube', cacheKey);
                    if (cached) {
                        transcripts.push(...cached);
                    }
                    continue;
                }

                try {
                    const videos = await this.sources.youtube.fetchTranscriptsForSpeaker(
                        speakerName,
                        { maxResults: options.maxPerSpeaker || 5 }
                    );

                    const speakerTranscripts = [];

                    for (const video of videos) {
                        const transcript = this.sources.youtube.toTranscriptFormat(
                            video,
                            { transcript: video.transcript },
                            this.speakers
                        );

                        if (!this.isTranscriptDuplicate(transcript)) {
                            speakerTranscripts.push(transcript);
                        }
                    }

                    transcripts.push(...speakerTranscripts);
                    await this.cache.saveToCache('youtube', cacheKey, speakerTranscripts);

                    log.info(`Collected ${speakerTranscripts.length} transcripts for ${speakerName}`);

                    // Delay between speakers
                    await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests));
                } catch (error) {
                    log.warn(`YouTube collection failed for ${speakerName}: ${error.message}`);
                }
            }

            log.success(`Collected ${transcripts.length} transcripts from YouTube`);
        } catch (error) {
            log.error(`YouTube collection failed: ${error.message}`);
        }

        return transcripts;
    }

    // Collect from White House
    async collectFromWhiteHouse(options = {}) {
        log.info('Collecting from White House...');
        const transcripts = [];

        try {
            const cacheKey = `whitehouse-${new Date().toISOString().split('T')[0]}`;

            if (await this.cache.isCached('whitehouse', cacheKey)) {
                log.info('Using cached White House data');
                const cached = await this.cache.getFromCache('whitehouse', cacheKey);
                return cached || [];
            }

            // Fetch listings from all content types
            const listings = await this.sources.whitehouse.fetchAllContentTypes({
                pagesPerType: options.pagesPerType || 1
            });

            log.info(`Found ${listings.length} White House entries`);

            // Fetch full content for top entries
            const limit = options.limit || CONFIG.maxTranscriptsPerSource;
            const fullArticles = await this.sources.whitehouse.fetchArticlesWithContent(
                listings,
                limit
            );

            for (const article of fullArticles) {
                const transcript = this.sources.whitehouse.toTranscriptFormat(
                    article,
                    this.speakers
                );

                if (!this.isTranscriptDuplicate(transcript)) {
                    transcripts.push(transcript);
                }
            }

            // Cache the results
            await this.cache.saveToCache('whitehouse', cacheKey, transcripts);

            log.success(`Collected ${transcripts.length} transcripts from White House`);
        } catch (error) {
            log.error(`White House collection failed: ${error.message}`);
        }

        return transcripts;
    }

    // Calculate statistics
    calculateStats(transcripts) {
        const stats = {
            totalTranscripts: transcripts.length,
            totalQuotes: transcripts.reduce((sum, t) => sum + (t.extractedQuotes?.length || 0), 0),
            bySpeaker: {},
            bySource: {},
            byEventType: {},
            byDate: {}
        };

        for (const transcript of transcripts) {
            // By speaker
            const speakerId = transcript.speakerId || transcript.speaker || 'unknown';
            stats.bySpeaker[speakerId] = (stats.bySpeaker[speakerId] || 0) + 1;

            // By source
            const source = transcript.source || 'unknown';
            stats.bySource[source] = (stats.bySource[source] || 0) + 1;

            // By event type
            const eventType = transcript.eventType || 'unknown';
            stats.byEventType[eventType] = (stats.byEventType[eventType] || 0) + 1;

            // By date (month)
            if (transcript.date) {
                const month = transcript.date.substring(0, 7); // YYYY-MM
                stats.byDate[month] = (stats.byDate[month] || 0) + 1;
            }
        }

        return stats;
    }

    // Save transcripts to file
    async saveTranscripts(newTranscripts) {
        try {
            // Merge with existing transcripts
            const allTranscripts = [
                ...(this.existingTranscripts.transcripts || []),
                ...newTranscripts
            ];

            // Deduplicate by ID
            const seen = new Set();
            const uniqueTranscripts = allTranscripts.filter(t => {
                if (seen.has(t.id)) return false;
                seen.add(t.id);
                return true;
            });

            // Sort by date (newest first)
            uniqueTranscripts.sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB - dateA;
            });

            // Calculate stats
            const stats = this.calculateStats(uniqueTranscripts);

            // Build output
            const output = {
                _schema: this.existingTranscripts._schema || {
                    description: "Political speech transcripts database",
                    version: "1.0.0"
                },
                transcripts: uniqueTranscripts,
                lastUpdated: new Date().toISOString(),
                stats
            };

            // Write to file
            await fs.writeFile(
                CONFIG.transcriptsFile,
                JSON.stringify(output, null, 2)
            );

            log.success(`Saved ${uniqueTranscripts.length} transcripts to ${CONFIG.transcriptsFile}`);

            return output;
        } catch (error) {
            log.error(`Failed to save transcripts: ${error.message}`);
            throw error;
        }
    }

    // Main collection run
    async collect(options = {}) {
        log.info('Starting transcript collection...');

        const allTranscripts = [];

        // Collect from each source (can be disabled via options)
        if (options.congress !== false) {
            const congressTranscripts = await this.collectFromCongress(options.congressOptions || {});
            allTranscripts.push(...congressTranscripts);
        }

        if (options.youtube !== false) {
            const youtubeTranscripts = await this.collectFromYouTube(options.youtubeOptions || {});
            allTranscripts.push(...youtubeTranscripts);
        }

        if (options.whitehouse !== false) {
            const whitehouseTranscripts = await this.collectFromWhiteHouse(options.whitehouseOptions || {});
            allTranscripts.push(...whitehouseTranscripts);
        }

        // Save all transcripts
        const saved = await this.saveTranscripts(allTranscripts);

        log.success(`Collection complete. Total: ${saved.transcripts.length} transcripts`);
        log.info(`Stats: ${JSON.stringify(saved.stats.bySource)}`);

        return saved;
    }
}

// CLI entry point
async function main() {
    const args = process.argv.slice(2);
    const options = {};

    // Parse CLI arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--no-congress':
                options.congress = false;
                break;
            case '--no-youtube':
                options.youtube = false;
                break;
            case '--no-whitehouse':
                options.whitehouse = false;
                break;
            case '--help':
                console.log(`
Transcript Collection Script

Usage: node collectTranscripts.js [options]

Options:
  --no-congress     Skip Congress.gov collection
  --no-youtube      Skip YouTube collection
  --no-whitehouse   Skip White House collection
  --help            Show this help message

Environment Variables:
  CONGRESS_API_KEY   API key for Congress.gov
  YOUTUBE_API_KEY    API key for YouTube Data API
`);
                process.exit(0);
                break;
        }
    }

    try {
        const collector = new TranscriptCollector();
        await collector.initialize();
        await collector.collect(options);
    } catch (error) {
        log.error(`Collection failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Run if called directly
main();

export { TranscriptCollector, CacheManager };
