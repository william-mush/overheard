// Collect Trump's Truth Social posts from CNN archive
// Source: https://ix.cnn.io/data/truth-social/truth_archive.json

import { config } from 'dotenv';
config({ path: '.env.local' });

const API_BASE = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'overheard-admin-2025';

const TRUTH_SOCIAL_ARCHIVE_URL = 'https://ix.cnn.io/data/truth-social/truth_archive.json';

// Categories to detect in posts
const CATEGORY_KEYWORDS = {
    'immigration': ['border', 'immigrant', 'migrant', 'deportation', 'alien', 'invasion', 'caravan', 'ice', 'wall'],
    'election': ['vote', 'voter', 'election', 'ballot', 'fraud', 'rigged', 'stolen', 'cheat', '2020', '2024'],
    'media': ['fake news', 'cnn', 'msnbc', 'media', 'press', 'journalist', 'reporter', 'mainstream'],
    'economy': ['economy', 'jobs', 'inflation', 'stock', 'trade', 'tariff', 'tax', 'business', 'gdp'],
    'military': ['military', 'army', 'navy', 'troops', 'veteran', 'defense', 'war', 'soldier'],
    'opponents': ['democrat', 'biden', 'harris', 'pelosi', 'schumer', 'aoc', 'radical left', 'socialist']
};

// Rhetoric patterns to detect
const RHETORIC_KEYWORDS = {
    'dehumanizing': ['animal', 'vermin', 'pest', 'infestation', 'plague', 'disease', 'scum', 'rat'],
    'violent': ['fight', 'destroy', 'eliminate', 'crush', 'obliterate', 'annihilate', 'attack'],
    'absolutist': ['always', 'never', 'everyone', 'no one', 'best ever', 'worst ever', 'greatest', 'most'],
    'victimhood': ['witch hunt', 'persecution', 'unfair', 'rigged against', 'they want to', 'attack on me'],
    'conspiracy': ['deep state', 'they don\'t want', 'cover up', 'hidden', 'secret', 'radical']
};

function detectCategories(text) {
    const lowerText = text.toLowerCase();
    const categories = [];

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            categories.push(category);
        }
    }

    return categories;
}

function detectRhetoric(text) {
    const lowerText = text.toLowerCase();
    const rhetoric = [];

    for (const [type, keywords] of Object.entries(RHETORIC_KEYWORDS)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            rhetoric.push(type);
        }
    }

    return rhetoric;
}

function generateQuoteId(post) {
    // Create deterministic ID from post ID
    return `truth-${post.id}`;
}

async function fetchTruthSocialArchive() {
    console.log('Fetching Truth Social archive from CNN...');

    const response = await fetch(TRUTH_SOCIAL_ARCHIVE_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch archive: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.length} posts`);

    return data;
}

async function addQuotesToDatabase(quotes) {
    console.log(`Adding ${quotes.length} quotes to database...`);

    // Use local database connection directly for bulk insert
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.POSTGRES_URL);

    let added = 0;
    let errors = 0;

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < quotes.length; i += batchSize) {
        const batch = quotes.slice(i, i + batchSize);

        for (const quote of batch) {
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
                    ON CONFLICT (id) DO UPDATE SET
                        text = EXCLUDED.text,
                        categories = EXCLUDED.categories,
                        rhetoric = EXCLUDED.rhetoric,
                        updated_at = NOW()
                `;
                added++;
            } catch (err) {
                errors++;
                if (errors < 5) {
                    console.error(`Error adding quote ${quote.id}:`, err.message);
                }
            }
        }

        console.log(`  Processed ${Math.min(i + batchSize, quotes.length)}/${quotes.length} quotes...`);
    }

    return { added, errors };
}

async function main() {
    try {
        console.log('='.repeat(50));
        console.log('Truth Social Data Collection');
        console.log('='.repeat(50) + '\n');

        // Fetch archive
        const posts = await fetchTruthSocialArchive();

        // Filter and transform posts
        console.log('\nProcessing posts...');

        const quotes = [];
        let skipped = 0;

        for (const post of posts) {
            // Skip reposts and very short posts
            if (!post.content || post.content.length < 50) {
                skipped++;
                continue;
            }

            // Skip if it's just a repost/quote
            if (post.content.startsWith('RT @') || post.content.startsWith('RE @')) {
                skipped++;
                continue;
            }

            const text = post.content
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim();

            // Skip if cleaned text is too short
            if (text.length < 50) {
                skipped++;
                continue;
            }

            // Detect categories and rhetoric
            const categories = detectCategories(text);
            const rhetoric = detectRhetoric(text);

            // Only include posts with detected categories or rhetoric (notable content)
            if (categories.length === 0 && rhetoric.length === 0) {
                // Still include if it's long enough to be substantive
                if (text.length < 200) {
                    skipped++;
                    continue;
                }
            }

            const date = post.created_at ? post.created_at.split('T')[0] : null;

            quotes.push({
                id: generateQuoteId(post),
                speakerId: 'donald-trump',
                text: text.substring(0, 2000), // Limit text length
                date,
                source: 'Truth Social',
                sourceUrl: post.uri || `https://truthsocial.com/@realDonaldTrump/posts/${post.id}`,
                eventType: 'social-media',
                categories,
                rhetoric
            });
        }

        console.log(`  Total posts: ${posts.length}`);
        console.log(`  Skipped (too short/reposts): ${skipped}`);
        console.log(`  Notable quotes to add: ${quotes.length}`);

        if (quotes.length === 0) {
            console.log('\nNo quotes to add.');
            return;
        }

        // Sort by date (newest first) and take the most recent/notable ones
        quotes.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        // Limit to 500 most recent notable posts for now
        const quotesToAdd = quotes.slice(0, 500);
        console.log(`\nAdding ${quotesToAdd.length} most recent notable quotes...`);

        // Add to database
        const result = await addQuotesToDatabase(quotesToAdd);

        console.log('\n' + '='.repeat(50));
        console.log('Collection Complete!');
        console.log('='.repeat(50));
        console.log(`  Added: ${result.added}`);
        console.log(`  Errors: ${result.errors}`);

        // Show category breakdown
        const categoryBreakdown = {};
        for (const quote of quotesToAdd) {
            for (const cat of quote.categories) {
                categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
            }
        }
        console.log('\nCategory breakdown:');
        for (const [cat, count] of Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])) {
            console.log(`  ${cat}: ${count}`);
        }

        // Show rhetoric breakdown
        const rhetoricBreakdown = {};
        for (const quote of quotesToAdd) {
            for (const rhet of quote.rhetoric) {
                rhetoricBreakdown[rhet] = (rhetoricBreakdown[rhet] || 0) + 1;
            }
        }
        console.log('\nRhetoric breakdown:');
        for (const [rhet, count] of Object.entries(rhetoricBreakdown).sort((a, b) => b[1] - a[1])) {
            console.log(`  ${rhet}: ${count}`);
        }

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
