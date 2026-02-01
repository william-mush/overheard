/**
 * Analysis Pipeline - Main Entry Point
 * Re-exports all analysis modules
 */

const quoteExtractor = require('./quoteExtractor');
const categorizer = require('./categorizer');
const factChecker = require('./factChecker');
const contradictionFinder = require('./contradictionFinder');

module.exports = {
  // Quote extraction
  extractQuotes: quoteExtractor.extractQuotes,
  mergeAdjacentQuotes: quoteExtractor.mergeAdjacentQuotes,

  // Categorization
  categorize: categorizer.categorize,
  categorizeDetailed: categorizer.categorizeDetailed,
  getCategoryById: categorizer.getCategoryById,
  getAllCategories: categorizer.getAllCategories,

  // Fact checking
  checkFact: factChecker.checkFact,
  checkFactBatch: factChecker.checkFactBatch,
  getRatingMetadata: factChecker.getRatingMetadata,

  // Contradiction finding
  findContradictions: contradictionFinder.findContradictions,
  findAllContradictions: contradictionFinder.findAllContradictions,

  // Full module access
  quoteExtractor,
  categorizer,
  factChecker,
  contradictionFinder
};
