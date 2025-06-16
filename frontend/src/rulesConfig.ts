import { RuleConfig } from './types'; // Use the new RuleConfig type

export const LOCAL_STORAGE_RULES_KEY = 'ifkInvoicingAppRulesV1';

const currentYear = new Date().getFullYear();

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
    name: 'SM-tävling full avgiftstäckning',
    description:
      'Klubben betalar full startavgift för alla medlemmar som deltar i SM-tävlingar.',
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
    name: 'Ungdom & Junior, fri startavgift',
    description: 'Klubben betalar full startavgift för ungdom & junior.',
    priority: 40,
  },
  {
    id: 'other_members_fee_share',
    name: 'Avgiftsdelning övriga medlemmar (60%, max 120 kr)',
    description:
      'För normala startavgifter betalar övriga medlemmar 60% av avgiften, upp till maximalt 120 kr. Klubben betalar resten.',
    priority: 100,
    parameters: { runnerPaysPercentage: 0.6, maxRunnerPays: 120 },
  },
];
