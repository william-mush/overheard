// Congress.gov API Source - Fetches Congressional Record and Hearings
// API Docs: https://api.congress.gov/

export class CongressSource {
    constructor(apiKey = null) {
        this.name = 'Congress.gov';
        this.baseUrl = 'https://api.congress.gov/v3';
        this.apiKey = apiKey || process.env.CONGRESS_API_KEY;
        this.rateLimitPerHour = 5000;
        this.requestCount = 0;
        this.lastResetTime = Date.now();
    }

    async initialize() {
        if (!this.apiKey) {
            console.warn('Congress.gov: No API key set. Set CONGRESS_API_KEY environment variable.');
        }
        this.requestCount = 0;
        this.lastResetTime = Date.now();
    }

    // Rate limiting check
    checkRateLimit() {
        const now = Date.now();
        const hourInMs = 60 * 60 * 1000;

        // Reset counter if an hour has passed
        if (now - this.lastResetTime >= hourInMs) {
            this.requestCount = 0;
            this.lastResetTime = now;
        }

        if (this.requestCount >= this.rateLimitPerHour) {
            throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }

        this.requestCount++;
    }

    // Build URL with API key
    buildUrl(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        if (this.apiKey) {
            url.searchParams.set('api_key', this.apiKey);
        }
        url.searchParams.set('format', 'json');

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, value);
            }
        }

        return url.toString();
    }

    // Generic fetch with error handling
    async fetchEndpoint(endpoint, params = {}) {
        this.checkRateLimit();

        const url = this.buildUrl(endpoint, params);

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Congress.gov fetch error for ${endpoint}:`, error);
            throw error;
        }
    }

    // Fetch Daily Congressional Record
    async fetchDailyCongressionalRecord(options = {}) {
        const { year, month, day, offset = 0, limit = 20 } = options;

        let endpoint = '/daily-congressional-record';

        // Add date filters if provided
        if (year) {
            endpoint += `/${year}`;
            if (month) {
                endpoint += `/${month.toString().padStart(2, '0')}`;
                if (day) {
                    endpoint += `/${day.toString().padStart(2, '0')}`;
                }
            }
        }

        return await this.fetchEndpoint(endpoint, { offset, limit });
    }

    // Fetch specific Congressional Record issue
    async fetchCongressionalRecordIssue(volumeNumber, issueNumber) {
        const endpoint = `/daily-congressional-record/${volumeNumber}/${issueNumber}`;
        return await this.fetchEndpoint(endpoint);
    }

    // Fetch Hearings
    async fetchHearings(options = {}) {
        const { congress, chamber, offset = 0, limit = 20 } = options;

        let endpoint = '/hearing';

        if (congress) {
            endpoint += `/${congress}`;
            if (chamber) {
                endpoint += `/${chamber.toLowerCase()}`;
            }
        }

        return await this.fetchEndpoint(endpoint, { offset, limit });
    }

    // Fetch specific hearing
    async fetchHearing(congress, chamber, jacketNumber) {
        const endpoint = `/hearing/${congress}/${chamber.toLowerCase()}/${jacketNumber}`;
        return await this.fetchEndpoint(endpoint);
    }

    // Fetch members (useful for speaker identification)
    async fetchMembers(options = {}) {
        const { congress, chamber, offset = 0, limit = 20 } = options;

        let endpoint = '/member';

        if (congress) {
            endpoint += `/congress/${congress}`;
            if (chamber) {
                endpoint += `/${chamber.toLowerCase()}`;
            }
        }

        return await this.fetchEndpoint(endpoint, { offset, limit });
    }

    // Fetch member by bioguideId
    async fetchMemberByBioguide(bioguideId) {
        const endpoint = `/member/${bioguideId}`;
        return await this.fetchEndpoint(endpoint);
    }

    // Extract speaker attribution from Congressional Record text
    extractSpeakerFromText(text) {
        // Common patterns for speaker attribution in Congressional Record
        const patterns = [
            /^(?:Mr\.|Mrs\.|Ms\.|Miss|Dr\.|Representative|Senator)\s+([A-Z][A-Za-z'-]+)/,
            /^The\s+(SPEAKER|PRESIDENT|CHAIR|PRESIDING OFFICER)/i,
            /^([A-Z][A-Z'-]+)\./,  // All caps name followed by period
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    // Parse Congressional Record sections into transcript format
    parseCRSections(sections) {
        const transcripts = [];

        if (!sections || !Array.isArray(sections)) {
            return transcripts;
        }

        for (const section of sections) {
            if (section.text) {
                const speaker = this.extractSpeakerFromText(section.text);
                transcripts.push({
                    speaker: speaker,
                    text: section.text,
                    timestamp: section.startTime || null,
                    section: section.name || null
                });
            }
        }

        return transcripts;
    }

    // Convert to standard transcript format
    toTranscriptFormat(record, speakerMap = {}) {
        const speakerId = this.findSpeakerId(record.speaker, speakerMap);

        return {
            id: record.id || `congress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            speaker: record.speaker || 'Unknown',
            speakerId: speakerId,
            role: record.role || null,
            date: record.date || new Date().toISOString().split('T')[0],
            source: 'Congress.gov',
            sourceUrl: record.url || null,
            eventType: record.eventType || 'floor-speech',
            title: record.title || null,
            fullText: record.text || '',
            extractedQuotes: [],
            metadata: {
                congress: record.congress || null,
                chamber: record.chamber || null,
                volumeNumber: record.volumeNumber || null,
                issueNumber: record.issueNumber || null
            }
        };
    }

    // Find speaker ID from speakers.json mapping
    findSpeakerId(speakerName, speakerMap) {
        if (!speakerName || !speakerMap) return null;

        const normalizedName = speakerName.toLowerCase().replace(/[^a-z\s]/g, '');

        for (const [id, speaker] of Object.entries(speakerMap)) {
            const mapName = speaker.name.toLowerCase().replace(/[^a-z\s]/g, '');
            if (mapName.includes(normalizedName) || normalizedName.includes(mapName)) {
                return id;
            }
        }

        return null;
    }

    // Paginated fetch helper
    async fetchAllPages(fetchFn, options = {}, maxPages = 10) {
        const allItems = [];
        let offset = 0;
        const limit = options.limit || 20;
        let page = 0;

        while (page < maxPages) {
            try {
                const response = await fetchFn({ ...options, offset, limit });
                const items = response.dailyCongressionalRecord ||
                             response.hearings ||
                             response.members ||
                             [];

                if (!items || items.length === 0) {
                    break;
                }

                allItems.push(...items);

                // Check if there are more pages
                const pagination = response.pagination;
                if (!pagination || offset + limit >= pagination.count) {
                    break;
                }

                offset += limit;
                page++;
            } catch (error) {
                console.error('Pagination error:', error);
                break;
            }
        }

        return allItems;
    }

    // Main fetch method for integration with dataSourceManager
    async fetch(options = {}) {
        const items = [];

        try {
            // Fetch recent Congressional Record
            const crResponse = await this.fetchDailyCongressionalRecord({
                limit: options.limit || 10
            });

            const records = crResponse.dailyCongressionalRecord || [];

            for (const record of records) {
                items.push({
                    source: this.name,
                    content: record.title || record.issueNumber || 'Congressional Record Entry',
                    timestamp: Date.now(),
                    url: record.url || '#',
                    type: 'congressional-record',
                    metadata: record
                });
            }
        } catch (error) {
            console.error('Congress.gov fetch error:', error);
        }

        return items;
    }
}

export default CongressSource;
