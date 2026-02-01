// Collect Congressional speeches from Congress.gov API
// API Docs: https://api.congress.gov/
// Rate limit: 5000 requests/hour with API key

import { config } from 'dotenv';
config({ path: '.env.local' });

const { neon } = await import('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

// Congress.gov API (api.data.gov key)
const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS_BASE = 'https://api.congress.gov/v3';

if (!CONGRESS_API_KEY) {
    console.error('ERROR: CONGRESS_API_KEY not set in .env.local');
    process.exit(1);
}

// Target members with their bioguide IDs
const TARGET_MEMBERS = {
    // Congressional Allies
    'marjorie-taylor-greene': { name: 'Marjorie Taylor Greene', bioguideId: 'G000596', chamber: 'house' },
    'matt-gaetz': { name: 'Matt Gaetz', bioguideId: 'G000578', chamber: 'house' },
    'lauren-boebert': { name: 'Lauren Boebert', bioguideId: 'B000825', chamber: 'house' },
    'jim-jordan': { name: 'Jim Jordan', bioguideId: 'J000289', chamber: 'house' },
    // Cabinet members who were in Congress
    'marco-rubio': { name: 'Marco Rubio', bioguideId: 'R000595', chamber: 'senate' },
    'jd-vance': { name: 'JD Vance', bioguideId: 'V000137', chamber: 'senate' },
    // Other notable members
    'mike-johnson': { name: 'Mike Johnson', bioguideId: 'J000299', chamber: 'house' },
    'ted-cruz': { name: 'Ted Cruz', bioguideId: 'C001098', chamber: 'senate' },
    'rand-paul': { name: 'Rand Paul', bioguideId: 'P000603', chamber: 'senate' },
    'josh-hawley': { name: 'Josh Hawley', bioguideId: 'H001089', chamber: 'senate' }
};

// Categories to detect
const CATEGORY_KEYWORDS = {
    'immigration': ['border', 'immigrant', 'migrant', 'deportation', 'alien', 'invasion', 'ice', 'wall', 'asylum', 'cartel'],
    'election': ['vote', 'voter', 'election', 'ballot', 'fraud', 'rigged', 'stolen', 'integrity', 'january 6'],
    'media': ['fake news', 'media', 'press', 'journalist', 'censor', 'big tech', 'twitter', 'facebook'],
    'economy': ['economy', 'jobs', 'inflation', 'tax', 'spending', 'debt', 'budget', 'tariff'],
    'opponents': ['democrat', 'biden', 'harris', 'pelosi', 'schumer', 'radical', 'socialist', 'left', 'woke'],
    'military': ['military', 'troops', 'defense', 'veterans', 'army', 'navy', 'marines'],
    'healthcare': ['healthcare', 'vaccine', 'covid', 'mandate', 'fauci', 'cdc', 'pharmaceutical']
};

const RHETORIC_KEYWORDS = {
    'dehumanizing': ['animal', 'vermin', 'invasion', 'infestation', 'plague', 'horde', 'swarm'],
    'violent': ['fight', 'destroy', 'eliminate', 'war on', 'attack', 'battle', 'combat'],
    'absolutist': ['always', 'never', 'everyone knows', 'no one', 'greatest', 'worst', 'total', 'complete'],
    'victimhood': ['witch hunt', 'persecution', 'unfair', 'attack on', 'targeted', 'weaponized'],
    'conspiracy': ['deep state', 'cover up', 'they don\'t want you to know', 'cabal', 'globalist']
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

// Fetch with retry and rate limiting
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.status === 429) {
                console.log('  Rate limited, waiting 60 seconds...');
                await new Promise(resolve => setTimeout(resolve, 60000));
                continue;
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// Get member's sponsored legislation (shows their priorities)
async function getMemberLegislation(bioguideId, limit = 20) {
    const url = `${CONGRESS_BASE}/member/${bioguideId}/sponsored-legislation?api_key=${CONGRESS_API_KEY}&format=json&limit=${limit}`;
    try {
        const data = await fetchWithRetry(url);
        return data.sponsoredLegislation || [];
    } catch (error) {
        console.error(`  Error fetching legislation for ${bioguideId}:`, error.message);
        return [];
    }
}

// Get member's statements from Congressional Record
async function getMemberStatements(bioguideId, limit = 50) {
    // Congress.gov doesn't have a direct statements endpoint, but we can search the Congressional Record
    // We'll use the daily-congressional-record endpoint and filter
    const url = `${CONGRESS_BASE}/congressional-record?api_key=${CONGRESS_API_KEY}&format=json&limit=${limit}`;
    try {
        const data = await fetchWithRetry(url);
        return data.Results || data.congressionalRecord || [];
    } catch (error) {
        console.error(`  Error fetching Congressional Record:`, error.message);
        return [];
    }
}

// Get recent hearings where member might have spoken
async function getRecentHearings(congress = 118, chamber = 'house', limit = 20) {
    const url = `${CONGRESS_BASE}/hearing/${congress}/${chamber}?api_key=${CONGRESS_API_KEY}&format=json&limit=${limit}`;
    try {
        const data = await fetchWithRetry(url);
        return data.hearings || [];
    } catch (error) {
        console.error(`  Error fetching hearings:`, error.message);
        return [];
    }
}

// Get member details
async function getMemberDetails(bioguideId) {
    const url = `${CONGRESS_BASE}/member/${bioguideId}?api_key=${CONGRESS_API_KEY}&format=json`;
    try {
        const data = await fetchWithRetry(url);
        return data.member || null;
    } catch (error) {
        console.error(`  Error fetching member ${bioguideId}:`, error.message);
        return null;
    }
}

// Extract notable quotes from legislation titles and summaries
function extractFromLegislation(legislation, speakerId, speakerName) {
    const quotes = [];

    for (const bill of legislation) {
        const title = bill.title || '';
        const latestSummary = bill.latestSummary?.text || '';
        const introducedDate = bill.introducedDate;

        // Use bill title as a "quote" of their priorities
        if (title.length > 50 && title.length < 500) {
            const categories = detectCategories(title);
            const rhetoric = detectRhetoric(title);

            if (categories.length > 0) {
                quotes.push({
                    id: `congress-leg-${speakerId}-${bill.number || Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                    speakerId,
                    text: `Sponsored: "${title}"`,
                    date: introducedDate,
                    source: `Congress - ${bill.type || 'Bill'} ${bill.number || ''}`,
                    sourceUrl: bill.url || `https://congress.gov/bill/${bill.congress}/${bill.type?.toLowerCase()}/${bill.number}`,
                    eventType: 'legislation',
                    categories,
                    rhetoric
                });
            }
        }
    }

    return quotes;
}

async function ensureSpeakerExists(speakerId, memberInfo) {
    const existing = await sql`SELECT id FROM speakers WHERE id = ${speakerId}`;

    if (existing.length === 0) {
        console.log(`  Adding speaker ${memberInfo.name} to database...`);
        await sql`
            INSERT INTO speakers (id, name, roles, party, bioguide_id, color, category)
            VALUES (
                ${speakerId},
                ${memberInfo.name},
                ARRAY[${memberInfo.chamber === 'senate' ? 'Senator' : 'Representative'}],
                'Republican',
                ${memberInfo.bioguideId},
                '#dd4400',
                'congress'
            )
            ON CONFLICT (id) DO UPDATE SET bioguide_id = ${memberInfo.bioguideId}
        `;
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
            if (errors < 3) console.error(`  DB error: ${err.message}`);
        }
    }

    return { added, errors };
}

async function main() {
    console.log('='.repeat(60));
    console.log('Congress.gov API Collection');
    console.log('API Key: ' + CONGRESS_API_KEY.substring(0, 8) + '...');
    console.log('='.repeat(60));

    // Test API connection
    console.log('\nTesting API connection...');
    try {
        const testUrl = `${CONGRESS_BASE}/member?api_key=${CONGRESS_API_KEY}&format=json&limit=1`;
        const testData = await fetchWithRetry(testUrl);
        console.log('API connection successful!');
    } catch (error) {
        console.error('API connection failed:', error.message);
        process.exit(1);
    }

    let totalQuotes = 0;
    let totalAdded = 0;

    for (const [speakerId, memberInfo] of Object.entries(TARGET_MEMBERS)) {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`Processing: ${memberInfo.name}`);
        console.log(`${'─'.repeat(50)}`);

        // Ensure speaker exists in database
        await ensureSpeakerExists(speakerId, memberInfo);

        // Get member details
        const memberDetails = await getMemberDetails(memberInfo.bioguideId);
        if (memberDetails) {
            console.log(`  Member found: ${memberDetails.directOrderName || memberDetails.name}`);
            console.log(`  Current: ${memberDetails.currentMember ? 'Yes' : 'No'}`);
        }

        // Get sponsored legislation
        console.log('  Fetching sponsored legislation...');
        const legislation = await getMemberLegislation(memberInfo.bioguideId, 30);
        console.log(`  Found ${legislation.length} bills`);

        // Extract quotes from legislation
        const quotes = extractFromLegislation(legislation, speakerId, memberInfo.name);
        console.log(`  Extracted ${quotes.length} notable items`);
        totalQuotes += quotes.length;

        if (quotes.length > 0) {
            const result = await addQuotesToDatabase(quotes);
            console.log(`  Added ${result.added} to database (${result.errors} errors)`);
            totalAdded += result.added;
        }

        // Rate limiting - be nice to the API
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log('Collection Complete!');
    console.log('='.repeat(60));
    console.log(`Total items extracted: ${totalQuotes}`);
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

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
