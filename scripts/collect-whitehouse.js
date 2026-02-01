// Collect White House briefings and statements from RSS feeds
// Sources: whitehouse.gov RSS feeds

import { config } from 'dotenv';
config({ path: '.env.local' });

const { neon } = await import('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

// White House RSS feeds
const WH_FEEDS = {
    'briefings': 'https://www.whitehouse.gov/briefings-statements/feed/',
    'remarks': 'https://www.whitehouse.gov/remarks/feed/',
    'presidential-actions': 'https://www.whitehouse.gov/presidential-actions/feed/'
};

// Category detection
const CATEGORY_KEYWORDS = {
    'immigration': ['border', 'immigrant', 'migrant', 'deportation', 'alien', 'invasion', 'ice', 'dhs'],
    'election': ['vote', 'voter', 'election', 'democracy'],
    'economy': ['economy', 'jobs', 'inflation', 'tax', 'trade', 'tariff', 'business'],
    'military': ['military', 'defense', 'troops', 'veteran', 'security', 'national security'],
    'foreign-policy': ['china', 'russia', 'ukraine', 'nato', 'foreign', 'international']
};

const RHETORIC_KEYWORDS = {
    'absolutist': ['greatest', 'best', 'worst', 'never before', 'historic', 'unprecedented'],
    'victimhood': ['witch hunt', 'unfair', 'persecution', 'attack on'],
    'dehumanizing': ['invasion', 'infestation', 'animal', 'criminal alien']
};

function detectCategories(text) {
    const lowerText = text.toLowerCase();
    return Object.entries(CATEGORY_KEYWORDS)
        .filter(([_, keywords]) => keywords.some(kw => lowerText.includes(kw)))
        .map(([category]) => category);
}

function detectRhetoric(text) {
    const lowerText = text.toLowerCase();
    return Object.entries(RHETORIC_KEYWORDS)
        .filter(([_, keywords]) => keywords.some(kw => lowerText.includes(kw)))
        .map(([type]) => type);
}

// Simple XML parser for RSS
function parseRSS(xml) {
    const items = [];
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    for (const itemXml of itemMatches) {
        const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
            || itemXml.match(/<title>(.*?)<\/title>/)?.[1]
            || '';

        const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';

        const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

        const description = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1]
            || itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1]
            || '';

        const content = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1]
            || '';

        items.push({
            title: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
            link: link.trim(),
            pubDate: pubDate.trim(),
            description: description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
            content: content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        });
    }

    return items;
}

function extractQuotesFromContent(item, feedType) {
    const quotes = [];
    const text = item.content || item.description;

    if (!text || text.length < 100) return quotes;

    // Split into paragraphs
    const paragraphs = text.split(/\n\n|\r\n\r\n/).filter(p => p.trim().length > 100);

    for (const para of paragraphs.slice(0, 3)) { // Take up to 3 notable paragraphs
        const cleanText = para.trim().substring(0, 1000);
        if (cleanText.length < 100) continue;

        const categories = detectCategories(cleanText);
        const rhetoric = detectRhetoric(cleanText);

        // Only include notable content
        if (categories.length > 0 || rhetoric.length > 0 || cleanText.length > 300) {
            // Determine speaker based on content/title
            let speakerId = 'donald-trump';
            const lowerTitle = item.title.toLowerCase();

            if (lowerTitle.includes('miller') || text.toLowerCase().includes('stephen miller')) {
                speakerId = 'stephen-miller';
            } else if (lowerTitle.includes('vance') || text.toLowerCase().includes('vice president vance')) {
                speakerId = 'jd-vance';
            } else if (lowerTitle.includes('secretary noem') || lowerTitle.includes('dhs')) {
                speakerId = 'kristi-noem';
            } else if (lowerTitle.includes('secretary rubio') || lowerTitle.includes('state department')) {
                speakerId = 'marco-rubio';
            }

            const date = item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : null;

            quotes.push({
                id: `wh-${feedType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                speakerId,
                text: cleanText,
                date,
                source: `White House - ${item.title.substring(0, 100)}`,
                sourceUrl: item.link,
                eventType: feedType,
                categories,
                rhetoric
            });
        }
    }

    return quotes;
}

async function fetchFeed(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; OverheardBot/1.0)'
            }
        });

        if (!response.ok) {
            console.error(`  Failed to fetch ${url}: ${response.status}`);
            return [];
        }

        const xml = await response.text();
        return parseRSS(xml);
    } catch (error) {
        console.error(`  Error fetching ${url}: ${error.message}`);
        return [];
    }
}

async function addQuotesToDatabase(quotes) {
    let added = 0;
    let errors = 0;

    for (const quote of quotes) {
        try {
            await sql`
                INSERT INTO quotes (id, speaker_id, text, date, source, source_url, event_type, categories, rhetoric)
                VALUES (
                    ${quote.id},
                    ${quote.speakerId},
                    ${quote.text},
                    ${quote.date || null},
                    ${quote.source},
                    ${quote.sourceUrl || null},
                    ${quote.eventType},
                    ${quote.categories},
                    ${quote.rhetoric}
                )
                ON CONFLICT (id) DO NOTHING
            `;
            added++;
        } catch (err) {
            errors++;
        }
    }

    return { added, errors };
}

async function main() {
    console.log('='.repeat(50));
    console.log('White House RSS Feed Collection');
    console.log('='.repeat(50));

    let totalQuotes = 0;
    let totalAdded = 0;

    for (const [feedType, feedUrl] of Object.entries(WH_FEEDS)) {
        console.log(`\nFetching ${feedType} feed...`);

        const items = await fetchFeed(feedUrl);
        console.log(`  Found ${items.length} items`);

        if (items.length === 0) continue;

        const allQuotes = [];

        for (const item of items) {
            const quotes = extractQuotesFromContent(item, feedType);
            allQuotes.push(...quotes);
        }

        console.log(`  Extracted ${allQuotes.length} notable quotes`);
        totalQuotes += allQuotes.length;

        if (allQuotes.length > 0) {
            const result = await addQuotesToDatabase(allQuotes);
            console.log(`  Added ${result.added} to database`);
            totalAdded += result.added;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Collection Complete!');
    console.log('='.repeat(50));
    console.log(`Total quotes extracted: ${totalQuotes}`);
    console.log(`Total added to database: ${totalAdded}`);

    // Show updated stats
    const stats = await sql`
        SELECT
            (SELECT COUNT(*) FROM speakers) as speakers,
            (SELECT COUNT(*) FROM quotes) as quotes,
            (SELECT COUNT(*) FROM contradictions) as contradictions
    `;
    console.log(`\nDatabase stats:`);
    console.log(`  Speakers: ${stats[0].speakers}`);
    console.log(`  Quotes: ${stats[0].quotes}`);
    console.log(`  Contradictions: ${stats[0].contradictions}`);
}

main().catch(console.error);
