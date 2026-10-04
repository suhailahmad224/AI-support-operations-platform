const AIProviderInterface = require('./aiProviderInterface');

/**
 * Deterministic Mock AI Provider
 * Provides repeatable, rule-based AI intelligence without external API calls or keys.
 */
class MockAiProvider extends AIProviderInterface {
  constructor() {
    super('mock-ai-provider');
  }

  /**
   * Analyze ticket content deterministically
   */
  async analyzeTicket({ title = '', description = '' }) {
    const combinedText = `${title} ${description}`.toLowerCase();

    // 1. Category Detection (Technical fault keywords take high priority)
    let suggestedCategory = 'general';
    let intent = 'GENERAL_CUSTOMER_SUPPORT';
    let baseTags = ['support'];

    if (
      combinedText.includes('504') ||
      combinedText.includes('500') ||
      combinedText.includes('404') ||
      combinedText.includes('timeout') ||
      combinedText.includes('crash') ||
      combinedText.includes('gateway') ||
      combinedText.includes('bug') ||
      combinedText.includes('error') ||
      combinedText.includes('latency') ||
      combinedText.includes('downtime')
    ) {
      suggestedCategory = 'technical';
      intent = 'SYSTEM_TECHNICAL_FAULT';
      baseTags = ['technical', 'bug', 'system-error'];
    } else if (
      combinedText.includes('invoice') ||
      combinedText.includes('bill') ||
      combinedText.includes('charge') ||
      combinedText.includes('refund') ||
      combinedText.includes('payment') ||
      combinedText.includes('stripe') ||
      combinedText.includes('subscription')
    ) {
      suggestedCategory = 'billing';
      intent = 'BILLING_PAYMENT_INQUIRY';
      baseTags = ['billing', 'finance', 'payment'];
    } else if (
      combinedText.includes('password') ||
      combinedText.includes('login') ||
      combinedText.includes('2fa') ||
      combinedText.includes('auth') ||
      combinedText.includes('permission') ||
      combinedText.includes('access')
    ) {
      suggestedCategory = 'account';
      intent = 'ACCOUNT_ACCESS_SECURITY';
      baseTags = ['account', 'security', 'credentials'];
    } else if (
      combinedText.includes('feature') ||
      combinedText.includes('request') ||
      combinedText.includes('suggest') ||
      combinedText.includes('enhance') ||
      combinedText.includes('add support for')
    ) {
      suggestedCategory = 'feature_request';
      intent = 'PRODUCT_FEATURE_REQUEST';
      baseTags = ['product', 'enhancement'];
    }

    // 2. Priority Detection
    let suggestedPriority = 'MEDIUM';
    if (
      combinedText.includes('urgent') ||
      combinedText.includes('critical') ||
      combinedText.includes('outage') ||
      combinedText.includes('production down') ||
      combinedText.includes('immediately') ||
      combinedText.includes('blocked')
    ) {
      suggestedPriority = 'URGENT';
    } else if (
      combinedText.includes('high') ||
      combinedText.includes('timeout') ||
      combinedText.includes('fail') ||
      combinedText.includes('cannot checkout') ||
      combinedText.includes('charge error')
    ) {
      suggestedPriority = 'HIGH';
    } else if (
      combinedText.includes('minor') ||
      combinedText.includes('typo') ||
      combinedText.includes('low') ||
      combinedText.includes('question')
    ) {
      suggestedPriority = 'LOW';
    }

    // 3. Sentiment Analysis
    let sentiment = 'NEUTRAL';
    if (
      combinedText.includes('unacceptable') ||
      combinedText.includes('angry') ||
      combinedText.includes('terrible') ||
      combinedText.includes('worst') ||
      combinedText.includes('ridiculous') ||
      combinedText.includes('frustrated') ||
      combinedText.includes('furious') ||
      combinedText.includes('outraged')
    ) {
      sentiment = 'FRUSTRATED';
    } else if (
      combinedText.includes('not working') ||
      combinedText.includes('failed') ||
      combinedText.includes('broken') ||
      combinedText.includes('issue') ||
      combinedText.includes('problem')
    ) {
      sentiment = 'NEGATIVE';
    } else if (
      combinedText.includes('thanks') ||
      combinedText.includes('thank you') ||
      combinedText.includes('appreciate') ||
      combinedText.includes('great')
    ) {
      sentiment = 'POSITIVE';
    }

    // 4. Concise Executive Summary
    const cleanTitle = title.trim();
    let summary = `Customer reported: "${cleanTitle}".`;
    if (suggestedCategory === 'technical') {
      summary = `Technical disruption reported regarding "${cleanTitle}". Customer encounters system errors or operational latency.`;
    } else if (suggestedCategory === 'billing') {
      summary = `Customer submitted financial inquiry regarding "${cleanTitle}". Awaiting invoice or transaction verification.`;
    } else if (suggestedCategory === 'account') {
      summary = `Account authentication request: "${cleanTitle}". User requires verification or credential recovery.`;
    } else if (suggestedCategory === 'feature_request') {
      summary = `Product feature request for "${cleanTitle}". Customer suggests platform capability expansion.`;
    }

    return {
      suggestedCategory,
      suggestedPriority,
      sentiment,
      intent,
      summary,
      tags: baseTags,
      confidence: 0.94,
    };
  }

  /**
   * Generate suggested reply based on ticket context and conversation
   */
  async generateSuggestedReply({ ticket, messages = [], requester = {} }) {
    const customerName = requester?.name || ticket?.customer?.name || 'Customer';
    const category = ticket?.category || 'general';
    const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    let draftReply = '';
    let rationale = '';

    switch (category) {
      case 'billing':
        draftReply =
          `Hello ${customerName},\n\n` +
          `Thank you for reaching out regarding your billing inquiry for ticket ${ticket.ticketId}.\n\n` +
          `I have reviewed our payment records and verified your transaction status. Our finance team is preparing your requested statement, which will be sent to your account email shortly.\n\n` +
          `Please let us know if you have any additional questions in the meantime.\n\n` +
          `Best regards,\nSupport Operations`;
        rationale =
          'Generated polite billing acknowledgment with transaction review verification and proactive follow-up.';
        break;

      case 'technical':
        draftReply =
          `Hello ${customerName},\n\n` +
          `Thank you for reporting this technical issue regarding "${ticket.title}".\n\n` +
          `Our engineering team has inspected the error diagnostics. We are currently addressing the root cause to restore full service stability. In the meantime, please try refreshing your session or clearing your browser cache.\n\n` +
          `We will keep this ticket updated as soon as the patch is deployed.\n\n` +
          `Best regards,\nTechnical Support Team`;
        rationale =
          'Generated technical incident response with troubleshooting guidance and engineering triage status.';
        break;

      case 'account':
        draftReply =
          `Hello ${customerName},\n\n` +
          `Thank you for contacting us regarding your account security inquiry for ticket ${ticket.ticketId}.\n\n` +
          `We take account security very seriously. We have verified your account status and sent a secure verification link to your registered email address.\n\n` +
          `Please follow the instructions in that email to proceed safely.\n\n` +
          `Best regards,\nSecurity & Support Operations`;
        rationale =
          'Generated secure account authentication response directing user to verified recovery steps.';
        break;

      case 'feature_request':
        draftReply =
          `Hello ${customerName},\n\n` +
          `Thank you for your valuable feedback and feature suggestion regarding "${ticket.title}".\n\n` +
          `We have documented this request in our product backlog for our engineering and design teams to review for upcoming releases.\n\n` +
          `We appreciate you helping us improve the platform!\n\n` +
          `Best regards,\nProduct Support Team`;
        rationale =
          'Generated standard product feedback acknowledgment noting logging in product backlog.';
        break;

      default:
        draftReply =
          `Hello ${customerName},\n\n` +
          `Thank you for reaching out to our support team for ticket ${ticket.ticketId}.\n\n` +
          `We are actively reviewing the details you provided regarding "${ticket.title}" and will provide a complete update as soon as possible.\n\n` +
          `Best regards,\nCustomer Support Team`;
        rationale =
          'Generated courteous general inquiry reply confirming ticket investigation.';
        break;
    }

    // If there was a recent customer message, append a tailored note
    if (latestMessage && latestMessage.senderRole === 'customer') {
      const msgSnippet = latestMessage.message.trim();
      if (msgSnippet.length > 5 && msgSnippet.length < 80) {
        draftReply += `\n\n(Regarding your note: "${msgSnippet}" - we have accounted for this in our review.)`;
      }
    }

    return {
      suggestedReply: draftReply,
      rationale,
      confidence: 0.91,
    };
  }

  /**
   * Grounded Question-Answering using Retrieved Knowledge Chunks (RAG)
   */
  async answerKnowledgeQuery({ query = '', retrievedChunks = [] }) {
    const cleanQuery = String(query).trim();

    // 1. Fallback when knowledge base lacks relevant sources
    if (!retrievedChunks || retrievedChunks.length === 0) {
      return {
        answer:
          "I couldn't find any relevant information in the knowledge base to answer your question. " +
          "Please verify your search keywords, browse our published documentation categories, " +
          "or submit a support ticket if you require specialized assistance.",
        confidence: 0.2,
        hasSufficientContext: false,
        sources: [],
      };
    }

    // 2. Format deduplicated source citations
    const seenSlugs = new Set();
    const sources = [];

    for (const chunk of retrievedChunks) {
      if (!seenSlugs.has(chunk.articleSlug)) {
        seenSlugs.add(chunk.articleSlug);
        sources.push({
          title: chunk.articleTitle,
          slug: chunk.articleSlug,
          category: chunk.category,
          excerpt: chunk.content.length > 180 ? `${chunk.content.substring(0, 180)}...` : chunk.content,
        });
      }
    }

    // 3. Deterministic response synthesis based on retrieved chunks
    const primarySource = sources[0] || { title: 'Documentation', excerpt: '' };
    const primaryChunk = retrievedChunks[0];

    // Build synthesized answer referencing retrieved knowledge
    const answer =
      `Based on the platform knowledge article "${primarySource.title}":\n\n` +
      `${primaryChunk.content.trim()}\n\n` +
      (retrievedChunks.length > 1
        ? `Additionally, related guidelines specify: ${retrievedChunks[1].content.trim().substring(0, 220)}...\n\n`
        : '') +
      `For complete step-by-step instructions, please consult the referenced article: "${primarySource.title}".`;

    return {
      answer,
      confidence: 0.94,
      hasSufficientContext: true,
      sources,
    };
  }
}

module.exports = new MockAiProvider();
