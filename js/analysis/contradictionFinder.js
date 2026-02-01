/**
 * Contradiction Finder Module
 * Identifies contradictory statements by the same speaker
 */

const { categorize, categorizeDetailed } = require('./categorizer');

// Patterns that indicate denial of previous statements
const DENIAL_PATTERNS = [
  /i never said/gi,
  /i didn't say/gi,
  /i did not say/gi,
  /i never claimed/gi,
  /i never called/gi,
  /that's not what i said/gi,
  /i never told/gi,
  /i've never said/gi,
  /i have never said/gi,
  /i wouldn't say/gi,
  /i would never say/gi
];

// Patterns for policy positions
const POLICY_POSITION_PATTERNS = [
  { pattern: /i (support|am for|believe in|back|endorse)/gi, stance: 'support' },
  { pattern: /i (oppose|am against|don't support|reject|refuse)/gi, stance: 'oppose' },
  { pattern: /we (will|must|need to|should|are going to)/gi, stance: 'will-do' },
  { pattern: /we (won't|will not|cannot|should not|must not)/gi, stance: 'will-not' }
];

// Contradiction types
const CONTRADICTION_TYPES = {
  DENIAL: 'denial',           // "I never said X" when they did say X
  POLICY_REVERSAL: 'policy-reversal',  // Changed position on policy
  FACTUAL_FLIP: 'factual-flip',        // Contradictory factual claims
  POSITION_CHANGE: 'position-change'   // General stance change
};

/**
 * Extract the subject of a denial statement
 * @param {string} text - Text containing denial
 * @returns {string|null} - The subject being denied
 */
function extractDenialSubject(text) {
  for (const pattern of DENIAL_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      // Get text after the denial phrase
      const afterDenial = text.slice(match.index + match[0].length).trim();
      // Take up to the end of sentence or 100 chars
      const endMatch = afterDenial.match(/[.!?]/);
      const endIndex = endMatch ? endMatch.index : Math.min(100, afterDenial.length);
      return afterDenial.slice(0, endIndex).trim().toLowerCase();
    }
  }
  return null;
}

/**
 * Check if text contains a denial pattern
 * @param {string} text
 * @returns {boolean}
 */
function containsDenial(text) {
  for (const pattern of DENIAL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract policy stance from text
 * @param {string} text
 * @returns {{stance: string, subject: string}|null}
 */
function extractPolicyStance(text) {
  for (const { pattern, stance } of POLICY_POSITION_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      const afterMatch = text.slice(match.index + match[0].length).trim();
      const endMatch = afterMatch.match(/[.!?,]/);
      const endIndex = endMatch ? endMatch.index : Math.min(50, afterMatch.length);
      const subject = afterMatch.slice(0, endIndex).trim().toLowerCase();

      if (subject.length > 0) {
        return { stance, subject };
      }
    }
  }
  return null;
}

/**
 * Calculate text similarity using word overlap
 * @param {string} text1
 * @param {string} text2
 * @returns {number} - Similarity score 0-1
 */
function calculateSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word)) intersection++;
  }

  return intersection / Math.min(words1.size, words2.size);
}

/**
 * Check if two quotes are about the same topic
 * @param {Object} quote1
 * @param {Object} quote2
 * @returns {boolean}
 */
function sameTopic(quote1, quote2) {
  // Check category overlap
  const categories1 = quote1.categories || categorize(quote1.text);
  const categories2 = quote2.categories || categorize(quote2.text);

  for (const cat of categories1) {
    if (categories2.includes(cat)) {
      return true;
    }
  }

  // Check text similarity as fallback
  return calculateSimilarity(quote1.text, quote2.text) > 0.3;
}

/**
 * Find denial contradictions ("I never said X" when they did)
 * @param {Array} quotes - All quotes from a speaker
 * @returns {Array} - Array of contradiction pairs
 */
function findDenialContradictions(quotes) {
  const contradictions = [];

  for (const quote of quotes) {
    if (containsDenial(quote.text)) {
      const deniedSubject = extractDenialSubject(quote.text);
      if (!deniedSubject) continue;

      // Search for quotes that match what was denied
      for (const otherQuote of quotes) {
        if (otherQuote.id === quote.id) continue;

        // Check if the other quote contains the denied subject
        const otherLower = otherQuote.text.toLowerCase();
        if (otherLower.includes(deniedSubject) || calculateSimilarity(deniedSubject, otherLower) > 0.5) {
          // Make sure denial came after the original statement
          const quote1Date = quote.date ? new Date(quote.date) : null;
          const quote2Date = otherQuote.date ? new Date(otherQuote.date) : null;

          if (!quote1Date || !quote2Date || quote1Date > quote2Date) {
            contradictions.push({
              quote1: {
                id: otherQuote.id,
                text: otherQuote.text,
                date: otherQuote.date,
                source: otherQuote.source
              },
              quote2: {
                id: quote.id,
                text: quote.text,
                date: quote.date,
                source: quote.source
              },
              topic: deniedSubject,
              type: CONTRADICTION_TYPES.DENIAL,
              confidence: calculateSimilarity(deniedSubject, otherLower)
            });
          }
        }
      }
    }
  }

  return contradictions;
}

/**
 * Find policy reversal contradictions
 * @param {Array} quotes - All quotes from a speaker
 * @returns {Array} - Array of contradiction pairs
 */
function findPolicyReversals(quotes) {
  const contradictions = [];
  const stanceMap = new Map(); // subject -> array of {quote, stance}

  // Extract stances from all quotes
  for (const quote of quotes) {
    const stanceInfo = extractPolicyStance(quote.text);
    if (stanceInfo) {
      const key = stanceInfo.subject;
      if (!stanceMap.has(key)) {
        stanceMap.set(key, []);
      }
      stanceMap.get(key).push({
        quote,
        stance: stanceInfo.stance
      });
    }
  }

  // Find contradictory stances on same subject
  for (const [subject, stances] of stanceMap) {
    const supportStances = stances.filter(s => s.stance === 'support' || s.stance === 'will-do');
    const opposeStances = stances.filter(s => s.stance === 'oppose' || s.stance === 'will-not');

    // Create contradiction pairs
    for (const support of supportStances) {
      for (const oppose of opposeStances) {
        contradictions.push({
          quote1: {
            id: support.quote.id,
            text: support.quote.text,
            date: support.quote.date,
            source: support.quote.source,
            stance: support.stance
          },
          quote2: {
            id: oppose.quote.id,
            text: oppose.quote.text,
            date: oppose.quote.date,
            source: oppose.quote.source,
            stance: oppose.stance
          },
          topic: subject,
          type: CONTRADICTION_TYPES.POLICY_REVERSAL,
          confidence: 0.7
        });
      }
    }
  }

  return contradictions;
}

/**
 * Find topical contradictions (contradictory claims on same topic)
 * @param {Array} quotes - All quotes from a speaker
 * @returns {Array}
 */
function findTopicalContradictions(quotes) {
  const contradictions = [];

  // Group quotes by topic
  const topicGroups = new Map();

  for (const quote of quotes) {
    const categories = quote.categories || categorize(quote.text);
    for (const category of categories) {
      if (!topicGroups.has(category)) {
        topicGroups.set(category, []);
      }
      topicGroups.get(category).push(quote);
    }
  }

  // Within each topic, look for contradictory statements
  for (const [topic, topicQuotes] of topicGroups) {
    for (let i = 0; i < topicQuotes.length; i++) {
      for (let j = i + 1; j < topicQuotes.length; j++) {
        const quote1 = topicQuotes[i];
        const quote2 = topicQuotes[j];

        // Check for opposing absolutist claims
        const hasAbsolutist1 = /\b(always|never|all|none|everyone|no one|best|worst|greatest)\b/i.test(quote1.text);
        const hasAbsolutist2 = /\b(always|never|all|none|everyone|no one|best|worst|greatest)\b/i.test(quote2.text);

        if (hasAbsolutist1 && hasAbsolutist2) {
          // Check if they make opposite claims
          const positive1 = /\b(best|greatest|always|all|everyone)\b/i.test(quote1.text);
          const positive2 = /\b(best|greatest|always|all|everyone)\b/i.test(quote2.text);
          const negative1 = /\b(worst|never|none|no one)\b/i.test(quote1.text);
          const negative2 = /\b(worst|never|none|no one)\b/i.test(quote2.text);

          if ((positive1 && negative2) || (negative1 && positive2)) {
            contradictions.push({
              quote1: {
                id: quote1.id,
                text: quote1.text,
                date: quote1.date,
                source: quote1.source
              },
              quote2: {
                id: quote2.id,
                text: quote2.text,
                date: quote2.date,
                source: quote2.source
              },
              topic,
              type: CONTRADICTION_TYPES.FACTUAL_FLIP,
              confidence: 0.5
            });
          }
        }
      }
    }
  }

  return contradictions;
}

/**
 * Main function to find contradictions
 * @param {Array} transcripts - Array of transcript objects
 * @param {string} speakerId - ID of the speaker to analyze
 * @param {Object} options - Options
 * @param {number} options.minConfidence - Minimum confidence threshold
 * @returns {Array} - Array of contradiction pairs
 */
function findContradictions(transcripts, speakerId, options = {}) {
  const { minConfidence = 0.3 } = options;

  if (!transcripts || !Array.isArray(transcripts)) {
    return [];
  }

  // Collect all quotes from the speaker across all transcripts
  const speakerQuotes = [];

  for (const transcript of transcripts) {
    if (transcript.speakerId !== speakerId) continue;

    const quotes = transcript.extractedQuotes || [];
    for (const quote of quotes) {
      speakerQuotes.push({
        ...quote,
        date: transcript.date,
        source: transcript.source,
        transcriptId: transcript.id
      });
    }
  }

  if (speakerQuotes.length < 2) {
    return [];
  }

  // Find all types of contradictions
  const allContradictions = [
    ...findDenialContradictions(speakerQuotes),
    ...findPolicyReversals(speakerQuotes),
    ...findTopicalContradictions(speakerQuotes)
  ];

  // Filter by confidence and deduplicate
  const filtered = allContradictions.filter(c => c.confidence >= minConfidence);

  // Deduplicate by quote pair
  const seen = new Set();
  const unique = [];

  for (const contradiction of filtered) {
    const key = [contradiction.quote1.id, contradiction.quote2.id].sort().join('-');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(contradiction);
    }
  }

  // Sort by confidence
  unique.sort((a, b) => b.confidence - a.confidence);

  return unique;
}

/**
 * Find contradictions for all speakers in dataset
 * @param {Array} transcripts
 * @param {Object} options
 * @returns {Map<string, Array>} - Map of speakerId to contradictions
 */
function findAllContradictions(transcripts, options = {}) {
  const results = new Map();

  // Get unique speaker IDs
  const speakerIds = new Set();
  for (const transcript of transcripts) {
    if (transcript.speakerId) {
      speakerIds.add(transcript.speakerId);
    }
  }

  // Find contradictions for each speaker
  for (const speakerId of speakerIds) {
    const contradictions = findContradictions(transcripts, speakerId, options);
    if (contradictions.length > 0) {
      results.set(speakerId, contradictions);
    }
  }

  return results;
}

module.exports = {
  findContradictions,
  findAllContradictions,
  findDenialContradictions,
  findPolicyReversals,
  findTopicalContradictions,
  containsDenial,
  extractDenialSubject,
  extractPolicyStance,
  calculateSimilarity,
  CONTRADICTION_TYPES
};
