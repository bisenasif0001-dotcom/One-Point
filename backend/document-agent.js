/**
 * EROS Document Verification Agent
 * Phase 16.1 Implementation
 */

class DocumentAgent {
  constructor() {
    this.name = "DocumentVerificationAgent";
  }

  async verifyDocument(metadata, documentHistory = []) {
    const errors = [];
    
    // 1. OCR checks
    if (!metadata.extractedFields || Object.keys(metadata.extractedFields).length === 0) {
      errors.push("Missing extracted OCR fields");
    }

    // 2. Blur detection
    if (metadata.blurScore > 0.6) {
      errors.push("High blur rating detected: document image unclear");
    }

    // 3. Duplicate checks
    const isDuplicate = documentHistory.some(doc => doc.checksum === metadata.checksum);
    if (isDuplicate) {
      errors.push("Duplicate file hash matching previously uploaded document");
    }

    // 4. Missing page checks
    if (metadata.totalPages < metadata.expectedPages) {
      errors.push(`Incomplete document file; expected ${metadata.expectedPages} pages but got ${metadata.totalPages}`);
    }

    const qualityScore = Math.max(0, 100 - (errors.length * 25) - (metadata.blurScore * 20));
    const valid = errors.length === 0;

    return {
      agent: this.name,
      valid,
      qualityScore,
      errors
    };
  }
}

module.exports = new DocumentAgent();
