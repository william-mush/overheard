// Database setup and migration script
// Run with: node scripts/setup-database.js

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

const sql = neon(process.env.POSTGRES_URL);

async function createSchema() {
    console.log('Creating database schema...');

    // Create speakers table
    await sql`
        CREATE TABLE IF NOT EXISTS speakers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            roles TEXT[] DEFAULT '{}',
            party TEXT,
            bioguide_id TEXT,
            channels TEXT[] DEFAULT '{}',
            color TEXT DEFAULT '#ffffff',
            category TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `;
    console.log('  ✓ speakers table created');

    // Create transcripts table
    await sql`
        CREATE TABLE IF NOT EXISTS transcripts (
            id TEXT PRIMARY KEY,
            speaker_id TEXT REFERENCES speakers(id),
            speaker_name TEXT NOT NULL,
            role TEXT,
            date DATE,
            source TEXT,
            source_url TEXT,
            event_type TEXT,
            title TEXT,
            full_text TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `;
    console.log('  ✓ transcripts table created');

    // Create quotes table
    await sql`
        CREATE TABLE IF NOT EXISTS quotes (
            id TEXT PRIMARY KEY,
            transcript_id TEXT REFERENCES transcripts(id),
            speaker_id TEXT REFERENCES speakers(id),
            text TEXT NOT NULL,
            date DATE,
            source TEXT,
            source_url TEXT,
            event_type TEXT,
            categories TEXT[] DEFAULT '{}',
            rhetoric TEXT[] DEFAULT '{}',
            fact_check_rating TEXT,
            fact_check_source TEXT,
            fact_check_url TEXT,
            context TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `;
    console.log('  ✓ quotes table created');

    // Create contradictions table
    await sql`
        CREATE TABLE IF NOT EXISTS contradictions (
            id TEXT PRIMARY KEY,
            speaker_id TEXT REFERENCES speakers(id),
            speaker_name TEXT NOT NULL,
            topic TEXT,
            quote1_text TEXT NOT NULL,
            quote1_date DATE,
            quote1_source TEXT,
            quote1_source_url TEXT,
            quote2_text TEXT NOT NULL,
            quote2_date DATE,
            quote2_source TEXT,
            quote2_source_url TEXT,
            context TEXT,
            enabled BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `;
    console.log('  ✓ contradictions table created');

    // Create categories table
    await sql`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            label TEXT NOT NULL,
            keywords TEXT[] DEFAULT '{}',
            color TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;
    console.log('  ✓ categories table created');

    // Create indexes for better query performance
    await sql`CREATE INDEX IF NOT EXISTS idx_quotes_speaker ON quotes(speaker_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_quotes_categories ON quotes USING GIN(categories)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_quotes_rhetoric ON quotes USING GIN(rhetoric)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contradictions_speaker ON contradictions(speaker_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transcripts_speaker ON transcripts(speaker_id)`;
    console.log('  ✓ indexes created');

    console.log('Schema creation complete!\n');
}

async function migrateData() {
    console.log('Migrating data from JSON files...');

    // Load JSON files
    const speakersData = JSON.parse(readFileSync(join(__dirname, '../data/speakers.json'), 'utf-8'));
    const transcriptsData = JSON.parse(readFileSync(join(__dirname, '../data/transcripts.json'), 'utf-8'));
    const categoriesData = JSON.parse(readFileSync(join(__dirname, '../data/categories.json'), 'utf-8'));

    // Migrate speakers
    console.log('  Migrating speakers...');
    const speakers = speakersData.speakers;
    for (const [id, speaker] of Object.entries(speakers)) {
        await sql`
            INSERT INTO speakers (id, name, roles, party, bioguide_id, channels, color, category)
            VALUES (
                ${id},
                ${speaker.name},
                ${speaker.roles || []},
                ${speaker.party || null},
                ${speaker.bioguideId || null},
                ${speaker.channels || []},
                ${speaker.color || '#ffffff'},
                ${speaker.category || null}
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
    }
    console.log(`    ✓ ${Object.keys(speakers).length} speakers migrated`);

    // Migrate categories
    console.log('  Migrating categories...');
    let categoryCount = 0;

    // Topics
    if (categoriesData.topics) {
        for (const [id, topic] of Object.entries(categoriesData.topics)) {
            await sql`
                INSERT INTO categories (id, type, label, keywords)
                VALUES (${id}, 'topic', ${topic.label}, ${topic.keywords || []})
                ON CONFLICT (id) DO UPDATE SET
                    label = EXCLUDED.label,
                    keywords = EXCLUDED.keywords
            `;
            categoryCount++;
        }
    }

    // Rhetoric types
    if (categoriesData.rhetoric) {
        for (const [id, rhetoric] of Object.entries(categoriesData.rhetoric)) {
            await sql`
                INSERT INTO categories (id, type, label, keywords, color)
                VALUES (${id}, 'rhetoric', ${rhetoric.label}, ${rhetoric.keywords || []}, ${rhetoric.color || null})
                ON CONFLICT (id) DO UPDATE SET
                    label = EXCLUDED.label,
                    keywords = EXCLUDED.keywords,
                    color = EXCLUDED.color
            `;
            categoryCount++;
        }
    }

    // Fact check ratings
    if (categoriesData.factCheckRatings) {
        for (const [id, rating] of Object.entries(categoriesData.factCheckRatings)) {
            await sql`
                INSERT INTO categories (id, type, label, color)
                VALUES (${id}, 'factcheck', ${rating.label}, ${rating.color || null})
                ON CONFLICT (id) DO UPDATE SET
                    label = EXCLUDED.label,
                    color = EXCLUDED.color
            `;
            categoryCount++;
        }
    }
    console.log(`    ✓ ${categoryCount} categories migrated`);

    // Migrate transcripts and quotes
    console.log('  Migrating transcripts and quotes...');
    let transcriptCount = 0;
    let quoteCount = 0;

    for (const transcript of transcriptsData.transcripts) {
        // Skip the "various" compilation entry for quotes (we'll handle quotes separately)
        if (transcript.speakerId === 'various') {
            // Handle compilation quotes
            if (transcript.extractedQuotes) {
                for (const quote of transcript.extractedQuotes) {
                    const speakerId = quote.speakerId || transcript.speakerId;
                    await sql`
                        INSERT INTO quotes (id, speaker_id, text, date, source, source_url, event_type, categories, rhetoric, fact_check_rating, fact_check_source, context)
                        VALUES (
                            ${quote.id},
                            ${speakerId},
                            ${quote.text},
                            ${quote.date || transcript.date || null},
                            ${quote.source || transcript.source},
                            ${quote.sourceUrl || transcript.sourceUrl || null},
                            ${transcript.eventType || null},
                            ${quote.categories || []},
                            ${quote.rhetoric || []},
                            ${quote.factCheck?.rating || null},
                            ${quote.factCheck?.source || null},
                            ${quote.context || null}
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            text = EXCLUDED.text,
                            categories = EXCLUDED.categories,
                            rhetoric = EXCLUDED.rhetoric,
                            fact_check_rating = EXCLUDED.fact_check_rating,
                            fact_check_source = EXCLUDED.fact_check_source,
                            context = EXCLUDED.context,
                            updated_at = NOW()
                    `;
                    quoteCount++;
                }
            }
            continue;
        }

        // Insert transcript
        await sql`
            INSERT INTO transcripts (id, speaker_id, speaker_name, role, date, source, source_url, event_type, title)
            VALUES (
                ${transcript.id},
                ${transcript.speakerId},
                ${transcript.speaker},
                ${transcript.role || null},
                ${transcript.date || null},
                ${transcript.source || null},
                ${transcript.sourceUrl || null},
                ${transcript.eventType || null},
                ${transcript.title || null}
            )
            ON CONFLICT (id) DO UPDATE SET
                speaker_name = EXCLUDED.speaker_name,
                role = EXCLUDED.role,
                source = EXCLUDED.source,
                source_url = EXCLUDED.source_url,
                event_type = EXCLUDED.event_type,
                title = EXCLUDED.title,
                updated_at = NOW()
        `;
        transcriptCount++;

        // Insert quotes from this transcript
        if (transcript.extractedQuotes) {
            for (const quote of transcript.extractedQuotes) {
                await sql`
                    INSERT INTO quotes (id, transcript_id, speaker_id, text, date, source, source_url, event_type, categories, rhetoric, fact_check_rating, fact_check_source)
                    VALUES (
                        ${quote.id},
                        ${transcript.id},
                        ${transcript.speakerId},
                        ${quote.text},
                        ${transcript.date || null},
                        ${transcript.source || null},
                        ${transcript.sourceUrl || null},
                        ${transcript.eventType || null},
                        ${quote.categories || []},
                        ${quote.rhetoric || []},
                        ${quote.factCheck?.rating || null},
                        ${quote.factCheck?.source || null}
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        text = EXCLUDED.text,
                        categories = EXCLUDED.categories,
                        rhetoric = EXCLUDED.rhetoric,
                        fact_check_rating = EXCLUDED.fact_check_rating,
                        fact_check_source = EXCLUDED.fact_check_source,
                        updated_at = NOW()
                `;
                quoteCount++;
            }
        }
    }
    console.log(`    ✓ ${transcriptCount} transcripts migrated`);
    console.log(`    ✓ ${quoteCount} quotes migrated`);

    // Migrate contradictions
    console.log('  Migrating contradictions...');
    let contradictionCount = 0;

    if (transcriptsData.contradictions) {
        for (const c of transcriptsData.contradictions) {
            await sql`
                INSERT INTO contradictions (id, speaker_id, speaker_name, topic, quote1_text, quote1_date, quote1_source, quote1_source_url, quote2_text, quote2_date, quote2_source, quote2_source_url, context, enabled)
                VALUES (
                    ${c.id},
                    ${c.speakerId},
                    ${c.speaker},
                    ${c.topic || null},
                    ${c.quote1.text},
                    ${c.quote1.date || null},
                    ${c.quote1.source || null},
                    ${c.quote1.sourceUrl || null},
                    ${c.quote2.text},
                    ${c.quote2.date || null},
                    ${c.quote2.source || null},
                    ${c.quote2.sourceUrl || null},
                    ${c.context || null},
                    true
                )
                ON CONFLICT (id) DO UPDATE SET
                    speaker_name = EXCLUDED.speaker_name,
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
            contradictionCount++;
        }
    }
    console.log(`    ✓ ${contradictionCount} contradictions migrated`);

    console.log('\nMigration complete!');
}

async function verifyData() {
    console.log('\nVerifying migrated data...');

    const speakerCount = await sql`SELECT COUNT(*) FROM speakers`;
    const transcriptCount = await sql`SELECT COUNT(*) FROM transcripts`;
    const quoteCount = await sql`SELECT COUNT(*) FROM quotes`;
    const contradictionCount = await sql`SELECT COUNT(*) FROM contradictions`;
    const categoryCount = await sql`SELECT COUNT(*) FROM categories`;

    console.log(`  Speakers: ${speakerCount[0].count}`);
    console.log(`  Transcripts: ${transcriptCount[0].count}`);
    console.log(`  Quotes: ${quoteCount[0].count}`);
    console.log(`  Contradictions: ${contradictionCount[0].count}`);
    console.log(`  Categories: ${categoryCount[0].count}`);

    // Show sample contradiction
    const sampleContradiction = await sql`
        SELECT c.*, s.color as speaker_color
        FROM contradictions c
        JOIN speakers s ON c.speaker_id = s.id
        LIMIT 1
    `;
    if (sampleContradiction.length > 0) {
        console.log('\n  Sample contradiction:');
        console.log(`    Speaker: ${sampleContradiction[0].speaker_name}`);
        console.log(`    Topic: ${sampleContradiction[0].topic}`);
        console.log(`    Then: "${sampleContradiction[0].quote1_text.substring(0, 50)}..."`);
        console.log(`    Now: "${sampleContradiction[0].quote2_text.substring(0, 50)}..."`);
    }
}

async function main() {
    try {
        console.log('='.repeat(50));
        console.log('Overheard Database Setup');
        console.log('='.repeat(50) + '\n');

        await createSchema();
        await migrateData();
        await verifyData();

        console.log('\n' + '='.repeat(50));
        console.log('Setup complete! Database is ready.');
        console.log('='.repeat(50));
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
