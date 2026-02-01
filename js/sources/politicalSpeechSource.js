// Political Speech Source - Loads data from Neon database via API

export class PoliticalSpeechSource {
    constructor() {
        this.name = 'Political Speech';
        this.speakers = null;
        this.categories = null;
        this.contradictions = [];
        this.quotes = [];
        this.apiBase = '/api/data';
    }

    async initialize() {
        try {
            // Fetch all data from API
            const response = await fetch(`${this.apiBase}?type=all`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data || !data.speakers) {
                throw new Error('Invalid API response: missing speakers data');
            }

            this.speakers = data.speakers;
            this.categories = data.categories || {};
            this.contradictions = data.contradictions || [];

            // Fetch quotes separately
            const quotesResponse = await fetch(`${this.apiBase}?type=quotes&limit=200`);
            if (quotesResponse.ok) {
                const quotesData = await quotesResponse.json();
                this.quotes = quotesData.map(q => ({
                    id: q.id,
                    content: q.text,
                    speaker: q.speaker,
                    speakerId: q.speakerId,
                    speakerColor: q.speakerColor,
                    date: q.date,
                    source: q.source,
                    sourceUrl: q.sourceUrl,
                    eventType: q.eventType,
                    categories: q.categories || [],
                    rhetoric: q.rhetoric || [],
                    factCheck: q.factCheck,
                    context: q.context
                }));
            }

            console.log(`Political Speech Source initialized from database:`);
            console.log(`  - ${Object.keys(this.speakers || {}).length} speakers`);
            console.log(`  - ${this.quotes.length} quotes`);
            console.log(`  - ${this.contradictions.length} contradictions`);
        } catch (error) {
            console.error('Failed to initialize Political Speech Source from API:', error);
            // Fallback to static JSON files
            await this.initializeFromStaticFiles();
        }
    }

    // Fallback to static files if API fails
    async initializeFromStaticFiles() {
        try {
            console.log('Falling back to static JSON files...');
            const [transcriptsRes, speakersRes, categoriesRes] = await Promise.all([
                fetch('/data/transcripts.json'),
                fetch('/data/speakers.json'),
                fetch('/data/categories.json')
            ]);

            const transcripts = await transcriptsRes.json();
            this.speakers = (await speakersRes.json()).speakers;
            this.categories = await categoriesRes.json();
            this.contradictions = transcripts.contradictions || [];

            // Build quotes array from transcripts
            this.quotes = [];
            for (const transcript of transcripts.transcripts || []) {
                if (transcript.extractedQuotes) {
                    for (const quote of transcript.extractedQuotes) {
                        this.quotes.push({
                            id: quote.id,
                            content: quote.text,
                            speaker: transcript.speaker,
                            speakerId: transcript.speakerId,
                            date: transcript.date,
                            source: transcript.source,
                            sourceUrl: transcript.sourceUrl,
                            eventType: transcript.eventType,
                            categories: quote.categories || [],
                            rhetoric: quote.rhetoric || [],
                            factCheck: quote.factCheck || null
                        });
                    }
                }
            }

            console.log(`Fallback complete: ${this.quotes.length} quotes loaded from static files`);
        } catch (error) {
            console.error('Failed to load from static files:', error);
        }
    }

    async fetch() {
        return this.getRandomQuotes(3);
    }

    getRandomQuotes(count = 1, filters = null) {
        if (this.quotes.length === 0) {
            return this.getMockQuotes(count);
        }

        // Apply filters if provided
        let filtered = this.quotes;
        if (filters) {
            filtered = this.applyFilters(this.quotes, filters);
        }

        if (filtered.length === 0) {
            return this.getMockQuotes(count);
        }

        const items = [];
        const shuffled = [...filtered].sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            items.push(this.formatQuote(shuffled[i]));
        }

        return items;
    }

    // Apply content filters to quotes
    applyFilters(quotes, filters) {
        return quotes.filter(quote => {
            // Quote ID filter
            if (filters.quoteIds && filters.quoteIds.size > 0) {
                if (!filters.quoteIds.has(quote.id)) return false;
            }

            // Speaker filter
            if (filters.speakers && filters.speakers.length > 0) {
                if (!filters.speakers.includes(quote.speakerId)) return false;
            }

            // Category filter
            if (filters.categories && filters.categories.length > 0) {
                const quoteCategories = quote.categories || [];
                if (!filters.categories.some(c => quoteCategories.includes(c))) return false;
            }

            // Rhetoric filter
            if (filters.rhetoric && filters.rhetoric.length > 0) {
                const quoteRhetoric = quote.rhetoric || [];
                if (!filters.rhetoric.some(r => quoteRhetoric.includes(r))) return false;
            }

            // Fact-check filter
            if (filters.factcheck && filters.factcheck.length > 0) {
                const rating = (quote.factCheck?.rating || '').toLowerCase();
                if (!filters.factcheck.some(f => rating.includes(f.replace('-', ' ')))) return false;
            }

            // Search filter
            if (filters.search && filters.search.length > 0) {
                const text = (quote.content || '').toLowerCase();
                if (!text.includes(filters.search.toLowerCase())) return false;
            }

            // Date range filter
            if (filters.dateFrom && quote.date) {
                if (quote.date < filters.dateFrom) return false;
            }
            if (filters.dateTo && quote.date) {
                if (quote.date > filters.dateTo) return false;
            }

            return true;
        });
    }

    // Get quotes with current active filters
    getFilteredQuotes(count = 1) {
        // Access global filter variables if they exist
        const filters = {};
        if (typeof activeQuoteFilter !== 'undefined' && activeQuoteFilter) {
            filters.quoteIds = activeQuoteFilter;
        }
        if (typeof activeCategories !== 'undefined' && activeCategories.length > 0) {
            filters.categories = activeCategories;
        }
        if (typeof activeRhetoric !== 'undefined' && activeRhetoric.length > 0) {
            filters.rhetoric = activeRhetoric;
        }
        if (typeof activeFactcheck !== 'undefined' && activeFactcheck.length > 0) {
            filters.factcheck = activeFactcheck;
        }

        return this.getRandomQuotes(count, Object.keys(filters).length > 0 ? filters : null);
    }

    formatQuote(quote) {
        return {
            source: quote.speaker,
            content: quote.content,
            timestamp: Date.now(),
            url: quote.sourceUrl || '#',
            speaker: quote.speaker,
            speakerId: quote.speakerId,
            speakerColor: quote.speakerColor || this.getSpeakerColor(quote.speakerId),
            date: quote.date,
            eventType: quote.eventType,
            categories: quote.categories,
            rhetoric: quote.rhetoric,
            factCheck: quote.factCheck,
            context: quote.context,
            isPolitical: true
        };
    }

    getQuotesByCategory(category) {
        return this.quotes
            .filter(q => q.categories.includes(category))
            .map(q => this.formatQuote(q));
    }

    getQuotesBySpeaker(speakerId, count = null) {
        const filtered = this.quotes.filter(q => q.speakerId === speakerId);

        if (count === null) {
            return filtered.map(q => this.formatQuote(q));
        }

        const shuffled = [...filtered].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count).map(q => this.formatQuote(q));
    }

    getQuotesBySpeakerSequential(speakerId) {
        if (!this.shownQuotes) {
            this.shownQuotes = {};
        }
        if (!this.shownQuotes[speakerId]) {
            this.shownQuotes[speakerId] = new Set();
        }

        const filtered = this.quotes.filter(q => q.speakerId === speakerId);

        for (const quote of filtered) {
            if (!this.shownQuotes[speakerId].has(quote.id)) {
                this.shownQuotes[speakerId].add(quote.id);
                return [this.formatQuote(quote)];
            }
        }

        this.shownQuotes[speakerId].clear();
        if (filtered.length > 0) {
            const quote = filtered[0];
            this.shownQuotes[speakerId].add(quote.id);
            return [this.formatQuote(quote)];
        }

        return [];
    }

    resetShownQuotes(speakerId = null) {
        if (speakerId) {
            if (this.shownQuotes) {
                this.shownQuotes[speakerId] = new Set();
            }
        } else {
            this.shownQuotes = {};
        }
    }

    getFactCheckedQuotes() {
        return this.quotes
            .filter(q => q.factCheck && q.factCheck.rating && q.factCheck.rating.toLowerCase() !== 'unverified')
            .map(q => this.formatQuote(q));
    }

    getContradictions() {
        return this.contradictions;
    }

    getRandomContradiction() {
        if (this.contradictions.length === 0) return null;

        const index = Math.floor(Math.random() * this.contradictions.length);
        const contradiction = this.contradictions[index];

        return {
            ...contradiction,
            speakerColor: contradiction.speakerColor || this.getSpeakerColor(contradiction.speakerId)
        };
    }

    getContradictionsBySpeaker(speakerId) {
        return this.contradictions
            .filter(c => c.speakerId === speakerId)
            .map(c => ({
                ...c,
                speakerColor: c.speakerColor || this.getSpeakerColor(c.speakerId)
            }));
    }

    getQuoteById(id) {
        const quote = this.quotes.find(q => q.id === id);
        return quote ? this.formatQuote(quote) : null;
    }

    getSpeaker(speakerId) {
        return this.speakers ? this.speakers[speakerId] : null;
    }

    getSpeakerColor(speakerId) {
        const speaker = this.getSpeaker(speakerId);
        return speaker ? speaker.color : '#ffffff';
    }

    getAllSpeakers() {
        return this.speakers ? Object.entries(this.speakers).map(([id, data]) => ({
            id,
            ...data
        })) : [];
    }

    getTopics() {
        return this.categories ? this.categories.topics : {};
    }

    getRhetoricTypes() {
        return this.categories ? this.categories.rhetoric : {};
    }

    getFactCheckRatings() {
        return this.categories ? this.categories.factCheckRatings : {};
    }

    // Async method to fetch fresh data from API
    async refreshFromDatabase() {
        try {
            const response = await fetch(`${this.apiBase}?type=all`);
            if (response.ok) {
                const data = await response.json();
                this.speakers = data.speakers;
                this.categories = data.categories;
                this.contradictions = data.contradictions || [];
                console.log('Data refreshed from database');
            }
        } catch (error) {
            console.error('Failed to refresh from database:', error);
        }
    }

    getMockQuotes(count) {
        const mockQuotes = [
            {
                speaker: 'Loading...',
                speakerId: 'loading',
                content: 'Connecting to database...',
                date: new Date().toISOString().split('T')[0],
                source: 'System',
                categories: [],
                rhetoric: [],
                factCheck: null
            }
        ];

        return mockQuotes.slice(0, count).map(quote => ({
            source: quote.speaker,
            content: quote.content,
            timestamp: Date.now(),
            url: '#',
            speaker: quote.speaker,
            speakerId: quote.speakerId,
            date: quote.date,
            categories: quote.categories,
            rhetoric: quote.rhetoric,
            factCheck: quote.factCheck,
            isPolitical: true
        }));
    }
}
