// Rule 3: Multi-day summer events: Runner pays full fee
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config/ruleConfig.json');

let ruleName = 'Runner Pays Full for Summer Period Events (Config Error)';
let ruleDescription = 'Runner pays the full start fee for events during a configurable summer period. (Error reading config)';
let summerStartDate = null;
let summerEndDate = null;

const loadSummerRuleConfig = () => {
  try {
    const configFile = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configFile);
    if (config && config.summerEventFee && config.summerEventFee.startDate && config.summerEventFee.endDate) {
      summerStartDate = config.summerEventFee.startDate;
      summerEndDate = config.summerEventFee.endDate;
      // Use full YYYY-MM-DD for display
      ruleName = `Runner Pays Full for Summer Period Events (${summerStartDate} - ${summerEndDate})`;
      ruleDescription = `Runner pays the full start fee for events during the summer period (${summerStartDate} - ${summerEndDate}).`;
    } else {
      console.error('Summer Event Fee config is missing or incomplete in ruleConfig.json');
    }
  } catch (error) {
    console.error('Error reading or parsing ruleConfig.json for Summer Event Fee:', error);
  }
};

loadSummerRuleConfig(); // Load config when module is initialized/reloaded

module.exports = {
  priority: 35,
  name: ruleName,
  description: ruleDescription,
  condition: (participation) => {
    if (!summerStartDate || !summerEndDate || !participation.CompetitionDate) {
      return false;
    }
    // Ensure dates are compared correctly. CompetitionDate is expected as YYYY-MM-DD.
    // The config dates are also YYYY-MM-DD.
    // Direct string comparison works for YYYY-MM-DD format.
    const competitionDate = participation.CompetitionDate; // e.g., "2024-07-15"

    // Re-load config in case it changed since module initialization and this is a long-running server.
    // Note: ruleEngineService now reloads modules, so this specific reload might be redundant but ensures standalone correctness.
    loadSummerRuleConfig(); 

    return (
      competitionDate >= summerStartDate &&
      competitionDate <= summerEndDate &&
      participation.feeType === 'Standard Startavgift'
    );
  },
  action: (participation) => {
    return {
      runnerPays: participation.feeAmount,
      clubPays: 0,
    };
  },
};
