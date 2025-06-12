const fs = require('fs');
const path = require('path');

// Load configuration for this rule
let ruleConfig;
let MAX_RUNNER_PAYS = 120; // Default value
let RUNNER_PAYS_PERCENTAGE = 0.6; // Default value

try {
  const configPath = path.join(__dirname, '../config/ruleConfig.json');
  const configFile = fs.readFileSync(configPath, 'utf8');
  ruleConfig = JSON.parse(configFile);
  if (ruleConfig && ruleConfig.otherMembersFeeShare) {
    MAX_RUNNER_PAYS = ruleConfig.otherMembersFeeShare.maxRunnerPays;
    RUNNER_PAYS_PERCENTAGE = ruleConfig.otherMembersFeeShare.runnerPaysPercentage;
  }
} catch (error) {
  console.error('Error loading rule_other_members_fee_share config:', error);
  // Keep default values if config loading fails
}

module.exports = {
  priority: 100,
  name: `Other Members Fee Share (${(RUNNER_PAYS_PERCENTAGE * 100).toFixed(0)}%, max ${MAX_RUNNER_PAYS} SEK)`,
  description: `For standard start fees, other members pay ${(RUNNER_PAYS_PERCENTAGE * 100).toFixed(0)}% of the fee, up to a maximum of ${MAX_RUNNER_PAYS} SEK. The club pays the rest.`,
  condition: (participation) => {
    // This rule is a more general rule and should apply if no other specific rule has handled the 'Standard' fee.
    // The rule engine's logic (breaking on first match) means this rule should be ordered after more specific ones.
    // It applies to standard start fees.
    return participation.feeType === 'Standard Startavgift';
  },
  action: (participation) => {
    // Re-read config in case it changed since server start, or use cached values
    // For a more robust solution, consider a config service that can be refreshed
    let currentMaxRunnerPays = MAX_RUNNER_PAYS;
    let currentRunnerPaysPercentage = RUNNER_PAYS_PERCENTAGE;
    try {
      const configPath = path.join(__dirname, '../config/ruleConfig.json');
      const configFile = fs.readFileSync(configPath, 'utf8');
      const liveConfig = JSON.parse(configFile);
      if (liveConfig && liveConfig.otherMembersFeeShare) {
        currentMaxRunnerPays = liveConfig.otherMembersFeeShare.maxRunnerPays;
        currentRunnerPaysPercentage = liveConfig.otherMembersFeeShare.runnerPaysPercentage;
      }
    } catch (error) {
      // Silently use cached/default values if live reading fails during action
    }

    let runnerPays = participation.feeAmount * currentRunnerPaysPercentage;
    if (runnerPays > currentMaxRunnerPays) {
      runnerPays = currentMaxRunnerPays;
    }
    const clubPays = participation.feeAmount - runnerPays;

    return {
      runnerPays: Math.round(runnerPays * 100) / 100, // Round to 2 decimal places
      clubPays: Math.round(clubPays * 100) / 100,     // Round to 2 decimal places
    };
  },
};
