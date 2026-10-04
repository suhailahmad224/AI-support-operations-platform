const Article = require('../../models/Article');
const logger = require('../../utils/logger');

/**
 * Stopwords set to filter out non-informative English tokens
 */
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
  'but', 'by', 'can', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t',
  'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t',
  'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
  'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll',
  'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t',
  'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that',
  'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these',
  'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve',
  'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while',
  'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d',
  'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenize and normalize query or passage text
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Lexical BM25 / TF-IDF Retrieval Service
 * 
 * DESIGN NOTE:
 * This service implements a deterministic lexical retrieval strategy using term frequency (TF),
 * inverse document frequency (IDF), and field bonuses (title/tag matches) across pre-chunked article passages.
 * It serves as a zero-external-dependency fallback when dense vector embeddings are not loaded.
 * 
 * LIMITATIONS:
 * - Requires lexical keyword overlap between query and knowledge chunks.
 * - Does not compute semantic cosine similarities for non-overlapping synonyms.
 * - Modular design: This service can be replaced with a VectorRetrieverService in future phases
 *   without altering any caller contracts.
 */
class RetrieverService {
  /**
   * Retrieve most relevant chunks across knowledge base articles
   * @param {string} query
   * @param {Object} options
   * @param {number} [options.topK=3]
   * @param {string} [options.category]
   * @param {boolean} [options.includeUnpublished=false]
   * @param {number} [options.minScoreThreshold=0.1]
   * @returns {Promise<Array<{
   *   chunkIndex: number,
   *   content: string,
   *   score: number,
   *   matchedTokens: string[],
   *   articleId: string,
   *   articleTitle: string,
   *   articleSlug: string,
   *   category: string,
   *   isPublished: boolean
   * }>>}
   */
  async retrieveRelevantChunks(query, options = {}) {
    const {
      topK = 3,
      category,
      includeUnpublished = false,
      minScoreThreshold = 0.1,
    } = options;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return [];
    }

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) {
      return [];
    }

    // Build article filter
    const filter = {};
    if (!includeUnpublished) {
      filter.isPublished = true;
    }
    if (category) {
      filter.category = category;
    }

    // Retrieve articles from DB
    const articles = await Article.find(filter)
      .select('title slug category tags isPublished chunks')
      .lean();

    if (!articles || articles.length === 0) {
      return [];
    }

    // Collect all chunks across matching articles
    const allChunks = [];
    const docFrequency = {}; // Number of chunks containing each token

    articles.forEach((article) => {
      const chunks = article.chunks && article.chunks.length > 0
        ? article.chunks
        : [{ chunkIndex: 0, content: article.title, charCount: article.title.length }];

      chunks.forEach((chunk) => {
        const chunkTokens = tokenize(chunk.content);
        const titleTokens = tokenize(article.title);
        const tagTokens = (article.tags || []).flatMap((t) => tokenize(t));

        const uniqueTokensInChunk = new Set([...chunkTokens, ...titleTokens, ...tagTokens]);

        uniqueTokensInChunk.forEach((token) => {
          docFrequency[token] = (docFrequency[token] || 0) + 1;
        });

        allChunks.push({
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          chunkTokens,
          titleTokens,
          tagTokens,
          articleId: article._id.toString(),
          articleTitle: article.title,
          articleSlug: article.slug,
          category: article.category,
          isPublished: article.isPublished,
        });
      });
    });

    const totalChunks = allChunks.length;
    if (totalChunks === 0) return [];

    // Calculate score for each chunk using BM25-style TF-IDF weighting
    const scoredChunks = [];

    for (const chunk of allChunks) {
      let score = 0;
      const matchedTokens = [];
      const totalWords = chunk.chunkTokens.length || 1;

      for (const token of queryTokens) {
        // Count occurrences in chunk
        const tfCount = chunk.chunkTokens.filter((t) => t === token).length;
        const inTitle = chunk.titleTokens.includes(token);
        const inTags = chunk.tagTokens.includes(token);

        if (tfCount > 0 || inTitle || inTags) {
          matchedTokens.push(token);

          // Inverse document frequency: log(1 + (N - df + 0.5) / (df + 0.5))
          const df = docFrequency[token] || 1;
          const idf = Math.log(1 + (totalChunks - df + 0.5) / (df + 0.5));

          // Term Frequency normalized
          const tf = tfCount / totalWords;

          // BM25 term weighting component
          let termScore = (tf * (2.2) / (tf + 1.2)) * (idf > 0 ? idf : 0.5);

          // Bonuses for high-signal matches in Title and Tags
          if (inTitle) termScore += 2.0;
          if (inTags) termScore += 1.0;

          score += termScore;
        }
      }

      if (matchedTokens.length > 0 && score >= minScoreThreshold) {
        scoredChunks.push({
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          score: Number(score.toFixed(4)),
          matchedTokens: Array.from(new Set(matchedTokens)),
          articleId: chunk.articleId,
          articleTitle: chunk.articleTitle,
          articleSlug: chunk.articleSlug,
          category: chunk.category,
          isPublished: chunk.isPublished,
        });
      }
    }

    // Sort by descending relevance score and return top-K
    scoredChunks.sort((a, b) => b.score - a.score);

    return scoredChunks.slice(0, topK);
  }
}

module.exports = new RetrieverService();
