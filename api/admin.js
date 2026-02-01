// Admin API endpoint for adding data to the database
// Protected endpoint for data collection scripts

import { neon } from '@neondatabase/serverless';

let sql;

function getDb() {
    if (!sql) {
        sql = neon(process.env.POSTGRES_URL);
    }
    return sql;
}

// Simple admin key check (in production, use proper auth)
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'overheard-admin-2025';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Check admin authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_KEY}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action } = req.query;

    try {
        switch (req.method) {
            case 'POST':
                return await handlePost(action, req.body, res);
            case 'PUT':
                return await handlePut(action, req.body, res);
            case 'DELETE':
                return await handleDelete(action, req.query, res);
            case 'GET':
                return await handleGet(action, req.query, res);
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Admin API error:', error);
        return res.status(500).json({ error: 'Database error', message: error.message });
    }
}

async function handlePost(action, body, res) {
    switch (action) {
        case 'quote':
            return await addQuote(body, res);
        case 'quotes':
            return await addQuotes(body, res);
        case 'contradiction':
            return await addContradiction(body, res);
        case 'contradictions':
            return await addContradictions(body, res);
        case 'speaker':
            return await addSpeaker(body, res);
        case 'transcript':
            return await addTranscript(body, res);
        default:
            return res.status(400).json({ error: 'Invalid action' });
    }
}

async function handlePut(action, body, res) {
    switch (action) {
        case 'quote':
            return await updateQuote(body, res);
        case 'contradiction':
            return await updateContradiction(body, res);
        case 'speaker':
            return await updateSpeaker(body, res);
        default:
            return res.status(400).json({ error: 'Invalid action' });
    }
}

async function handleDelete(action, query, res) {
    const { id } = query;
    if (!id) {
        return res.status(400).json({ error: 'ID required' });
    }

    switch (action) {
        case 'quote':
            await getDb()`DELETE FROM quotes WHERE id = ${id}`;
            return res.status(200).json({ success: true, deleted: id });
        case 'contradiction':
            await getDb()`DELETE FROM contradictions WHERE id = ${id}`;
            return res.status(200).json({ success: true, deleted: id });
        default:
            return res.status(400).json({ error: 'Invalid action' });
    }
}

async function handleGet(action, query, res) {
    switch (action) {
        case 'stats':
            const stats = await getDb()`
                SELECT
                    (SELECT COUNT(*) FROM speakers) as speakers,
                    (SELECT COUNT(*) FROM quotes) as quotes,
                    (SELECT COUNT(*) FROM contradictions) as contradictions,
                    (SELECT COUNT(*) FROM transcripts) as transcripts
            `;
            return res.status(200).json(stats[0]);
        case 'recent':
            const recent = await getDb()`
                SELECT id, text, speaker_id, created_at
                FROM quotes
                ORDER BY created_at DESC
                LIMIT 10
            `;
            return res.status(200).json(recent);
        default:
            return res.status(400).json({ error: 'Invalid action' });
    }
}

async function addQuote(data, res) {
    const {
        id, speakerId, text, date, source, sourceUrl, eventType,
        categories = [], rhetoric = [], factCheckRating, factCheckSource, context
    } = data;

    if (!id || !speakerId || !text) {
        return res.status(400).json({ error: 'id, speakerId, and text are required' });
    }

    await getDb()`
        INSERT INTO quotes (id, speaker_id, text, date, source, source_url, event_type, categories, rhetoric, fact_check_rating, fact_check_source, context)
        VALUES (
            ${id},
            ${speakerId},
            ${text},
            ${date || null},
            ${source || null},
            ${sourceUrl || null},
            ${eventType || null},
            ${categories},
            ${rhetoric},
            ${factCheckRating || null},
            ${factCheckSource || null},
            ${context || null}
        )
        ON CONFLICT (id) DO UPDATE SET
            text = EXCLUDED.text,
            source = EXCLUDED.source,
            source_url = EXCLUDED.source_url,
            categories = EXCLUDED.categories,
            rhetoric = EXCLUDED.rhetoric,
            fact_check_rating = EXCLUDED.fact_check_rating,
            fact_check_source = EXCLUDED.fact_check_source,
            context = EXCLUDED.context,
            updated_at = NOW()
    `;

    return res.status(201).json({ success: true, id });
}

async function addQuotes(data, res) {
    const { quotes } = data;

    if (!quotes || !Array.isArray(quotes)) {
        return res.status(400).json({ error: 'quotes array required' });
    }

    let added = 0;
    let errors = [];

    for (const quote of quotes) {
        try {
            const {
                id, speakerId, text, date, source, sourceUrl, eventType,
                categories = [], rhetoric = [], factCheckRating, factCheckSource, context
            } = quote;

            if (!id || !speakerId || !text) {
                errors.push({ id, error: 'Missing required fields' });
                continue;
            }

            await getDb()`
                INSERT INTO quotes (id, speaker_id, text, date, source, source_url, event_type, categories, rhetoric, fact_check_rating, fact_check_source, context)
                VALUES (
                    ${id},
                    ${speakerId},
                    ${text},
                    ${date || null},
                    ${source || null},
                    ${sourceUrl || null},
                    ${eventType || null},
                    ${categories},
                    ${rhetoric},
                    ${factCheckRating || null},
                    ${factCheckSource || null},
                    ${context || null}
                )
                ON CONFLICT (id) DO UPDATE SET
                    text = EXCLUDED.text,
                    categories = EXCLUDED.categories,
                    rhetoric = EXCLUDED.rhetoric,
                    fact_check_rating = EXCLUDED.fact_check_rating,
                    updated_at = NOW()
            `;
            added++;
        } catch (err) {
            errors.push({ id: quote.id, error: err.message });
        }
    }

    return res.status(201).json({ success: true, added, errors: errors.length > 0 ? errors : undefined });
}

async function addContradiction(data, res) {
    const {
        id, speakerId, speaker, topic,
        quote1Text, quote1Date, quote1Source, quote1SourceUrl,
        quote2Text, quote2Date, quote2Source, quote2SourceUrl,
        context
    } = data;

    if (!id || !speakerId || !speaker || !quote1Text || !quote2Text) {
        return res.status(400).json({ error: 'Required fields: id, speakerId, speaker, quote1Text, quote2Text' });
    }

    await getDb()`
        INSERT INTO contradictions (id, speaker_id, speaker_name, topic, quote1_text, quote1_date, quote1_source, quote1_source_url, quote2_text, quote2_date, quote2_source, quote2_source_url, context, enabled)
        VALUES (
            ${id},
            ${speakerId},
            ${speaker},
            ${topic || null},
            ${quote1Text},
            ${quote1Date || null},
            ${quote1Source || null},
            ${quote1SourceUrl || null},
            ${quote2Text},
            ${quote2Date || null},
            ${quote2Source || null},
            ${quote2SourceUrl || null},
            ${context || null},
            true
        )
        ON CONFLICT (id) DO UPDATE SET
            topic = EXCLUDED.topic,
            quote1_text = EXCLUDED.quote1_text,
            quote1_date = EXCLUDED.quote1_date,
            quote1_source = EXCLUDED.quote1_source,
            quote2_text = EXCLUDED.quote2_text,
            quote2_date = EXCLUDED.quote2_date,
            quote2_source = EXCLUDED.quote2_source,
            context = EXCLUDED.context,
            updated_at = NOW()
    `;

    return res.status(201).json({ success: true, id });
}

async function addContradictions(data, res) {
    const { contradictions } = data;

    if (!contradictions || !Array.isArray(contradictions)) {
        return res.status(400).json({ error: 'contradictions array required' });
    }

    let added = 0;
    let errors = [];

    for (const c of contradictions) {
        try {
            const {
                id, speakerId, speaker, topic,
                quote1Text, quote1Date, quote1Source, quote1SourceUrl,
                quote2Text, quote2Date, quote2Source, quote2SourceUrl,
                context
            } = c;

            if (!id || !speakerId || !speaker || !quote1Text || !quote2Text) {
                errors.push({ id, error: 'Missing required fields' });
                continue;
            }

            await getDb()`
                INSERT INTO contradictions (id, speaker_id, speaker_name, topic, quote1_text, quote1_date, quote1_source, quote1_source_url, quote2_text, quote2_date, quote2_source, quote2_source_url, context, enabled)
                VALUES (
                    ${id},
                    ${speakerId},
                    ${speaker},
                    ${topic || null},
                    ${quote1Text},
                    ${quote1Date || null},
                    ${quote1Source || null},
                    ${quote1SourceUrl || null},
                    ${quote2Text},
                    ${quote2Date || null},
                    ${quote2Source || null},
                    ${quote2SourceUrl || null},
                    ${context || null},
                    true
                )
                ON CONFLICT (id) DO UPDATE SET
                    topic = EXCLUDED.topic,
                    quote1_text = EXCLUDED.quote1_text,
                    quote2_text = EXCLUDED.quote2_text,
                    context = EXCLUDED.context,
                    updated_at = NOW()
            `;
            added++;
        } catch (err) {
            errors.push({ id: c.id, error: err.message });
        }
    }

    return res.status(201).json({ success: true, added, errors: errors.length > 0 ? errors : undefined });
}

async function addSpeaker(data, res) {
    const {
        id, name, roles = [], party, bioguideId, channels = [], color, category
    } = data;

    if (!id || !name) {
        return res.status(400).json({ error: 'id and name required' });
    }

    await getDb()`
        INSERT INTO speakers (id, name, roles, party, bioguide_id, channels, color, category)
        VALUES (
            ${id},
            ${name},
            ${roles},
            ${party || null},
            ${bioguideId || null},
            ${channels},
            ${color || '#ffffff'},
            ${category || null}
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            roles = EXCLUDED.roles,
            party = EXCLUDED.party,
            bioguide_id = EXCLUDED.bioguide_id,
            channels = EXCLUDED.channels,
            color = EXCLUDED.color,
            category = EXCLUDED.category,
            updated_at = NOW()
    `;

    return res.status(201).json({ success: true, id });
}

async function addTranscript(data, res) {
    const {
        id, speakerId, speakerName, role, date, source, sourceUrl, eventType, title, fullText
    } = data;

    if (!id || !speakerId || !speakerName) {
        return res.status(400).json({ error: 'id, speakerId, and speakerName required' });
    }

    await getDb()`
        INSERT INTO transcripts (id, speaker_id, speaker_name, role, date, source, source_url, event_type, title, full_text)
        VALUES (
            ${id},
            ${speakerId},
            ${speakerName},
            ${role || null},
            ${date || null},
            ${source || null},
            ${sourceUrl || null},
            ${eventType || null},
            ${title || null},
            ${fullText || null}
        )
        ON CONFLICT (id) DO UPDATE SET
            speaker_name = EXCLUDED.speaker_name,
            role = EXCLUDED.role,
            source = EXCLUDED.source,
            source_url = EXCLUDED.source_url,
            event_type = EXCLUDED.event_type,
            title = EXCLUDED.title,
            full_text = EXCLUDED.full_text,
            updated_at = NOW()
    `;

    return res.status(201).json({ success: true, id });
}

async function updateQuote(data, res) {
    const { id, ...updates } = data;

    if (!id) {
        return res.status(400).json({ error: 'id required' });
    }

    // Build dynamic update
    const fields = [];
    const values = [];

    if (updates.text) { fields.push('text'); values.push(updates.text); }
    if (updates.categories) { fields.push('categories'); values.push(updates.categories); }
    if (updates.rhetoric) { fields.push('rhetoric'); values.push(updates.rhetoric); }
    if (updates.factCheckRating) { fields.push('fact_check_rating'); values.push(updates.factCheckRating); }
    if (updates.factCheckSource) { fields.push('fact_check_source'); values.push(updates.factCheckSource); }
    if (updates.context) { fields.push('context'); values.push(updates.context); }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    // For simplicity, update all provided fields
    await getDb()`
        UPDATE quotes SET
            text = COALESCE(${updates.text}, text),
            categories = COALESCE(${updates.categories}, categories),
            rhetoric = COALESCE(${updates.rhetoric}, rhetoric),
            fact_check_rating = COALESCE(${updates.factCheckRating}, fact_check_rating),
            fact_check_source = COALESCE(${updates.factCheckSource}, fact_check_source),
            context = COALESCE(${updates.context}, context),
            updated_at = NOW()
        WHERE id = ${id}
    `;

    return res.status(200).json({ success: true, id });
}

async function updateContradiction(data, res) {
    const { id, enabled, ...updates } = data;

    if (!id) {
        return res.status(400).json({ error: 'id required' });
    }

    await getDb()`
        UPDATE contradictions SET
            topic = COALESCE(${updates.topic}, topic),
            quote1_text = COALESCE(${updates.quote1Text}, quote1_text),
            quote2_text = COALESCE(${updates.quote2Text}, quote2_text),
            context = COALESCE(${updates.context}, context),
            enabled = COALESCE(${enabled}, enabled),
            updated_at = NOW()
        WHERE id = ${id}
    `;

    return res.status(200).json({ success: true, id });
}

async function updateSpeaker(data, res) {
    const { id, ...updates } = data;

    if (!id) {
        return res.status(400).json({ error: 'id required' });
    }

    await getDb()`
        UPDATE speakers SET
            name = COALESCE(${updates.name}, name),
            roles = COALESCE(${updates.roles}, roles),
            party = COALESCE(${updates.party}, party),
            color = COALESCE(${updates.color}, color),
            category = COALESCE(${updates.category}, category),
            updated_at = NOW()
        WHERE id = ${id}
    `;

    return res.status(200).json({ success: true, id });
}
