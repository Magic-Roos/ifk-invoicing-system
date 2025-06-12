import React, { useState, useEffect } from 'react';
import { DEFAULT_RULES, LOCAL_STORAGE_RULES_KEY } from './rulesConfig';
import { Box, Typography, TextField, Button, Paper, List, ListItem, ListItemText, Divider, CircularProgress, Alert } from '@mui/material';

interface OtherMembersFeeShareParameters {
  runnerPaysPercentage: number;
  maxRunnerPays: number;
}

interface SummerEventFeeParameters {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

interface Rule {
  id: string;
  name: string;
  description: string;
  priority: number;
  parameters?: OtherMembersFeeShareParameters | SummerEventFeeParameters;
}

interface RuleEditorProps {
  onClose: () => void;
  onRuleChangeAndRecalculate?: () => void; 
}

// DEFAULT_RULES and LOCAL_STORAGE_RULES_KEY are now imported from rulesConfig.ts

const RuleEditor: React.FC<RuleEditorProps> = ({ onClose, onRuleChangeAndRecalculate }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  // setLoading and setError are no longer needed for API calls, but can be kept if desired for other async ops or future use.
  // For now, we'll simplify and remove them as primary load state is synchronous from localStorage.
  // const [loading, setLoading] = useState<boolean>(false); // Default to false
  // const [error, setError] = useState<string | null>(null);
  
  // States for the editable rule (Other Members Fee Share)
  const [editableRuleId] = useState<string>('other_members_fee_share');
  const [currentPercentage, setCurrentPercentage] = useState<string>('');
  const [currentMaxAmount, setCurrentMaxAmount] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<{ message: string, severity: 'success' | 'error' } | null>(null);

  // States for the Summer Event Fee rule
  const [editableSummerRuleId] = useState<string>('summer_event_fee');
  const [summerStartDate, setSummerStartDate] = useState<string>('');
  const [summerEndDate, setSummerEndDate] = useState<string>('');
  const [summerSaveStatus, setSummerSaveStatus] = useState<{ message: string, severity: 'success' | 'error' } | null>(null);

  const loadAndSetRules = React.useCallback(() => {
    let loadedRules: Rule[] = DEFAULT_RULES;
    try {
      const storedRules = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
      if (storedRules) {
        const parsedRules: Rule[] = JSON.parse(storedRules);
        // Basic validation: check if it's an array and has expected structure for key rules
        if (Array.isArray(parsedRules) && parsedRules.every(r => r.id && r.name)) {
          // Further ensure essential editable rules exist, or merge defaults
          // This merge logic can be sophisticated, for now, we'll assume stored is mostly good or use defaults if not.
          // A simple strategy: if essential editable rules are missing from storage, revert to full defaults.
          const hasOtherMembersRule = parsedRules.find(r => r.id === editableRuleId);
          const hasSummerRule = parsedRules.find(r => r.id === editableSummerRuleId);
          if (hasOtherMembersRule && hasSummerRule) {
            loadedRules = parsedRules;
          } else {
            // Stored data is incomplete for editable rules, use defaults and save them
            console.warn('Stored rules incomplete, reverting to defaults.');
            localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(DEFAULT_RULES));
            loadedRules = DEFAULT_RULES; 
          }
        } else {
          console.warn('Invalid rules structure in localStorage, using defaults.');
          localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(DEFAULT_RULES));
        }
      } else {
        // No rules in localStorage, use defaults and save them
        localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(DEFAULT_RULES));
      }
    } catch (error) {
      console.error('Error loading rules from localStorage, using defaults:', error);
      localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(DEFAULT_RULES)); // Save defaults if error
      loadedRules = DEFAULT_RULES; // Ensure loadedRules is set
    }
    setRules(loadedRules);

    // Populate form fields from loaded rules
    const otherMembersRule = loadedRules.find(r => r.id === editableRuleId);
    if (otherMembersRule && otherMembersRule.parameters && 'runnerPaysPercentage' in otherMembersRule.parameters) {
      setCurrentPercentage(((otherMembersRule.parameters as OtherMembersFeeShareParameters).runnerPaysPercentage * 100).toString());
      setCurrentMaxAmount((otherMembersRule.parameters as OtherMembersFeeShareParameters).maxRunnerPays.toString());
    }

    const summerRule = loadedRules.find(r => r.id === editableSummerRuleId);
    if (summerRule && summerRule.parameters && 'startDate' in summerRule.parameters) {
      setSummerStartDate((summerRule.parameters as SummerEventFeeParameters).startDate);
      setSummerEndDate((summerRule.parameters as SummerEventFeeParameters).endDate);
    }
  }, [editableRuleId, editableSummerRuleId]);

  useEffect(() => {
    loadAndSetRules();
  }, [loadAndSetRules]);


  const handleSave = () => { // No longer async
    setSaveStatus(null);
    const percentage = parseFloat(currentPercentage) / 100;
    const maxAmount = parseFloat(currentMaxAmount);

    if (isNaN(percentage) || percentage < 0 || percentage > 1) {
      setSaveStatus({ message: 'Felaktig procent. Skriv ett tal mellan 0 och 100.', severity: 'error' });
      return;
    }
    if (isNaN(maxAmount) || maxAmount < 0) {
      setSaveStatus({ message: 'Felaktigt maxbelopp. Skriv ett tal som är noll eller högre.', severity: 'error' });
      return;
    }

    const updatedRules = rules.map(rule => {
      if (rule.id === editableRuleId) {
        const newName = `Other Members Fee Share (${(percentage * 100).toFixed(0)}%, max ${maxAmount} SEK)`;
        const newDescription = `For standard start fees, other members pay ${(percentage * 100).toFixed(0)}% of the fee, up to a maximum of ${maxAmount} SEK. The club pays the rest.`;
        return {
          ...rule,
          name: newName,
          description: newDescription,
          parameters: { runnerPaysPercentage: percentage, maxRunnerPays: maxAmount },
        };
      }
      return rule;
    });
    setRules(updatedRules);
    localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(updatedRules));
    setSaveStatus({ message: 'Regeln har sparats lokalt!', severity: 'success' });
    if (onRuleChangeAndRecalculate) {
      onRuleChangeAndRecalculate();
    }
    // No catch block needed for direct state/localStorage update unless JSON.stringify fails (highly unlikely for this data)
  };

  // Loading and error states for API calls are removed.
  // The component now loads synchronously from localStorage or defaults.
  // If an error occurs during localStorage parsing, a console warning is shown, and defaults are used.
  // A more sophisticated UI for localStorage errors could be added if necessary.

  const handleSaveSummerRule = () => { // No longer async
    setSummerSaveStatus(null);

    if (!summerStartDate || !summerEndDate) {
      setSummerSaveStatus({ message: 'Du måste fylla i både startdatum och slutdatum.', severity: 'error' });
      return;
    }
    if (new Date(summerStartDate) > new Date(summerEndDate)) {
      setSummerSaveStatus({ message: 'Startdatumet måste vara före eller samma dag som slutdatumet.', severity: 'error' });
      return;
    }

    const updatedRules = rules.map(rule => {
      if (rule.id === editableSummerRuleId) {
        const newName = `Runner Pays Full for Summer Period Events (${summerStartDate} - ${summerEndDate})`;
        const newDescription = `Runner pays the full start fee for events during the summer period (${summerStartDate} - ${summerEndDate}).`;
        return {
          ...rule,
          name: newName,
          description: newDescription,
          parameters: { startDate: summerStartDate, endDate: summerEndDate },
        };
      }
      return rule;
    });
    setRules(updatedRules);
    localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(updatedRules));
    setSummerSaveStatus({ message: 'Sommarperiodens datum har sparats lokalt!', severity: 'success' });
    if (onRuleChangeAndRecalculate) {
      onRuleChangeAndRecalculate();
    }
    // No catch block needed for direct state/localStorage update
  };

  const otherMembersRuleDetails = rules.find(r => r.id === editableRuleId);
  const summerEventRuleDetails = rules.find(r => r.id === editableSummerRuleId);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom component="div">
          Inställningar för tävlingsavgifter
        </Typography>
        <Button variant="outlined" onClick={onClose}>Stäng inställningar</Button>
      </Box>

      {/* Edit Other Members Fee Share Rule */}
      {otherMembersRuleDetails && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6">Inställningar för: {otherMembersRuleDetails.name}</Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>{otherMembersRuleDetails.description}</Typography>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              label="Löparens andel av startavgiften (%)"
              type="number"
              value={currentPercentage}
              onChange={(e) => setCurrentPercentage(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              helperText="Hur många procent av startavgiften ska löparen betala själv? (t.ex. 60 för 60%)"
            />
            <TextField
              label="Maximalt belopp löparen betalar (kr)"
              type="number"
              value={currentMaxAmount}
              onChange={(e) => setCurrentMaxAmount(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              helperText="Vad är det högsta beloppet i kronor som löparen ska betala? (t.ex. 120)"
            />
            <Button variant="contained" onClick={handleSave}>
              Spara inställningar för "{otherMembersRuleDetails.name}"
            </Button>
            {saveStatus && (
              <Alert severity={saveStatus.severity} sx={{ mt: 2 }}>
                {saveStatus.message}
              </Alert>
            )}
          </Box>
        </Paper>
      )}

      {/* Edit Summer Event Fee Rule */}
      {summerEventRuleDetails && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6">Inställningar för: {summerEventRuleDetails.name}</Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>{summerEventRuleDetails.description}</Typography>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              label="Startdatum för perioden"
              type="date"
              value={summerStartDate}
              onChange={(e) => setSummerStartDate(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Första dagen då denna regel gäller (format ÅÅÅÅ-MM-DD)."
            />
            <TextField
              label="Slutdatum för perioden"
              type="date"
              value={summerEndDate}
              onChange={(e) => setSummerEndDate(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Sista dagen då denna regel gäller (format ÅÅÅÅ-MM-DD)."
            />
            <Button variant="contained" onClick={handleSaveSummerRule}>
              Spara inställningar för "{summerEventRuleDetails.name}"
            </Button>
            {summerSaveStatus && (
              <Alert severity={summerSaveStatus.severity} sx={{ mt: 2 }}>
                {summerSaveStatus.message}
              </Alert>
            )}
          </Box>
        </Paper>
      )}

      <Typography variant="h5" gutterBottom sx={{mt: 4}}>
        Alla Regler
      </Typography>
      <List component={Paper}>
        {rules.map((rule, index) => (
          <React.Fragment key={rule.id}>
            <ListItem alignItems="flex-start">
              <ListItemText
                primary={`${rule.name} (Prioritet: ${rule.priority})`}
                secondary={rule.description}
              />
            </ListItem>
            {index < rules.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default RuleEditor;
