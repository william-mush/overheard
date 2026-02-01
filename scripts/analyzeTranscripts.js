#!/usr/bin/env node
/**
 * Analyze Transcripts Script
 * Runs all analysis modules on transcripts and saves results
 *
 * Usage: node scripts/analyzeTranscripts.js [options]
 *
 * Options:
 *   --input <path>   Path to transcripts.json (default: data/transcripts.json)
 *   --output <path>  Path for output (default: same as input)
 *   --verbose        Show detailed progress
 *   --dry-run        Don't save changes, just show what would be done
 */

const fs = require('fs');
const path = require('path');

// Import analysis modules
const { extractQuotes, mergeAdjacentQuotes } = require('../js/analysis/quoteExtractor');
const { categorize, categorizeDetailed } = require('../js/analysis/categorizer');
const { checkFact } = require('../js/analysis/factChecker');
const { findAllContradictions } = require('../js/analysis/contradictionFinder');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: path.join(__dirname, '../data/transcripts.json'),
    output: null, // Will default to input path
    verbose: false,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
        options.input = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Analyze Transcripts - Political Speech Analysis Pipeline

Usage: node analyzeTranscripts.js [options]

Options:
  --input <path>   Path to transcripts.json (default: data/transcripts.json)
  --output <path>  Path for output (default: same as input)
  --verbose        Show detailed progress
  --dry-run        Don't save changes, just show what would be done
  --help           Show this help message
        `);
        process.exit(0);
    }
  }

  if (!options.output) {
    options.output = options.input;
  }

  return options;
}

// Load transcripts from file
function loadTranscripts(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading transcripts from ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Save transcripts to file
function saveTranscripts(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Saved analyzed transcripts to ${filePath}`);
  } catch (error) {
    console.error(`Error saving transcripts to ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Analyze a single transcript
function analyzeTranscript(transcript, options) {
  const { verbose } = options;

  if (verbose) {
    console.log(`  Analyzing: ${transcript.title || transcript.id}`);
  }

  // Step 1: Extract quotes
  const quotes = extractQuotes(transcript, {
    minScore: 3,
    maxQuotes: 50,
    contextSentences: 1
  });

  if (verbose) {
    console.log(`    - Extracted ${quotes.length} quotes`);
  }

  // Step 2: Categorize each quote
  for (const quote of quotes) {
    const detailed = categorizeDetailed(quote.text);
    quote.categories = detailed.allIds;
    quote.topicCategories = detailed.topics;
    quote.rhetoricCategories = detailed.rhetoric;
    quote.severity = detailed.overallSeverity;
  }

  if (verbose) {
    const withCategories = quotes.filter(q => q.categories.length > 0).length;
    console.log(`    - Categorized ${withCategories} quotes with topics/rhetoric`);
  }

  // Step 3: Fact-check quotes
  for (const quote of quotes) {
    const factCheck = checkFact(quote.text);
    if (factCheck) {
      quote.factCheck = factCheck;
    }
  }

  if (verbose) {
    const factChecked = quotes.filter(q => q.factCheck).length;
    console.log(`    - Found ${factChecked} fact-check matches`);
  }

  // Merge adjacent quotes if needed
  const mergedQuotes = mergeAdjacentQuotes(quotes, 50);

  return mergedQuotes;
}

// Calculate statistics
function calculateStats(transcripts) {
  const stats = {
    totalTranscripts: transcripts.length,
    totalQuotes: 0,
    bySpeaker: {},
    byTopic: {},
    byRhetoric: {},
    byFactCheckRating: {},
    highSeverityCount: 0
  };

  for (const transcript of transcripts) {
    const quotes = transcript.extractedQuotes || [];
    stats.totalQuotes += quotes.length;

    // By speaker
    const speaker = transcript.speakerId || 'unknown';
    stats.bySpeaker[speaker] = (stats.bySpeaker[speaker] || 0) + quotes.length;

    for (const quote of quotes) {
      // By topic
      for (const topic of (quote.topicCategories || [])) {
        stats.byTopic[topic.id] = (stats.byTopic[topic.id] || 0) + 1;
      }

      // By rhetoric
      for (const rhetoric of (quote.rhetoricCategories || [])) {
        stats.byRhetoric[rhetoric.id] = (stats.byRhetoric[rhetoric.id] || 0) + 1;
      }

      // By fact-check rating
      if (quote.factCheck) {
        const rating = quote.factCheck.rating;
        stats.byFactCheckRating[rating] = (stats.byFactCheckRating[rating] || 0) + 1;
      }

      // High severity count
      if (quote.severity === 'high') {
        stats.highSeverityCount++;
      }
    }
  }

  return stats;
}

// Main function
async function main() {
  const options = parseArgs();

  console.log('Political Speech Analysis Pipeline');
  console.log('==================================');
  console.log(`Input:  ${options.input}`);
  console.log(`Output: ${options.output}`);
  if (options.dryRun) {
    console.log('Mode:   DRY RUN (no changes will be saved)');
  }
  console.log('');

  // Load transcripts
  console.log('Loading transcripts...');
  const data = loadTranscripts(options.input);
  const transcripts = data.transcripts || [];

  console.log(`Found ${transcripts.length} transcripts`);

  if (transcripts.length === 0) {
    console.log('No transcripts to analyze. Add transcripts to the database first.');
    return;
  }

  // Analyze each transcript
  console.log('\nAnalyzing transcripts...');
  for (const transcript of transcripts) {
    transcript.extractedQuotes = analyzeTranscript(transcript, options);
  }

  // Find contradictions across all transcripts
  console.log('\nFinding contradictions...');
  const contradictions = findAllContradictions(transcripts);

  // Store contradictions in a separate section
  data.contradictions = {};
  for (const [speakerId, speakerContradictions] of contradictions) {
    data.contradictions[speakerId] = speakerContradictions;
    if (options.verbose) {
      console.log(`  - ${speakerId}: ${speakerContradictions.length} contradictions found`);
    }
  }

  // Calculate and update stats
  console.log('\nCalculating statistics...');
  data.stats = calculateStats(transcripts);
  data.lastUpdated = new Date().toISOString();

  // Print summary
  console.log('\n=== Analysis Summary ===');
  console.log(`Total transcripts: ${data.stats.totalTranscripts}`);
  console.log(`Total quotes extracted: ${data.stats.totalQuotes}`);
  console.log(`High severity rhetoric: ${data.stats.highSeverityCount}`);
  console.log(`Topics covered: ${Object.keys(data.stats.byTopic).length}`);
  console.log(`Rhetoric patterns found: ${Object.keys(data.stats.byRhetoric).length}`);

  if (Object.keys(data.contradictions).length > 0) {
    let totalContradictions = 0;
    for (const speakerContradictions of Object.values(data.contradictions)) {
      totalContradictions += speakerContradictions.length;
    }
    console.log(`Contradictions found: ${totalContradictions}`);
  }

  // Save results
  if (!options.dryRun) {
    console.log('\nSaving results...');
    saveTranscripts(options.output, data);
  } else {
    console.log('\nDry run complete. No changes saved.');
  }

  console.log('\nAnalysis complete!');
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
