import React, { useState, useEffect } from 'react';
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

const RuleEditor: React.FC<RuleEditorProps> = ({ onClose, onRuleChangeAndRecalculate }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
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

  const fetchRules = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/api/rules');
      if (!response.ok) {
        throw new Error(`Failed to fetch rules: ${response.statusText}`);
      }
      const data: Rule[] = await response.json();
      setRules(data);

      // Populate form fields for Other Members Fee Share rule
      const otherMembersRule = data.find(r => r.id === editableRuleId);
      if (otherMembersRule && otherMembersRule.parameters && 'runnerPaysPercentage' in otherMembersRule.parameters) {
        setCurrentPercentage(((otherMembersRule.parameters as OtherMembersFeeShareParameters).runnerPaysPercentage * 100).toString());
        setCurrentMaxAmount((otherMembersRule.parameters as OtherMembersFeeShareParameters).maxRunnerPays.toString());
      }

      // Populate form fields for Summer Event Fee rule
      const summerRule = data.find(r => r.id === editableSummerRuleId);
      if (summerRule && summerRule.parameters && 'startDate' in summerRule.parameters) {
        setSummerStartDate((summerRule.parameters as SummerEventFeeParameters).startDate);
        setSummerEndDate((summerRule.parameters as SummerEventFeeParameters).endDate);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [editableRuleId, editableSummerRuleId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);


  const handleSave = async () => {
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

    try {
      const response = await fetch(`http://localhost:3001/api/rules/${editableRuleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          runnerPaysPercentage: percentage,
          maxRunnerPays: maxAmount,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save rule');
      }
      setSaveStatus({ message: 'Regeln har sparats!', severity: 'success' });
      fetchRules(); 
      if (onRuleChangeAndRecalculate) {
        onRuleChangeAndRecalculate(); // Call the callback
      } 
    } catch (err) {
      setSaveStatus({ message: err instanceof Error ? err.message : 'Ett okänt fel inträffade vid sparning.', severity: 'error' });
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Kunde inte ladda regler: {error}</Alert>;
  }

  const handleSaveSummerRule = async () => {
    setSummerSaveStatus(null);

    if (!summerStartDate || !summerEndDate) {
      setSummerSaveStatus({ message: 'Du måste fylla i både startdatum och slutdatum.', severity: 'error' });
      return;
    }
    if (new Date(summerStartDate) > new Date(summerEndDate)) {
      setSummerSaveStatus({ message: 'Startdatumet måste vara före eller samma dag som slutdatumet.', severity: 'error' });
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/rules/${editableSummerRuleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: summerStartDate,
          endDate: summerEndDate,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save summer event fee rule');
      }
      setSummerSaveStatus({ message: 'Sommarperiodens datum har sparats!', severity: 'success' });
      fetchRules(); // Re-fetch rules to show updated name/description
      if (onRuleChangeAndRecalculate) {
        onRuleChangeAndRecalculate(); // Call the callback
      }
    } catch (err) {
      setSummerSaveStatus({ message: err instanceof Error ? err.message : 'Ett okänt fel inträffade vid sparning.', severity: 'error' });
    }
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
