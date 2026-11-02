import { RuleConfig } from './types'; // Use the new RuleConfig type

export const LOCAL_STORAGE_RULES_KEY = 'ifkInvoicingAppRulesV2';

const currentYear = new Date().getFullYear();

// Regler vars namn/beskrivning genereras utifrån parametrar som sparas i regelredigeraren.
const RULES_WITH_EDITABLE_TEXTS = [
  'other_members_fee_share',
  'summer_event_fee',
];

// Sparade regler i localStorage kan ha inaktuella texter. Hämta namn och beskrivning
// från standardreglerna för de regler som inte redigeras i gränssnittet.
export const withCurrentDefaultTexts = (rules: RuleConfig[]): RuleConfig[] =>
  rules.map((rule) => {
    if (RULES_WITH_EDITABLE_TEXTS.includes(rule.id)) return rule;
    const defaultRule = DEFAULT_RULES.find((r) => r.id === rule.id);
    return defaultRule
      ? {
          ...rule,
          name: defaultRule.name,
          description: defaultRule.description,
        }
      : rule;
  });

export const DEFAULT_RULES: RuleConfig[] = [
  {
    id: 'runner_pays_full_specific_fees',
    name: 'Löpare betalar full avgift för specifika avgiftstyper',
    description:
      'Löparen betalar 100% för sena anmälningar, Did Not Start (DNS) och chip-hyra.',
    priority: 10,
  },
  {
    id: 'sm_competition_full_coverage',
    name: 'SM-tävling full avgiftstäckning (senior/junior)',
    description:
      'Klubben betalar full startavgift på SM-tävlingar i senior- och juniorklasser (H/D17–21). Veteran-, ungdoms- och publikklasser på SM följer de vanliga reglerna.',
    priority: 30,
  },
  {
    id: 'summer_event_fee',
    name: `Löpare betalar full avgift för sommartävlingar (${currentYear}-06-15 till ${currentYear}-08-15)`,
    description: `Löparen betalar hela startavgiften för tävlingar under sommarperioden. Regeln gäller inte för SM-tävlingar.`,
    priority: 35,
    parameters: {
      startDate: `${currentYear}-06-15`,
      endDate: `${currentYear}-08-15`,
    },
  },
  {
    id: 'youth_junior_free_fee',
    name: 'Ungdom, fri startavgift (t.o.m. 16 år)',
    description:
      'Klubben betalar full startavgift för ungdomar till och med det år löparen fyller 16 år.',
    priority: 40,
  },
  {
    id: 'junior_fee_share',
    name: 'Subvention junior',
    description:
      'För normala startavgifter betalar junior 50% av avgiften, upp till maximalt 200 kr. Klubben betalar resten.',
    priority: 50,
    parameters: { runnerPaysPercentage: 0.5, maxRunnerPays: 200 },
  },
  {
    id: 'other_members_fee_share',
    name: 'Avgiftsdelning övriga medlemmar (70%, klubb subventionerar max 200 kr)',
    description:
      'För normala startavgifter betalar övriga medlemmar (vuxna över 20 år) 70% av avgiften. Klubben subventionerar resten, men maximalt 200 kr per tävling. Löparen betalar det som överstiger subventionen.',
    priority: 100,
    parameters: { runnerPaysPercentage: 0.7, maxClubPays: 200 },
  },
];
