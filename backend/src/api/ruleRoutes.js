const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();


const configPath = path.join(__dirname, '../config/ruleConfig.json');

// Helper function to read config
const readConfig = () => {
  try {
    const configFile = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configFile);
  } catch (error) {
    console.error('Error reading ruleConfig.json:', error);
    return null; // Or throw error, depending on desired error handling
  }
};

// Helper function to write config
const writeConfig = (config) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing ruleConfig.json:', error);
    // Or throw error
  }
};

// GET current settings for Other Members Fee Share rule
router.get('/other_members_fee_share', (req, res) => {
  const config = readConfig();
  if (config && config.otherMembersFeeShare) {
    res.json(config.otherMembersFeeShare);
  } else {
    res.status(500).json({ message: 'Could not read rule configuration.' });
  }
});

// PUT to update settings for Other Members Fee Share rule
router.put('/other_members_fee_share', (req, res) => {
  const { runnerPaysPercentage, maxRunnerPays } = req.body;

  if (typeof runnerPaysPercentage !== 'number' || typeof maxRunnerPays !== 'number') {
    return res.status(400).json({ message: 'Invalid input: runnerPaysPercentage and maxRunnerPays must be numbers.' });
  }
  if (runnerPaysPercentage < 0 || runnerPaysPercentage > 1) {
    return res.status(400).json({ message: 'Invalid input: runnerPaysPercentage must be between 0 and 1.' });
  }
  if (maxRunnerPays < 0) {
    return res.status(400).json({ message: 'Invalid input: maxRunnerPays must be a non-negative number.' });
  }

  const config = readConfig();
  if (!config) {
    return res.status(500).json({ message: 'Could not read rule configuration to update.' });
  }

  config.otherMembersFeeShare = {
    runnerPaysPercentage: parseFloat(runnerPaysPercentage.toFixed(4)), // Store with precision
    maxRunnerPays: parseFloat(maxRunnerPays.toFixed(2))
  };

  writeConfig(config);
  res.json({ message: 'Rule "Other Members Fee Share" updated successfully.', updatedSettings: config.otherMembersFeeShare });
});

// GET current settings for Summer Event Fee rule
router.get('/summer_event_fee', (req, res) => {
  const config = readConfig();
  if (config && config.summerEventFee) {
    res.json(config.summerEventFee);
  } else {
    res.status(500).json({ message: 'Could not read summer event fee rule configuration.' });
  }
});

// PUT to update settings for Summer Event Fee rule
router.put('/summer_event_fee', (req, res) => {
  const { startDate, endDate } = req.body;

  // Basic date validation (format YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return res.status(400).json({ message: 'Invalid input: startDate and endDate must be valid dates in YYYY-MM-DD format.' });
  }
  if (startDate > endDate) {
    return res.status(400).json({ message: 'Invalid input: startDate cannot be after endDate.' });
  }

  const config = readConfig();
  if (!config) {
    return res.status(500).json({ message: 'Could not read rule configuration to update.' });
  }

  config.summerEventFee = {
    startDate,
    endDate
  };

  writeConfig(config);
  // Reload the specific rule module to reflect name/description changes immediately if possible
  // This is more for other parts of the system; the rule itself reloads config on use.
  try {
    const ruleModulePath = path.join(__dirname, '../rules/rule_summer_event_fee.js');
    delete require.cache[require.resolve(ruleModulePath)];
    require(ruleModulePath);
  } catch (e) {
    console.warn('Could not reload summer_event_fee rule module after config change:', e.message);
  }

  res.json({ message: 'Rule "Summer Event Fee" updated successfully.', updatedSettings: config.summerEventFee });
});

// GET all rules with their names and descriptions
router.get('/', (req, res) => {

  const rulesDir = path.join(__dirname, '../rules');
  let rules = [];

  try {
    const files = fs.readdirSync(rulesDir);
    const ruleConfigData = readConfig(); // Read once for all rules

    files.forEach(file => {
      if (file.startsWith('rule_') && file.endsWith('.js')) {
        try {
          const ruleModulePath = path.join(rulesDir, file);
          // Clear cache for the rule file to get latest version if it was changed
          delete require.cache[require.resolve(ruleModulePath)]; 
          const rule = require(ruleModulePath);
          const ruleId = file.replace('rule_', '').replace('.js', '');
          
          let ruleData = {
            id: ruleId,
            name: rule.name,
            description: rule.description,
            priority: rule.priority
          };

          // If this is the configurable rule, add its current params
          if (ruleId === 'other_members_fee_share' && ruleConfigData && ruleConfigData.otherMembersFeeShare) {
            ruleData.parameters = ruleConfigData.otherMembersFeeShare;
          }
          // Add parameters for summer_event_fee rule
          if (ruleId === 'summer_event_fee' && ruleConfigData && ruleConfigData.summerEventFee) {
            ruleData.parameters = ruleConfigData.summerEventFee;
          }

          rules.push(ruleData);
        } catch (moduleError) {
          console.error(`Error loading rule module ${file}:`, moduleError);
        }
      }
    });

    // Sort rules by priority (lower number = higher priority)
    rules.sort((a, b) => (a.priority || Infinity) - (b.priority || Infinity));

    res.json(rules);
  } catch (dirError) {
    console.error('Error reading rules directory:', dirError);
    res.status(500).json({ message: 'Could not list rules.' });
  }
});

module.exports = router;
