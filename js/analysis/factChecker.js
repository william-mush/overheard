/**
 * Fact Checker Module
 * Cross-references claims with fact-checking sources
 *
 * MVP Implementation: Uses mock data for demonstration
 *
 * INTEGRATION GUIDE:
 * To integrate with real fact-checking APIs, implement one of these:
 *
 * 1. Google Fact Check Tools API
 *    - URL: https://developers.google.com/fact-check/tools/api
 *    - Free tier available
 *    - Aggregates fact-checks from multiple sources
 *    - Implementation: Replace mockFactCheckDatabase with API calls
 *
 * 2. ClaimBuster API
 *    - URL: https://idir.uta.edu/claimbuster/
 *    - Academic/research API
 *    - Scores claims for "check-worthiness"
 *    - Good for pre-filtering before fact-checking
 *
 * 3. PolitiFact / Snopes scraping (with permission)
 *    - Would require building a local database
 *    - Update scripts/updateFactChecks.js to fetch and cache
 *
 * 4. Full Fact API (UK-focused)
 *    - URL: https://fullfact.org/api/
 *    - Good for UK political claims
 */

// Mock database of fact-checked claims for MVP
// In production, this would be replaced with API calls or a real database
const mockFactCheckDatabase = [
  {
    patterns: ['biggest crowd', 'largest crowd', 'most people ever'],
    topic: 'crowd size',
    factCheck: {
      rating: 'false',
      source: 'PolitiFact',
      sourceUrl: 'https://www.politifact.com/example',
      summary: 'Crowd size claims have been repeatedly debunked by aerial photography analysis.',
      checkedDate: '2024-01-15'
    }
  },
  {
    patterns: ['millions of illegal votes', 'illegal voting', 'millions of fraudulent'],
    topic: 'election fraud',
    factCheck: {
      rating: 'false',
      source: 'FactCheck.org',
      sourceUrl: 'https://www.factcheck.org/example',
      summary: 'Multiple studies and court cases have found no evidence of widespread voter fraud.',
      checkedDate: '2024-02-20'
    }
  },
  {
    patterns: ['crime rate', 'highest crime', 'crime is up'],
    topic: 'crime statistics',
    factCheck: {
      rating: 'half-true',
      source: 'Snopes',
      sourceUrl: 'https://www.snopes.com/example',
      summary: 'Crime statistics vary by type and location. National trends show mixed results.',
      checkedDate: '2024-03-10'
    }
  },
  {
    patterns: ['border', 'open border', 'wide open'],
    topic: 'border security',
    factCheck: {
      rating: 'mostly-false',
      source: 'Washington Post Fact Checker',
      sourceUrl: 'https://www.washingtonpost.com/example',
      summary: 'Border enforcement continues with varying levels of staffing and policy.',
      checkedDate: '2024-01-25'
    }
  },
  {
    patterns: ['best economy', 'greatest economy', 'strongest economy ever'],
    topic: 'economy',
    factCheck: {
      rating: 'half-true',
      source: 'PolitiFact',
      sourceUrl: 'https://www.politifact.com/example',
      summary: 'Economic metrics show mixed results depending on which indicators are measured.',
      checkedDate: '2024-02-15'
    }
  }
];

/**
 * Normalize text for comparison
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if claim matches any patterns
 * @param {string} claim - The claim text
 * @param {string[]} patterns - Patterns to match
 * @returns {boolean}
 */
function matchesPatterns(claim, patterns) {
  const normalizedClaim = normalizeText(claim);

  for (const pattern of patterns) {
    const normalizedPattern = normalizeText(pattern);
    if (normalizedClaim.includes(normalizedPattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Search mock database for fact-checks
 * @param {string} claim - The claim to check
 * @returns {Object|null}
 */
function searchMockDatabase(claim) {
  for (const entry of mockFactCheckDatabase) {
    if (matchesPatterns(claim, entry.patterns)) {
      return {
        ...entry.factCheck,
        matchedTopic: entry.topic,
        confidence: 'mock-data'
      };
    }
  }
  return null;
}

/**
 * Main fact-checking function
 * @param {string} claim - The claim to fact-check
 * @param {Object} options - Options
 * @param {boolean} options.useMockData - Use mock data (default: true for MVP)
 * @param {string} options.apiKey - API key for real fact-check service
 * @returns {Object|null} - Fact-check result or null if not found
 */
function checkFact(claim, options = {}) {
  const {
    useMockData = true,
    apiKey = null
  } = options;

  if (!claim || typeof claim !== 'string' || claim.trim().length === 0) {
    return null;
  }

  // MVP: Use mock data
  if (useMockData) {
    return searchMockDatabase(claim);
  }

  // Placeholder for real API integration
  // TODO: Implement real fact-checking API calls
  // Example structure for Google Fact Check Tools API:
  /*
  if (apiKey) {
    const results = await callGoogleFactCheckAPI(claim, apiKey);
    if (results && results.length > 0) {
      return {
        rating: mapGoogleRating(results[0].claimReview[0].textualRating),
        source: results[0].claimReview[0].publisher.name,
        sourceUrl: results[0].claimReview[0].url,
        summary: results[0].claimReview[0].title,
        checkedDate: results[0].claimReview[0].reviewDate
      };
    }
  }
  */

  return null;
}

/**
 * Batch fact-check multiple claims
 * @param {string[]} claims - Array of claims
 * @param {Object} options - Options
 * @returns {Map<string, Object|null>} - Map of claim to fact-check result
 */
function checkFactBatch(claims, options = {}) {
  const results = new Map();

  for (const claim of claims) {
    results.set(claim, checkFact(claim, options));
  }

  return results;
}

/**
 * Get rating metadata
 * @param {string} rating - Rating string
 * @returns {Object|null}
 */
function getRatingMetadata(rating) {
  const ratings = {
    'false': {
      label: 'False',
      color: '#ff0000',
      description: 'Statement is not accurate',
      score: 0
    },
    'mostly-false': {
      label: 'Mostly False',
      color: '#ff6600',
      description: 'Statement contains some element of truth but ignores critical facts',
      score: 0.25
    },
    'half-true': {
      label: 'Half True',
      color: '#ffcc00',
      description: 'Statement is partially accurate but leaves out important details',
      score: 0.5
    },
    'mostly-true': {
      label: 'Mostly True',
      color: '#99cc00',
      description: 'Statement is accurate but needs clarification',
      score: 0.75
    },
    'true': {
      label: 'True',
      color: '#00cc00',
      description: 'Statement is accurate',
      score: 1
    },
    'unverified': {
      label: 'Unverified',
      color: '#888888',
      description: 'Statement has not been fact-checked',
      score: null
    }
  };

  return ratings[rating] || null;
}

/**
 * Add a custom fact-check entry (for testing or manual additions)
 * @param {Object} entry - Fact-check entry
 * @param {string[]} entry.patterns - Patterns to match
 * @param {string} entry.topic - Topic of the claim
 * @param {Object} entry.factCheck - Fact-check data
 */
function addMockEntry(entry) {
  if (entry && entry.patterns && entry.factCheck) {
    mockFactCheckDatabase.push(entry);
  }
}

/**
 * Clear all mock entries (for testing)
 */
function clearMockEntries() {
  mockFactCheckDatabase.length = 0;
}

/**
 * Get statistics on fact-check coverage
 * @returns {Object}
 */
function getMockStats() {
  const topics = new Set();
  let totalPatterns = 0;

  for (const entry of mockFactCheckDatabase) {
    topics.add(entry.topic);
    totalPatterns += entry.patterns.length;
  }

  return {
    totalEntries: mockFactCheckDatabase.length,
    uniqueTopics: topics.size,
    totalPatterns,
    topics: [...topics]
  };
}

// Placeholder for future Google Fact Check API integration
/*
async function callGoogleFactCheckAPI(claim, apiKey) {
  const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(claim)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.claims || [];
  } catch (error) {
    console.error('Google Fact Check API error:', error);
    return [];
  }
}

function mapGoogleRating(textualRating) {
  const ratingMap = {
    'false': 'false',
    'pants on fire': 'false',
    'mostly false': 'mostly-false',
    'half true': 'half-true',
    'mostly true': 'mostly-true',
    'true': 'true'
  };

  const normalized = textualRating.toLowerCase();
  return ratingMap[normalized] || 'unverified';
}
*/

module.exports = {
  checkFact,
  checkFactBatch,
  getRatingMetadata,
  getMockStats,
  // For testing
  addMockEntry,
  clearMockEntries,
  normalizeText,
  matchesPatterns
};
