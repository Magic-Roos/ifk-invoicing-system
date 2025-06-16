import React, { useState, useEffect } from 'react';
import { DEFAULT_RULES, LOCAL_STORAGE_RULES_KEY } from './rulesConfig';
import {
  RuleConfig,
  OtherMembersFeeShareParameters,
  SummerEventFeeParameters,
} from './types';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
} from '@mui/material';

interface RuleEditorProps {
  onClose: () => void;
  onRuleChangeAndRecalculate?: () => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({
  onClose,
  onRuleChangeAndRecalculate,
}) => {
  const [rules, setRules] = useState<RuleConfig[]>([]);
  const [saveStatus, setSaveStatus] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);
  const [summerSaveStatus, setSummerSaveStatus] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  const [editableRuleId] = useState<string>('other_members_fee_share');
  const [currentPercentage, setCurrentPercentage] = useState<string>('');
  const [currentMaxAmount, setCurrentMaxAmount] = useState<string>('');

  const [editableSummerRuleId] = useState<string>('summer_event_fee');
  const [summerStartDate, setSummerStartDate] = useState<string>('');
  const [summerEndDate, setSummerEndDate] = useState<string>('');

  const loadAndSetRules = React.useCallback(() => {
    let loadedRules: RuleConfig[] = DEFAULT_RULES;
    try {
      const storedRules = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
      if (storedRules) {
        const parsedRules: RuleConfig[] = JSON.parse(storedRules);
        if (
          Array.isArray(parsedRules) &&
          parsedRules.every((r) => r.id && r.name)
        ) {
          loadedRules = parsedRules;
        } else {
          localStorage.setItem(
            LOCAL_STORAGE_RULES_KEY,
            JSON.stringify(DEFAULT_RULES)
          );
        }
      }
    } catch (error) {
      console.error(
        'Fel vid laddning av regler, återgår till standard:',
        error
      );
      localStorage.setItem(
        LOCAL_STORAGE_RULES_KEY,
        JSON.stringify(DEFAULT_RULES)
      );
    }
    setRules(loadedRules);

    const otherMembersRule = loadedRules.find((r) => r.id === editableRuleId);
    if (otherMembersRule?.parameters) {
      const params =
        otherMembersRule.parameters as OtherMembersFeeShareParameters;
      setCurrentPercentage((params.runnerPaysPercentage * 100).toString());
      setCurrentMaxAmount(params.maxRunnerPays.toString());
    }

    const summerRule = loadedRules.find((r) => r.id === editableSummerRuleId);
    if (summerRule?.parameters) {
      const params = summerRule.parameters as SummerEventFeeParameters;
      setSummerStartDate(params.startDate);
      setSummerEndDate(params.endDate);
    }
  }, [editableRuleId, editableSummerRuleId]);

  useEffect(() => {
    loadAndSetRules();
  }, [loadAndSetRules]);

  const handleSave = () => {
    setSaveStatus(null);
    const percentage = parseFloat(currentPercentage) / 100;
    const maxAmount = parseFloat(currentMaxAmount);

    if (isNaN(percentage) || percentage < 0 || percentage > 1) {
      setSaveStatus({
        message: 'Felaktig procent. Ange ett tal mellan 0 och 100.',
        severity: 'error',
      });
      return;
    }
    if (isNaN(maxAmount) || maxAmount < 0) {
      setSaveStatus({
        message: 'Felaktigt maxbelopp. Ange ett positivt tal.',
        severity: 'error',
      });
      return;
    }

    const updatedRules = rules.map((rule) => {
      if (rule.id === editableRuleId) {
        const newName = `Avgiftsdelning övriga medlemmar (${(
          percentage * 100
        ).toFixed(0)}%, max ${maxAmount} kr)`;
        const newDescription = `För normala startavgifter betalar övriga medlemmar ${(
          percentage * 100
        ).toFixed(
          0
        )}% av avgiften, upp till maximalt ${maxAmount} kr. Klubben betalar resten.`;
        return {
          ...rule,
          name: newName,
          description: newDescription,
          parameters: {
            runnerPaysPercentage: percentage,
            maxRunnerPays: maxAmount,
          },
        };
      }
      return rule;
    });
    setRules(updatedRules);
    localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(updatedRules));
    setSaveStatus({ message: 'Ändringar sparade!', severity: 'success' });
    if (onRuleChangeAndRecalculate) {
      onRuleChangeAndRecalculate();
    }
  };

  const handleSaveSummerRule = () => {
    setSummerSaveStatus(null);

    if (!summerStartDate || !summerEndDate) {
      setSummerSaveStatus({
        message: 'Du måste fylla i både start- och slutdatum.',
        severity: 'error',
      });
      return;
    }
    if (new Date(summerStartDate) > new Date(summerEndDate)) {
      setSummerSaveStatus({
        message: 'Startdatumet måste vara före eller samma som slutdatumet.',
        severity: 'error',
      });
      return;
    }

    const updatedRules = rules.map((rule) => {
      if (rule.id === editableSummerRuleId) {
        const newName = `Löpare betalar full avgift (${summerStartDate} till ${summerEndDate})`;
        const newDescription = `Löparen betalar hela startavgiften för tävlingar under sommarperioden (${summerStartDate} till ${summerEndDate}). Regeln gäller inte för SM-tävlingar.`;
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
    setSummerSaveStatus({ message: 'Ändringar sparade!', severity: 'success' });
    if (onRuleChangeAndRecalculate) {
      onRuleChangeAndRecalculate();
    }
  };

  const otherMembersRuleDetails = rules.find((r) => r.id === editableRuleId);
  const summerEventRuleDetails = rules.find(
    (r) => r.id === editableSummerRuleId
  );

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
      <Typography variant='h4' gutterBottom>
        Redigera regler
      </Typography>
      <Typography variant='body1' color='textSecondary' sx={{ mb: 3 }}>
        Här kan du ändra parametrarna för reglerna som styr beräkningen av
        startavgifter. Ändringarna sparas lokalt i din webbläsare.
      </Typography>

      {otherMembersRuleDetails && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant='h6'>{otherMembersRuleDetails.name}</Typography>
          <Typography variant='body2' color='textSecondary' gutterBottom>
            {otherMembersRuleDetails.description}
          </Typography>
          <Box component='form' sx={{ mt: 2 }}>
            <TextField
              label='Löparens andel av avgiften (%)'
              type='number'
              value={currentPercentage}
              onChange={(e) => setCurrentPercentage(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              helperText='Ange den procentandel av avgiften som löparen ska betala (t.ex. 50).'
            />
            <TextField
              label='Maximalt belopp löparen betalar (kr)'
              type='number'
              value={currentMaxAmount}
              onChange={(e) => setCurrentMaxAmount(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              helperText='Ange det högsta beloppet i kronor som löparen ska betala (t.ex. 120).'
            />
            <Button variant='contained' onClick={handleSave}>
              Spara ändringar
            </Button>
            {saveStatus && (
              <Alert severity={saveStatus.severity} sx={{ mt: 2 }}>
                {saveStatus.message}
              </Alert>
            )}
          </Box>
        </Paper>
      )}

      {summerEventRuleDetails && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant='h6'>{summerEventRuleDetails.name}</Typography>
          <Typography variant='body2' color='textSecondary' gutterBottom>
            {summerEventRuleDetails.description}
          </Typography>
          <Box component='form' sx={{ mt: 2 }}>
            <TextField
              label='Startdatum för perioden'
              type='date'
              value={summerStartDate}
              onChange={(e) => setSummerStartDate(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
              helperText='Första dagen då regeln gäller (format ÅÅÅÅ-MM-DD).'
            />
            <TextField
              label='Slutdatum för perioden'
              type='date'
              value={summerEndDate}
              onChange={(e) => setSummerEndDate(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
              helperText='Sista dagen då regeln gäller (format ÅÅÅÅ-MM-DD).'
            />
            <Button variant='contained' onClick={handleSaveSummerRule}>
              Spara ändringar
            </Button>
            {summerSaveStatus && (
              <Alert severity={summerSaveStatus.severity} sx={{ mt: 2 }}>
                {summerSaveStatus.message}
              </Alert>
            )}
          </Box>
        </Paper>
      )}

      <Typography variant='h5' gutterBottom sx={{ mt: 4 }}>
        Regelöversikt
      </Typography>
      <List component={Paper}>
        {rules.map((rule, index) => (
          <React.Fragment key={rule.id}>
            <ListItem alignItems='flex-start'>
              <ListItemText
                primary={`${rule.name} (Prioritet: ${rule.priority})`}
                secondary={rule.description}
              />
            </ListItem>
            {index < rules.length - 1 && <Divider component='li' />}
          </React.Fragment>
        ))}
      </List>
      <Button onClick={onClose} sx={{ mt: 3 }} variant='outlined'>
        Stäng
      </Button>
    </Box>
  );
};

export default RuleEditor;
