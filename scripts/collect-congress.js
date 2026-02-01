// Collect Congressional speeches from GovInfo API
// Source: https://api.govinfo.gov

import { config } from 'dotenv';
config({ path: '.env.local' });

const { neon } = await import('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

// GovInfo API (free, no key needed for basic access, but key increases limits)
const GOVINFO_API_KEY = process.env.GOVINFO_API_KEY || 'DEMO_KEY';
const GOVINFO_BASE = 'https://api.govinfo.gov';

// Target members with their bioguide IDs
const TARGET_MEMBERS = {
    'marjorie-taylor-greene': { name: 'Marjorie Taylor Greene', searchName: 'greene', bioguideId: 'G000596' },
    'matt-gaetz': { name: 'Matt Gaetz', searchName: 'gaetz', bioguideId: 'G000578' },
    'lauren-boebert': { name: 'Lauren Boebert', searchName: 'boebert', bioguideId: 'B000825' },
    'jim-jordan': { name: 'Jim Jordan', searchName: 'jordan', bioguideId: 'J000289' }
};

// Categories to detect
const CATEGORY_KEYWORDS = {
    'immigration': ['border', 'immigrant', 'migrant', 'deportation', 'alien', 'invasion', 'ice', 'wall', 'asylum'],
    'election': ['vote', 'voter', 'election', 'ballot', 'fraud', 'rigged', 'stolen', 'integrity'],
    'media': ['fake news', 'media', 'press', 'journalist', 'censor', 'big tech'],
    'economy': ['economy', 'jobs', 'inflation', 'tax', 'spending', 'debt', 'budget'],
    'opponents': ['democrat', 'biden', 'harris', 'pelosi', 'schumer', 'radical', 'socialist', 'left']
};

const RHETORIC_KEYWORDS = {
    'dehumanizing': ['animal', 'vermin', 'invasion', 'infestation', 'plague'],
    'violent': ['fight', 'destroy', 'eliminate', 'war on', 'attack'],
    'absolutist': ['always', 'never', 'everyone knows', 'no one', 'greatest', 'worst'],
    'victimhood': ['witch hunt', 'persecution', 'unfair', 'attack on'],
    'conspiracy': ['deep state', 'cover up', 'they don\'t want you to know']
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

async function searchMemberSpeeches(memberId, memberInfo, limit = 50) {
    console.log(`\nSearching for ${memberInfo.name} speeches...`);

    const searchUrl = `${GOVINFO_BASE}/search`;

    try {
        const response = await fetch(searchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': GOVINFO_API_KEY
            },
            body: JSON.stringify({
                query: `collection:crec member:${memberInfo.searchName}`,
                pageSize: limit,
                offsetMark: '*',
                sorts: [{ field: 'publishdate', sortOrder: 'DESC' }]
            })
        });

        if (!response.ok) {
            console.error(`  API error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        console.log(`  Found ${data.count || 0} total results, processing ${data.results?.length || 0}...`);

        return data.results || [];
    } catch (error) {
        console.error(`  Error searching: ${error.message}`);
        return [];
    }
}

async function getSpeechContent(packageId, granuleId) {
    const url = `${GOVINFO_BASE}/packages/${packageId}/granules/${granuleId}/htm?api_key=${GOVINFO_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const html = await response.text();

        // Extract text from HTML
        const text = html
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return text.substring(0, 5000); // Limit length
    } catch (error) {
        return null;
    }
}

function extractQuotesFromSpeech(text, speakerId, speakerName, date, source) {
    const quotes = [];

    // Split into paragraphs/sentences
    const segments = text.split(/[.!?]+/).filter(s => s.trim().length > 100);

    for (const segment of segments.slice(0, 5)) { // Take up to 5 notable segments
        const cleanText = segment.trim();
        if (cleanText.length < 100 || cleanText.length > 1000) continue;

        const categories = detectCategories(cleanText);
        const rhetoric = detectRhetoric(cleanText);

        // Only include if it has notable content
        if (categories.length > 0 || rhetoric.length > 0) {
            quotes.push({
                id: `crec-${speakerId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                speakerId,
                text: cleanText,
                date,
                source,
                sourceUrl: null,
                eventType: 'floor-speech',
                categories,
                rhetoric
            });
        }
    }

    return quotes;
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
    console.log('Congressional Speech Collection (GovInfo API)');
    console.log('='.repeat(50));

    let totalQuotes = 0;
    let totalAdded = 0;

    for (const [speakerId, memberInfo] of Object.entries(TARGET_MEMBERS)) {
        // Check if speaker exists in database
        const existingSpeaker = await sql`SELECT id FROM speakers WHERE id = ${speakerId}`;

        if (existingSpeaker.length === 0) {
            // Add speaker to database
            console.log(`\nAdding speaker ${memberInfo.name} to database...`);
            await sql`
                INSERT INTO speakers (id, name, roles, party, bioguide_id, color, category)
                VALUES (
                    ${speakerId},
                    ${memberInfo.name},
                    ARRAY['Representative'],
                    'Republican',
                    ${memberInfo.bioguideId},
                    '#dd4400',
                    'congress'
                )
                ON CONFLICT (id) DO NOTHING
            `;
        }

        // Search for speeches
        const results = await searchMemberSpeeches(speakerId, memberInfo, 30);

        if (results.length === 0) {
            console.log(`  No speeches found for ${memberInfo.name}`);
            continue;
        }

        const allQuotes = [];

        // Process each result
        for (const result of results.slice(0, 10)) { // Process top 10 most recent
            const packageId = result.packageId;
            const granuleId = result.granuleId;
            const date = result.dateIssued?.split('T')[0];

            if (!packageId || !granuleId) continue;

            // Get speech content
            const content = await getSpeechContent(packageId, granuleId);
            if (!content || content.length < 200) continue;

            // Extract quotes
            const quotes = extractQuotesFromSpeech(
                content,
                speakerId,
                memberInfo.name,
                date,
                `Congressional Record - ${result.title || 'Floor Speech'}`
            );

            allQuotes.push(...quotes);

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
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
