// Political Speech Source - Loads transcripts and speakers data

export class PoliticalSpeechSource {
    constructor() {
        this.name = 'Political Speech';
        this.transcripts = null;
        this.speakers = null;
        this.categories = null;
        this.quotes = [];
    }

    async initialize() {
        try {
            const [transcriptsRes, speakersRes, categoriesRes] = await Promise.all([
                fetch('/data/transcripts.json'),
                fetch('/data/speakers.json'),
                fetch('/data/categories.json')
            ]);

            this.transcripts = await transcriptsRes.json();
            this.speakers = (await speakersRes.json()).speakers;
            this.categories = await categoriesRes.json();

            // Build quotes array from transcripts
            this.buildQuotesArray();

            console.log(`Political Speech Source initialized: ${this.quotes.length} quotes available`);
        } catch (error) {
            console.error('Failed to initialize Political Speech Source:', error);
        }
    }

    buildQuotesArray() {
        this.quotes = [];

        if (!this.transcripts || !this.transcripts.transcripts) {
            return;
        }

        for (const transcript of this.transcripts.transcripts) {
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
                        title: transcript.title,
                        categories: quote.categories || [],
                        rhetoric: quote.rhetoric || [],
                        factCheck: quote.factCheck || null,
                        contradicts: quote.contradicts || null
                    });
                }
            }
        }
    }

    async fetch() {
        // Return a few random quotes
        return this.getRandomQuotes(3);
    }

    getRandomQuotes(count = 1) {
        if (this.quotes.length === 0) {
            return this.getMockQuotes(count);
        }

        const items = [];
        const shuffled = [...this.quotes].sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            const quote = shuffled[i];
            items.push(this.formatQuote(quote));
        }

        return items;
    }

    formatQuote(quote) {
        return {
            source: quote.speaker,
            content: quote.content,
            timestamp: Date.now(),
            url: quote.sourceUrl || '#',
            // Extra fields for political speech flows
            speaker: quote.speaker,
            speakerId: quote.speakerId,
            date: quote.date,
            eventType: quote.eventType,
            title: quote.title,
            categories: quote.categories,
            rhetoric: quote.rhetoric,
            factCheck: quote.factCheck,
            contradicts: quote.contradicts,
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

        // Return random selection of specified count
        const shuffled = [...filtered].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count).map(q => this.formatQuote(q));
    }

    getQuotesBySpeakerSequential(speakerId) {
        // Track which quotes have been shown per speaker
        if (!this.shownQuotes) {
            this.shownQuotes = {};
        }
        if (!this.shownQuotes[speakerId]) {
            this.shownQuotes[speakerId] = new Set();
        }

        const filtered = this.quotes.filter(q => q.speakerId === speakerId);

        // Find a quote we haven't shown yet
        for (const quote of filtered) {
            if (!this.shownQuotes[speakerId].has(quote.id)) {
                this.shownQuotes[speakerId].add(quote.id);
                return [this.formatQuote(quote)];
            }
        }

        // If all shown, reset and start over
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
            .filter(q => q.factCheck && q.factCheck.rating)
            .map(q => this.formatQuote(q));
    }

    getContradictions() {
        // Return contradictions from the dedicated contradictions array
        if (!this.transcripts || !this.transcripts.contradictions) {
            return [];
        }
        return this.transcripts.contradictions;
    }

    getRandomContradiction() {
        const contradictions = this.getContradictions();
        if (contradictions.length === 0) return null;

        const index = Math.floor(Math.random() * contradictions.length);
        const contradiction = contradictions[index];

        // Add speaker color
        return {
            ...contradiction,
            speakerColor: this.getSpeakerColor(contradiction.speakerId)
        };
    }

    getContradictionsBySpeaker(speakerId) {
        const contradictions = this.getContradictions();
        return contradictions.filter(c => c.speakerId === speakerId).map(c => ({
            ...c,
            speakerColor: this.getSpeakerColor(c.speakerId)
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

    getMockQuotes(count) {
        const mockQuotes = [
            {
                speaker: 'Sample Speaker',
                speakerId: 'sample',
                content: 'This is sample political content for demonstration purposes.',
                date: '2025-01-15',
                source: 'Demo',
                categories: ['media'],
                rhetoric: [],
                factCheck: { rating: 'unverified' }
            },
            {
                speaker: 'Sample Speaker',
                speakerId: 'sample',
                content: 'Another sample quote to show how the visualization works.',
                date: '2025-01-16',
                source: 'Demo',
                categories: ['economy'],
                rhetoric: [],
                factCheck: { rating: 'unverified' }
            }
        ];

        const items = [];
        for (let i = 0; i < Math.min(count, mockQuotes.length); i++) {
            const quote = mockQuotes[i];
            items.push({
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
            });
        }

        return items;
    }
}
