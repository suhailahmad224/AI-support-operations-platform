/**
 * Content Chunker Utility
 * Breaks markdown or plain-text article content into contextual chunks
 * preserving paragraph and sentence boundaries for retrieval.
 */

/**
 * Split text into chunks with configurable target size and overlap
 * @param {string} text
 * @param {Object} options
 * @param {number} [options.chunkSize=450] - Target character count per chunk
 * @param {number} [options.overlap=60] - Overlap character count between chunks
 * @returns {Array<{ chunkIndex: number, content: string, charCount: number }>}
 */
function chunkText(text, options = {}) {
  const { chunkSize = 450, overlap = 60 } = options;

  if (!text || typeof text !== 'string') {
    return [];
  }

  const cleanText = text.trim();
  if (cleanText.length <= chunkSize) {
    return [
      {
        chunkIndex: 0,
        content: cleanText,
        charCount: cleanText.length,
      },
    ];
  }

  // Split into paragraphs first
  const paragraphs = cleanText.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    // If paragraph itself exceeds chunkSize, split by sentences
    if (trimmedPara.length > chunkSize) {
      const sentences = trimmedPara.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [trimmedPara];
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        if (currentChunk.length + trimmedSentence.length + 1 > chunkSize && currentChunk.length > 0) {
          chunks.push({
            chunkIndex: chunkIndex++,
            content: currentChunk.trim(),
            charCount: currentChunk.trim().length,
          });

          // Carry over overlap from the end of currentChunk
          const overlapText = currentChunk.slice(-overlap);
          currentChunk = `${overlapText} ${trimmedSentence}`;
        } else {
          currentChunk = currentChunk ? `${currentChunk} ${trimmedSentence}` : trimmedSentence;
        }
      }
    } else {
      if (currentChunk.length + trimmedPara.length + 2 > chunkSize && currentChunk.length > 0) {
        chunks.push({
          chunkIndex: chunkIndex++,
          content: currentChunk.trim(),
          charCount: currentChunk.trim().length,
        });

        const overlapText = currentChunk.slice(-overlap);
        currentChunk = `${overlapText}\n\n${trimmedPara}`;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      chunkIndex: chunkIndex++,
      content: currentChunk.trim(),
      charCount: currentChunk.trim().length,
    });
  }

  return chunks;
}

module.exports = {
  chunkText,
};
