/**
 * Quote Extractor Module
 * Extracts notable quotes from political speech transcripts
 */

// Patterns for identifying notable statements
const SUPERLATIVE_PATTERNS = [
  /\b(best|worst|greatest|biggest|most|least|highest|lowest|strongest|weakest)\b/gi,
  /\b(never|always|everyone|no one|nobody|all|none|every single)\b/gi,
  /\b(absolutely|totally|completely|entirely|perfectly|utterly)\b/gi,
  /\b(tremendous|incredible|unbelievable|amazing|terrible|horrible|disaster)\b/gi,
  /\b(in history|ever seen|of all time)\b/gi
];

const GROUP_REFERENCE_PATTERNS = [
  /\b(they|them|those people|these people|that group)\b/gi,
  /\b(immigrants?|migrants?|illegals?|aliens?)\b/gi,
  /\b(democrats?|republicans?|liberals?|conservatives?)\b/gi,
  /\b(the media|journalists?|reporters?|fake news)\b/gi,
  /\b(criminals?|gangs?|thugs?|terrorists?)\b/gi,
  /\b(elites?|establishment|deep state|swamp)\b/gi
];

const POLICY_INDICATORS = [
  /\b(we will|we're going to|i will|i'm going to|we must|we need to)\b/gi,
  /\b(my plan|our plan|the plan is|we propose)\b/gi,
  /\b(executive order|legislation|bill|law|policy)\b/gi,
  /\b(ban|prohibit|allow|require|mandate|eliminate)\b/gi
];

const CLAIM_PATTERNS = [
  /\b(i never said|i didn't say|i always said|i've always)\b/gi,
  /\b(the truth is|the fact is|let me tell you|believe me)\b/gi,
  /\b(everyone knows|nobody knows|people are saying)\b/gi
];

/**
 * Split text into sentences while preserving indices
 * @param {string} text - Full transcript text
 * @returns {Array<{text: string, start: number, end: number}>}
 */
function splitIntoSentences(text) {
  const sentences = [];
  // Match sentences ending with . ! ? or followed by quotes
  const regex = /[^.!?]*[.!?]+["']?\s*/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    sentences.push({
      text: match[0].trim(),
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Handle any remaining text without punctuation
  const lastEnd = sentences.length > 0 ? sentences[sentences.length - 1].end : 0;
  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd).trim();
    if (remaining.length > 0) {
      sentences.push({
        text: remaining,
        start: lastEnd,
        end: text.length
      });
    }
  }

  return sentences;
}

/**
 * Check if a sentence matches any patterns in a pattern array
 * @param {string} sentence
 * @param {RegExp[]} patterns
 * @returns {string[]} - Array of matched terms
 */
function findPatternMatches(sentence, patterns) {
  const matches = [];
  for (const pattern of patterns) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(sentence)) !== null) {
      matches.push(match[0].toLowerCase());
    }
  }
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Calculate a notability score for a sentence
 * @param {string} sentence
 * @returns {{score: number, reasons: string[], matchedTerms: Object}}
 */
function calculateNotabilityScore(sentence) {
  const reasons = [];
  const matchedTerms = {
    superlatives: [],
    groupReferences: [],
    policyIndicators: [],
    claims: []
  };
  let score = 0;

  // Check superlatives (weight: 2)
  const superlatives = findPatternMatches(sentence, SUPERLATIVE_PATTERNS);
  if (superlatives.length > 0) {
    score += superlatives.length * 2;
    reasons.push('superlative');
    matchedTerms.superlatives = superlatives;
  }

  // Check group references (weight: 3)
  const groupRefs = findPatternMatches(sentence, GROUP_REFERENCE_PATTERNS);
  if (groupRefs.length > 0) {
    score += groupRefs.length * 3;
    reasons.push('group-reference');
    matchedTerms.groupReferences = groupRefs;
  }

  // Check policy indicators (weight: 2)
  const policyInds = findPatternMatches(sentence, POLICY_INDICATORS);
  if (policyInds.length > 0) {
    score += policyInds.length * 2;
    reasons.push('policy-declaration');
    matchedTerms.policyIndicators = policyInds;
  }

  // Check claim patterns (weight: 2)
  const claims = findPatternMatches(sentence, CLAIM_PATTERNS);
  if (claims.length > 0) {
    score += claims.length * 2;
    reasons.push('claim');
    matchedTerms.claims = claims;
  }

  // Bonus for sentence length (longer = potentially more substantive)
  const wordCount = sentence.split(/\s+/).length;
  if (wordCount >= 10 && wordCount <= 50) {
    score += 1;
  }

  return { score, reasons, matchedTerms };
}

/**
 * Get surrounding context for a quote
 * @param {Array} sentences - All sentences
 * @param {number} index - Index of the quote sentence
 * @param {number} contextSize - Number of sentences before/after
 * @returns {{before: string, after: string}}
 */
function getContext(sentences, index, contextSize = 1) {
  const before = [];
  const after = [];

  for (let i = Math.max(0, index - contextSize); i < index; i++) {
    before.push(sentences[i].text);
  }

  for (let i = index + 1; i <= Math.min(sentences.length - 1, index + contextSize); i++) {
    after.push(sentences[i].text);
  }

  return {
    before: before.join(' '),
    after: after.join(' ')
  };
}

/**
 * Generate a unique ID for a quote
 * @returns {string}
 */
function generateQuoteId() {
  return 'quote-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Extract notable quotes from a transcript
 * @param {Object} transcript - Transcript object with fullText
 * @param {Object} options - Extraction options
 * @param {number} options.minScore - Minimum notability score (default: 3)
 * @param {number} options.maxQuotes - Maximum quotes to extract (default: 50)
 * @param {number} options.contextSentences - Sentences of context (default: 1)
 * @returns {Array<Object>} - Array of extracted quotes
 */
function extractQuotes(transcript, options = {}) {
  const {
    minScore = 3,
    maxQuotes = 50,
    contextSentences = 1
  } = options;

  if (!transcript || !transcript.fullText) {
    return [];
  }

  const fullText = transcript.fullText;
  const sentences = splitIntoSentences(fullText);
  const quotes = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const { score, reasons, matchedTerms } = calculateNotabilityScore(sentence.text);

    if (score >= minScore) {
      const context = getContext(sentences, i, contextSentences);

      quotes.push({
        id: generateQuoteId(),
        text: sentence.text,
        startIndex: sentence.start,
        endIndex: sentence.end,
        notabilityScore: score,
        extractionReasons: reasons,
        matchedTerms,
        context: {
          before: context.before,
          after: context.after,
          fullContext: [context.before, sentence.text, context.after].filter(Boolean).join(' ')
        },
        // Placeholders to be filled by other modules
        categories: [],
        factCheck: null,
        relatedQuotes: []
      });
    }
  }

  // Sort by notability score and limit
  quotes.sort((a, b) => b.notabilityScore - a.notabilityScore);
  return quotes.slice(0, maxQuotes);
}

/**
 * Merge overlapping or adjacent quotes
 * @param {Array} quotes - Array of quotes
 * @param {number} mergeThreshold - Character distance to consider merging
 * @returns {Array}
 */
function mergeAdjacentQuotes(quotes, mergeThreshold = 100) {
  if (quotes.length <= 1) return quotes;

  // Sort by start index
  const sorted = [...quotes].sort((a, b) => a.startIndex - b.startIndex);
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // Check if quotes should be merged
    if (current.startIndex - last.endIndex <= mergeThreshold) {
      // Merge: combine text and indices
      last.text = last.text + ' ' + current.text;
      last.endIndex = current.endIndex;
      last.notabilityScore = Math.max(last.notabilityScore, current.notabilityScore);
      last.extractionReasons = [...new Set([...last.extractionReasons, ...current.extractionReasons])];

      // Merge matched terms
      for (const key of Object.keys(last.matchedTerms)) {
        last.matchedTerms[key] = [...new Set([...last.matchedTerms[key], ...(current.matchedTerms[key] || [])])];
      }
    } else {
      merged.push(current);
    }
  }

  return merged;
}

module.exports = {
  extractQuotes,
  mergeAdjacentQuotes,
  splitIntoSentences,
  calculateNotabilityScore,
  // Export patterns for testing
  SUPERLATIVE_PATTERNS,
  GROUP_REFERENCE_PATTERNS,
  POLICY_INDICATORS,
  CLAIM_PATTERNS
};
