/**
 * Standard AI Provider Abstract Interface
 * Any AI Provider (Mock, Google Gemini, Groq, Anthropic, etc.) must implement this contract.
 */
class AIProviderInterface {
  constructor(name = 'base-ai-provider') {
    this.name = name;
  }

  /**
   * Analyze ticket content (title, description)
   * @param {Object} ticketData
   * @param {string} ticketData.title
   * @param {string} ticketData.description
   * @param {string} [ticketData.category]
   * @param {string} [ticketData.priority]
   * @returns {Promise<{
   *   suggestedCategory: string,
   *   suggestedPriority: string,
   *   sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'FRUSTRATED',
   *   intent: string,
   *   summary: string,
   *   tags: string[],
   *   confidence: number
   * }>}
   */
  async analyzeTicket(ticketData) {
    throw new Error(`analyzeTicket() not implemented in ${this.name}`);
  }

  /**
   * Generate contextual reply suggestion
   * @param {Object} context
   * @param {Object} context.ticket
   * @param {Array} context.messages
   * @param {Object} context.requester
   * @returns {Promise<{
   *   suggestedReply: string,
   *   rationale: string,
   *   confidence: number
   * }>}
   */
  async generateSuggestedReply(context) {
    throw new Error(`generateSuggestedReply() not implemented in ${this.name}`);
  }

  /**
   * Answer a user question grounded in retrieved knowledge base chunks (RAG)
   * @param {Object} context
   * @param {string} context.query - User question
   * @param {Array} context.retrievedChunks - Retrieved relevant knowledge passages
   * @returns {Promise<{
   *   answer: string,
   *   confidence: number,
   *   hasSufficientContext: boolean,
   *   sources: Array<{ title: string, slug: string, category: string, excerpt: string }>
   * }>}
   */
  async answerKnowledgeQuery(context) {
    throw new Error(`answerKnowledgeQuery() not implemented in ${this.name}`);
  }
}

module.exports = AIProviderInterface;
