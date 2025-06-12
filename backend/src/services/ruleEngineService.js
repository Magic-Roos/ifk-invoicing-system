// ruleEngineService.js

const fs = require('fs');
const path = require('path');

const rulesDir = path.join(__dirname, '../rules');
let loadedRules = [];

/**
 * Loads all rule modules from the '../rules' directory.
 */
const loadRules = () => {
  try {
    const ruleFiles = fs.readdirSync(rulesDir).filter(file => file.endsWith('.js'));
    const currentRules = ruleFiles.map(file => {
      const rulePath = path.join(rulesDir, file);
      try {
        delete require.cache[require.resolve(rulePath)]; // Clear cache
        const rule = require(rulePath); // Re-require
        if (typeof rule.name === 'string' && typeof rule.condition === 'function' && typeof rule.action === 'function' && typeof rule.priority === 'number') {

          return rule;
        }
        console.warn(`Skipping invalid rule file (missing name, condition, action, or priority): ${file}`);
        return null;
      } catch (error) {
        console.error(`Error loading rule from ${file}:`, error);
        return null;
      }
    }).filter(rule => rule !== null);

    // Sort rules by priority (ascending, lower number = higher priority)
    currentRules.sort((a, b) => a.priority - b.priority);

    return currentRules;
  } catch (error) {
    console.error('Error reading rules directory:', error);
    return []; // Ensure rules array is empty on error
  }
};

// Rules are now loaded on demand by applyInvoicingRules

/**
 * Applies invoicing rules to a list of participation records.
 * @param {Array<Object>} participations - Array of participation records.
 * Each record should contain details like: MemberName, Date, CompetitionName, FeeAmount, FeeType, MemberAge/Category.
 * @returns {Array<Object>} - Array of participations with billing decisions.
 */
const applyInvoicingRules = (participations) => {
  const activeRules = loadRules(); // Load rules on each call
  if (!participations || participations.length === 0) {
    return [];
  }

  const billingResults = participations.map((participation) => {
    // Ensure feeAmount is a number, default to 0 if not
    const feeAmount = typeof participation.feeAmount === 'number' ? participation.feeAmount : 0;

    let runnerPays = feeAmount; // Default: runner pays the full fee amount
    let clubPays = 0;
    let ruleAppliedThisTurn = null;

    for (const rule of activeRules) {
      try {
        if (rule.condition(participation)) {
          const result = rule.action(participation);
          runnerPays = typeof result.runnerPays === 'number' ? result.runnerPays : feeAmount;
          clubPays = typeof result.clubPays === 'number' ? result.clubPays : 0;
          ruleAppliedThisTurn = rule.name;

          break; // First matching rule determines the outcome for this version
        }
      } catch (error) {
        console.error(`Error applying rule '${rule.name}' to participation:`, participation, error);
        // Continue to next rule or default handling if a rule errors
      }
    }

    if (!ruleAppliedThisTurn) {
        ruleAppliedThisTurn = 'Default: Runner pays 100%';
    }

    return {
      ...participation,
      feeAmount: feeAmount, // Ensure feeAmount is part of the output
      runnerInvoiceAmount: runnerPays,
      clubPaysAmount: clubPays,
      appliedRule: ruleAppliedThisTurn,
    };
  });

  return billingResults;
};

module.exports = {
  applyInvoicingRules,
  // loadRules is now internal, getLoadedRules might not reflect the set used in the last applyInvoicingRules call directly
  // If inspection of rules as they would be loaded is needed, can expose loadRules or a new getter.
  // For now, removing getLoadedRules as its previous behavior is changed.
};
