/**
 * Categorizer Module
 * Categorizes quotes by topic and rhetoric patterns
 */

const fs = require('fs');
const path = require('path');

// Cache for categories data
let categoriesCache = null;

/**
 * Load categories from JSON file
 * @param {string} categoriesPath - Path to categories.json
 * @returns {Object} - Categories data
 */
function loadCategories(categoriesPath = null) {
  if (categoriesCache) {
    return categoriesCache;
  }

  const defaultPath = path.join(__dirname, '../../data/categories.json');
  const filePath = categoriesPath || defaultPath;

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    categoriesCache = JSON.parse(data);
    return categoriesCache;
  } catch (error) {
    console.error(`Error loading categories from ${filePath}:`, error.message);
    return { topics: {}, rhetoric: {} };
  }
}

/**
 * Clear the categories cache (useful for testing)
 */
function clearCache() {
  categoriesCache = null;
}

/**
 * Check if text contains any keywords from a list
 * @param {string} text - Text to check
 * @param {string[]} keywords - Keywords to search for
 * @returns {{matched: boolean, matchedKeywords: string[]}}
 */
function matchKeywords(text, keywords) {
  const lowerText = text.toLowerCase();
  const matchedKeywords = [];

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    // Use word boundary matching for single words, substring for phrases
    if (lowerKeyword.includes(' ')) {
      // Multi-word phrase - simple substring match
      if (lowerText.includes(lowerKeyword)) {
        matchedKeywords.push(keyword);
      }
    } else {
      // Single word - use word boundary regex
      const regex = new RegExp(`\\b${escapeRegex(lowerKeyword)}\\b`, 'i');
      if (regex.test(text)) {
        matchedKeywords.push(keyword);
      }
    }
  }

  return {
    matched: matchedKeywords.length > 0,
    matchedKeywords
  };
}

/**
 * Escape special regex characters
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Categorize a quote by topics
 * @param {string} quoteText - The quote text
 * @param {Object} topics - Topics object from categories
 * @returns {Array<{id: string, label: string, matchedKeywords: string[], color: string}>}
 */
function categorizeByTopics(quoteText, topics) {
  const matches = [];

  for (const [topicId, topicData] of Object.entries(topics)) {
    const result = matchKeywords(quoteText, topicData.keywords);
    if (result.matched) {
      matches.push({
        id: topicId,
        type: 'topic',
        label: topicData.label,
        matchedKeywords: result.matchedKeywords,
        color: topicData.color
      });
    }
  }

  return matches;
}

/**
 * Categorize a quote by rhetoric patterns
 * @param {string} quoteText - The quote text
 * @param {Object} rhetoric - Rhetoric object from categories
 * @returns {Array<{id: string, label: string, matchedKeywords: string[], severity: string, color: string}>}
 */
function categorizeByRhetoric(quoteText, rhetoric) {
  const matches = [];

  for (const [rhetoricId, rhetoricData] of Object.entries(rhetoric)) {
    const result = matchKeywords(quoteText, rhetoricData.keywords);
    if (result.matched) {
      matches.push({
        id: rhetoricId,
        type: 'rhetoric',
        label: rhetoricData.label,
        description: rhetoricData.description,
        matchedKeywords: result.matchedKeywords,
        severity: rhetoricData.severity,
        color: rhetoricData.color
      });
    }
  }

  return matches;
}

/**
 * Main categorization function
 * @param {string} quoteText - The quote text to categorize
 * @param {Object} options - Options
 * @param {string} options.categoriesPath - Custom path to categories.json
 * @param {boolean} options.includeContext - Include surrounding context in matching
 * @returns {Array<string>} - Array of category IDs (both topics and rhetoric)
 */
function categorize(quoteText, options = {}) {
  const { categoriesPath = null } = options;

  if (!quoteText || typeof quoteText !== 'string') {
    return [];
  }

  const categories = loadCategories(categoriesPath);
  const categoryIds = [];

  // Match topics
  const topicMatches = categorizeByTopics(quoteText, categories.topics || {});
  for (const match of topicMatches) {
    categoryIds.push(match.id);
  }

  // Match rhetoric patterns
  const rhetoricMatches = categorizeByRhetoric(quoteText, categories.rhetoric || {});
  for (const match of rhetoricMatches) {
    categoryIds.push(match.id);
  }

  return categoryIds;
}

/**
 * Get detailed categorization results
 * @param {string} quoteText - The quote text to categorize
 * @param {Object} options - Options
 * @returns {Object} - Detailed categorization with topics and rhetoric
 */
function categorizeDetailed(quoteText, options = {}) {
  const { categoriesPath = null } = options;

  if (!quoteText || typeof quoteText !== 'string') {
    return { topics: [], rhetoric: [], allIds: [] };
  }

  const categories = loadCategories(categoriesPath);

  const topics = categorizeByTopics(quoteText, categories.topics || {});
  const rhetoric = categorizeByRhetoric(quoteText, categories.rhetoric || {});

  return {
    topics,
    rhetoric,
    allIds: [...topics.map(t => t.id), ...rhetoric.map(r => r.id)],
    // Calculate overall severity based on rhetoric matches
    overallSeverity: calculateOverallSeverity(rhetoric)
  };
}

/**
 * Calculate overall severity from rhetoric matches
 * @param {Array} rhetoricMatches
 * @returns {string|null}
 */
function calculateOverallSeverity(rhetoricMatches) {
  if (rhetoricMatches.length === 0) return null;

  const severityOrder = ['high', 'medium', 'low'];
  let highestSeverity = null;

  for (const match of rhetoricMatches) {
    if (!highestSeverity || severityOrder.indexOf(match.severity) < severityOrder.indexOf(highestSeverity)) {
      highestSeverity = match.severity;
    }
  }

  return highestSeverity;
}

/**
 * Get category metadata by ID
 * @param {string} categoryId - Category ID
 * @returns {Object|null} - Category metadata or null
 */
function getCategoryById(categoryId) {
  const categories = loadCategories();

  if (categories.topics && categories.topics[categoryId]) {
    return { ...categories.topics[categoryId], type: 'topic', id: categoryId };
  }

  if (categories.rhetoric && categories.rhetoric[categoryId]) {
    return { ...categories.rhetoric[categoryId], type: 'rhetoric', id: categoryId };
  }

  return null;
}

/**
 * Get all available categories
 * @returns {Object} - All categories organized by type
 */
function getAllCategories() {
  const categories = loadCategories();
  return {
    topics: Object.keys(categories.topics || {}),
    rhetoric: Object.keys(categories.rhetoric || {}),
    all: [
      ...Object.keys(categories.topics || {}),
      ...Object.keys(categories.rhetoric || {})
    ]
  };
}

module.exports = {
  categorize,
  categorizeDetailed,
  categorizeByTopics,
  categorizeByRhetoric,
  getCategoryById,
  getAllCategories,
  loadCategories,
  clearCache,
  matchKeywords
};
