// API endpoint for fetching political speech data from Neon database
import { neon } from '@neondatabase/serverless';

let sql;

function getDb() {
    if (!sql) {
        sql = neon(process.env.POSTGRES_URL);
    }
    return sql;
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { type, speaker, topic, limit = 50 } = req.query;

    try {
        let data;

        switch (type) {
            case 'speakers':
                data = await getSpeakers();
                break;

            case 'quotes':
                data = await getQuotes({ speaker, topic, limit: parseInt(limit) });
                break;

            case 'contradictions':
                data = await getContradictions({ speaker, limit: parseInt(limit) });
                break;

            case 'categories':
                data = await getCategories();
                break;

            case 'transcripts':
                data = await getTranscripts({ speaker, limit: parseInt(limit) });
                break;

            case 'random-contradiction':
                data = await getRandomContradiction();
                break;

            case 'all':
            default:
                // Return all data for initial load
                data = await getAllData();
                break;
        }

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
        return res.status(200).json(data);

    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Database error', message: error.message });
    }
}

async function getSpeakers() {
    const speakers = await getDb()`
        SELECT id, name, roles, party, bioguide_id, channels, color, category
        FROM speakers
        ORDER BY name
    `;

    // Convert to object format for compatibility
    const speakersObj = {};
    for (const s of speakers) {
        speakersObj[s.id] = {
            name: s.name,
            roles: s.roles,
            party: s.party,
            bioguideId: s.bioguide_id,
            channels: s.channels,
            color: s.color,
            category: s.category
        };
    }

    return { speakers: speakersObj };
}

async function getQuotes({ speaker, topic, limit }) {
    let quotes;

    if (speaker && topic) {
        quotes = await getDb()`
            SELECT q.*, s.name as speaker_name, s.color as speaker_color
            FROM quotes q
            JOIN speakers s ON q.speaker_id = s.id
            WHERE q.speaker_id = ${speaker}
            AND ${topic} = ANY(q.categories)
            ORDER BY q.date DESC NULLS LAST
            LIMIT ${limit}
        `;
    } else if (speaker) {
        quotes = await getDb()`
            SELECT q.*, s.name as speaker_name, s.color as speaker_color
            FROM quotes q
            JOIN speakers s ON q.speaker_id = s.id
            WHERE q.speaker_id = ${speaker}
            ORDER BY q.date DESC NULLS LAST
            LIMIT ${limit}
        `;
    } else if (topic) {
        quotes = await getDb()`
            SELECT q.*, s.name as speaker_name, s.color as speaker_color
            FROM quotes q
            JOIN speakers s ON q.speaker_id = s.id
            WHERE ${topic} = ANY(q.categories)
            ORDER BY q.date DESC NULLS LAST
            LIMIT ${limit}
        `;
    } else {
        quotes = await getDb()`
            SELECT q.*, s.name as speaker_name, s.color as speaker_color
            FROM quotes q
            JOIN speakers s ON q.speaker_id = s.id
            ORDER BY RANDOM()
            LIMIT ${limit}
        `;
    }

    return quotes.map(q => ({
        id: q.id,
        text: q.text,
        speaker: q.speaker_name,
        speakerId: q.speaker_id,
        speakerColor: q.speaker_color,
        date: q.date,
        source: q.source,
        sourceUrl: q.source_url,
        eventType: q.event_type,
        categories: q.categories,
        rhetoric: q.rhetoric,
        factCheck: q.fact_check_rating ? {
            rating: q.fact_check_rating,
            source: q.fact_check_source
        } : null,
        context: q.context
    }));
}

async function getContradictions({ speaker, limit }) {
    let contradictions;

    if (speaker) {
        contradictions = await getDb()`
            SELECT c.*, s.color as speaker_color
            FROM contradictions c
            JOIN speakers s ON c.speaker_id = s.id
            WHERE c.speaker_id = ${speaker}
            AND c.enabled = true
            ORDER BY c.created_at DESC
            LIMIT ${limit}
        `;
    } else {
        contradictions = await getDb()`
            SELECT c.*, s.color as speaker_color
            FROM contradictions c
            JOIN speakers s ON c.speaker_id = s.id
            WHERE c.enabled = true
            ORDER BY c.created_at DESC
            LIMIT ${limit}
        `;
    }

    return contradictions.map(c => ({
        id: c.id,
        speaker: c.speaker_name,
        speakerId: c.speaker_id,
        speakerColor: c.speaker_color,
        topic: c.topic,
        quote1: {
            text: c.quote1_text,
            date: c.quote1_date,
            source: c.quote1_source,
            sourceUrl: c.quote1_source_url
        },
        quote2: {
            text: c.quote2_text,
            date: c.quote2_date,
            source: c.quote2_source,
            sourceUrl: c.quote2_source_url
        },
        context: c.context
    }));
}

async function getRandomContradiction() {
    const contradictions = await getDb()`
        SELECT c.*, s.color as speaker_color
        FROM contradictions c
        JOIN speakers s ON c.speaker_id = s.id
        WHERE c.enabled = true
        ORDER BY RANDOM()
        LIMIT 1
    `;

    if (contradictions.length === 0) return null;

    const c = contradictions[0];
    return {
        id: c.id,
        speaker: c.speaker_name,
        speakerId: c.speaker_id,
        speakerColor: c.speaker_color,
        topic: c.topic,
        quote1: {
            text: c.quote1_text,
            date: c.quote1_date,
            source: c.quote1_source,
            sourceUrl: c.quote1_source_url
        },
        quote2: {
            text: c.quote2_text,
            date: c.quote2_date,
            source: c.quote2_source,
            sourceUrl: c.quote2_source_url
        },
        context: c.context
    };
}

async function getCategories() {
    const categories = await getDb()`
        SELECT id, type, label, keywords, color
        FROM categories
        ORDER BY type, label
    `;

    const result = {
        topics: {},
        rhetoric: {},
        factCheckRatings: {}
    };

    for (const cat of categories) {
        const obj = { label: cat.label };
        if (cat.keywords?.length) obj.keywords = cat.keywords;
        if (cat.color) obj.color = cat.color;

        switch (cat.type) {
            case 'topic':
                result.topics[cat.id] = obj;
                break;
            case 'rhetoric':
                result.rhetoric[cat.id] = obj;
                break;
            case 'factcheck':
                result.factCheckRatings[cat.id] = obj;
                break;
        }
    }

    return result;
}

async function getTranscripts({ speaker, limit }) {
    let transcripts;

    if (speaker) {
        transcripts = await getDb()`
            SELECT t.*, s.color as speaker_color
            FROM transcripts t
            JOIN speakers s ON t.speaker_id = s.id
            WHERE t.speaker_id = ${speaker}
            ORDER BY t.date DESC NULLS LAST
            LIMIT ${limit}
        `;
    } else {
        transcripts = await getDb()`
            SELECT t.*, s.color as speaker_color
            FROM transcripts t
            JOIN speakers s ON t.speaker_id = s.id
            ORDER BY t.date DESC NULLS LAST
            LIMIT ${limit}
        `;
    }

    return transcripts.map(t => ({
        id: t.id,
        speaker: t.speaker_name,
        speakerId: t.speaker_id,
        speakerColor: t.speaker_color,
        role: t.role,
        date: t.date,
        source: t.source,
        sourceUrl: t.source_url,
        eventType: t.event_type,
        title: t.title
    }));
}

async function getAllData() {
    const [speakers, contradictions, categories] = await Promise.all([
        getSpeakers(),
        getContradictions({ limit: 100 }),
        getCategories()
    ]);

    // Get counts
    const stats = await getDb()`
        SELECT
            (SELECT COUNT(*) FROM speakers) as speaker_count,
            (SELECT COUNT(*) FROM quotes) as quote_count,
            (SELECT COUNT(*) FROM contradictions WHERE enabled = true) as contradiction_count,
            (SELECT COUNT(*) FROM transcripts) as transcript_count
    `;

    return {
        speakers: speakers.speakers,
        contradictions,
        categories,
        stats: {
            speakers: parseInt(stats[0].speaker_count),
            quotes: parseInt(stats[0].quote_count),
            contradictions: parseInt(stats[0].contradiction_count),
            transcripts: parseInt(stats[0].transcript_count)
        }
    };
}
