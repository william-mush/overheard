// White House Source - Fetches briefings, speeches, and statements
// from whitehouse.gov/briefing-room/

export class WhiteHouseSource {
    constructor() {
        this.name = 'White House';
        this.baseUrl = 'https://www.whitehouse.gov';
        this.briefingRoomUrl = `${this.baseUrl}/briefing-room`;

        // Content types available in the briefing room
        this.contentTypes = [
            'speeches-remarks',
            'press-briefings',
            'statements-releases',
            'presidential-actions'
        ];
    }

    async initialize() {
        // No initialization needed
    }

    // Fetch and parse briefing room page
    async fetchBriefingRoom(contentType = null, page = 1) {
        const items = [];

        try {
            let url = this.briefingRoomUrl;
            if (contentType) {
                url += `/${contentType}`;
            }
            if (page > 1) {
                url += `/page/${page}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`White House fetch error: ${response.status}`);
            }

            const html = await response.text();
            const parsed = this.parseListingPage(html, contentType);
            items.push(...parsed);
        } catch (error) {
            console.error('White House briefing room fetch error:', error);
        }

        return items;
    }

    // Parse the listing page to extract article links and metadata
    parseListingPage(html, contentType) {
        const items = [];

        // Extract article entries using regex patterns
        // Pattern matches article entries in White House site structure
        const articlePattern = /<article[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<time[^>]*datetime="([^"]+)"[^>]*>/gi;

        let match;
        while ((match = articlePattern.exec(html)) !== null) {
            const url = match[1];
            const title = this.stripHtml(match[2]).trim();
            const date = match[3];

            items.push({
                url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
                title,
                date,
                contentType: contentType || this.determineContentType(url)
            });
        }

        // Alternative pattern for different page structures
        if (items.length === 0) {
            const altPattern = /<a[^>]*class="[^"]*news-item[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<time[^>]*>([^<]+)<\/time>/gi;

            while ((match = altPattern.exec(html)) !== null) {
                const url = match[1];
                const title = this.stripHtml(match[2]).trim();
                const date = match[3].trim();

                items.push({
                    url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
                    title,
                    date,
                    contentType: contentType || this.determineContentType(url)
                });
            }
        }

        // Third pattern for article cards
        if (items.length === 0) {
            const cardPattern = /href="(\/briefing-room\/[^"]+)"[^>]*>[\s\S]*?(?:<h[23][^>]*>|<span[^>]*>)([\s\S]*?)(?:<\/h[23]>|<\/span>)/gi;

            while ((match = cardPattern.exec(html)) !== null) {
                const url = match[1];
                const title = this.stripHtml(match[2]).trim();

                if (title && title.length > 5) {
                    items.push({
                        url: `${this.baseUrl}${url}`,
                        title,
                        date: null,
                        contentType: contentType || this.determineContentType(url)
                    });
                }
            }
        }

        return items;
    }

    // Strip HTML tags
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // Determine content type from URL
    determineContentType(url) {
        if (url.includes('speeches-remarks')) return 'speech';
        if (url.includes('press-briefings')) return 'briefing';
        if (url.includes('statements-releases')) return 'statement';
        if (url.includes('presidential-actions')) return 'action';
        return 'unknown';
    }

    // Fetch and parse individual article page
    async fetchArticle(url) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Article fetch error: ${response.status}`);
            }

            const html = await response.text();
            return this.parseArticlePage(html, url);
        } catch (error) {
            console.error('White House article fetch error:', error);
            return null;
        }
    }

    // Parse article page to extract full text
    parseArticlePage(html, url) {
        const article = {
            url,
            title: null,
            date: null,
            speaker: null,
            location: null,
            fullText: null,
            contentType: this.determineContentType(url)
        };

        // Extract title
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (titleMatch) {
            article.title = this.stripHtml(titleMatch[1]);
        }

        // Extract date
        const dateMatch = html.match(/<time[^>]*datetime="([^"]+)"/i) ||
                         html.match(/<time[^>]*>([^<]+)<\/time>/i);
        if (dateMatch) {
            article.date = dateMatch[1];
        }

        // Extract speaker from metadata or title
        article.speaker = this.extractSpeaker(html, article.title);

        // Extract location
        const locationMatch = html.match(/(?:location|venue)[:\s]*([^<\n]+)/i);
        if (locationMatch) {
            article.location = locationMatch[1].trim();
        }

        // Extract main content
        const contentPatterns = [
            /<article[^>]*>([\s\S]*?)<\/article>/i,
            /<div[^>]*class="[^"]*body-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<main[^>]*>([\s\S]*?)<\/main>/i
        ];

        for (const pattern of contentPatterns) {
            const match = html.match(pattern);
            if (match) {
                article.fullText = this.cleanArticleText(match[1]);
                if (article.fullText && article.fullText.length > 100) {
                    break;
                }
            }
        }

        return article;
    }

    // Extract speaker from article
    extractSpeaker(html, title) {
        // Look for speaker in metadata
        const speakerPatterns = [
            /(?:remarks?\s+by|statement\s+by|speech\s+by)\s+(?:the\s+)?(?:president|vice\s+president)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
            /(?:president|vice\s+president)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
            /(?:press\s+secretary)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
        ];

        // Check title first
        if (title) {
            for (const pattern of speakerPatterns) {
                const match = title.match(pattern);
                if (match) {
                    return match[1];
                }
            }
        }

        // Check HTML content
        for (const pattern of speakerPatterns) {
            const match = html.match(pattern);
            if (match) {
                return match[1];
            }
        }

        // Default speakers based on content type
        if (title) {
            if (title.toLowerCase().includes('president')) {
                return 'President';
            }
            if (title.toLowerCase().includes('vice president')) {
                return 'Vice President';
            }
            if (title.toLowerCase().includes('press secretary')) {
                return 'Press Secretary';
            }
        }

        return null;
    }

    // Clean article text
    cleanArticleText(html) {
        // Remove script and style tags
        let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

        // Remove navigation and footer elements
        text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
        text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
        text = text.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');

        // Convert paragraphs to newlines
        text = text.replace(/<\/p>/gi, '\n\n');
        text = text.replace(/<br\s*\/?>/gi, '\n');

        // Strip remaining HTML tags
        text = this.stripHtml(text);

        // Clean up whitespace
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.replace(/[ \t]+/g, ' ');
        text = text.trim();

        return text;
    }

    // Convert to standard transcript format
    toTranscriptFormat(article, speakerMap = {}) {
        const speakerId = this.findSpeakerId(article.speaker, speakerMap);

        return {
            id: `whitehouse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            speaker: article.speaker || 'Unknown',
            speakerId: speakerId,
            role: this.determineRole(article.speaker),
            date: article.date ? article.date.split('T')[0] : new Date().toISOString().split('T')[0],
            source: 'White House',
            sourceUrl: article.url,
            eventType: this.mapContentTypeToEventType(article.contentType),
            title: article.title,
            fullText: article.fullText || '',
            extractedQuotes: [],
            metadata: {
                location: article.location || null,
                contentType: article.contentType
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

    // Determine role from speaker name
    determineRole(speaker) {
        if (!speaker) return null;

        const lowerSpeaker = speaker.toLowerCase();

        if (lowerSpeaker.includes('president') && !lowerSpeaker.includes('vice')) {
            return 'President';
        }
        if (lowerSpeaker.includes('vice president')) {
            return 'Vice President';
        }
        if (lowerSpeaker.includes('press secretary')) {
            return 'Press Secretary';
        }
        if (lowerSpeaker.includes('secretary')) {
            return 'Cabinet Secretary';
        }

        return null;
    }

    // Map content type to event type
    mapContentTypeToEventType(contentType) {
        const mapping = {
            'speech': 'speech',
            'briefing': 'briefing',
            'statement': 'statement',
            'action': 'executive-action',
            'speeches-remarks': 'speech',
            'press-briefings': 'briefing',
            'statements-releases': 'statement',
            'presidential-actions': 'executive-action'
        };

        return mapping[contentType] || 'speech';
    }

    // Fetch all content types
    async fetchAllContentTypes(options = {}) {
        const { pagesPerType = 1 } = options;
        const allItems = [];

        for (const contentType of this.contentTypes) {
            for (let page = 1; page <= pagesPerType; page++) {
                try {
                    const items = await this.fetchBriefingRoom(contentType, page);
                    allItems.push(...items);

                    // Small delay between requests
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error(`Error fetching ${contentType} page ${page}:`, error);
                }
            }
        }

        return allItems;
    }

    // Fetch full content for multiple articles
    async fetchArticlesWithContent(articleList, limit = 10) {
        const results = [];
        const toFetch = articleList.slice(0, limit);

        for (const article of toFetch) {
            try {
                const fullArticle = await this.fetchArticle(article.url);
                if (fullArticle) {
                    results.push({
                        ...article,
                        ...fullArticle
                    });
                }

                // Delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error fetching article ${article.url}:`, error);
            }
        }

        return results;
    }

    // Main fetch method for integration with dataSourceManager
    async fetch(options = {}) {
        const items = [];

        try {
            // Fetch latest from briefing room
            const listings = await this.fetchBriefingRoom(null, 1);

            for (const listing of listings.slice(0, 5)) {
                items.push({
                    source: this.name,
                    content: listing.title,
                    timestamp: Date.now(),
                    url: listing.url,
                    type: listing.contentType,
                    date: listing.date
                });
            }
        } catch (error) {
            console.error('White House fetch error:', error);
        }

        return items;
    }
}

export default WhiteHouseSource;
