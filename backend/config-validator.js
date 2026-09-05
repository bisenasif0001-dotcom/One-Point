/**
 * EROS Configuration Registry Schema Validator
 * Enforces schema integrity for default_config, state_config, and branch_config files.
 */
const fs = require('fs');
const path = require('path');

class ConfigValidator {
  constructor() {
    this.schemaPath = path.join(__dirname, 'config', 'branch_config.schema.json');
  }

  // Lightweight JSON Schema validator that checks basic type and required properties
  validateBranchConfig(config) {
    const errors = [];

    // Verify root properties
    const requiredRoot = ['branchMetadata', 'contact', 'featureFlags'];
    for (const prop of requiredRoot) {
      if (!config[prop]) {
        errors.push(`Missing required root property: ${prop}`);
        continue;
      }
    }

    if (config.branchMetadata) {
      const meta = config.branchMetadata;
      if (!meta.id || typeof meta.id !== 'string') errors.push('branchMetadata.id must be a string');
      if (!meta.city || typeof meta.city !== 'string') errors.push('branchMetadata.city must be a string');
      if (!meta.locality || typeof meta.locality !== 'string') errors.push('branchMetadata.locality must be a string');
      if (!meta.cscId || typeof meta.cscId !== 'string') errors.push('branchMetadata.cscId must be a string');
    }

    if (config.contact) {
      const contact = config.contact;
      if (!contact.address || typeof contact.address !== 'string') errors.push('contact.address must be a string');
      if (!contact.phone || typeof contact.phone !== 'string') errors.push('contact.phone must be a string');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new ConfigValidator();
