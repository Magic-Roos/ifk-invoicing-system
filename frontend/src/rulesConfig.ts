import { Rule } from './types'; // Assuming Rule type is in types.ts or similar

export const LOCAL_STORAGE_RULES_KEY = 'ifkInvoicingAppRulesV1';

export const DEFAULT_RULES: Rule[] = [
  {
    id: 'runner_pays_full_specific_fees',
    name: 'Runner Pays Full for Specific Fee Types',
    description: 'Runner pays 100% for late entries, Did Not Start (DNS), and chip rental fees.',
    priority: 10
  },
  {
    id: 'sm_competition_full_coverage',
    name: 'SM Competition Full Fee Coverage',
    description: 'Club pays the full start fee for all members participating in SM (Swedish Championship) competitions.',
    priority: 30
  },
  {
    id: 'summer_event_fee',
    name: 'Runner Pays Full for Summer Period Events (2024-06-15 - 2024-08-15)',
    description: 'Runner pays the full start fee for events during the summer period (2024-06-15 - 2024-08-15).',
    priority: 35,
    parameters: { startDate: '2024-06-15', endDate: '2024-08-15' }
  },
  {
    id: 'youth_junior_free_fee',
    name: 'Ungdom & Junior, fri startavgift',
    description: 'Klubben betalar full startavgift för ungdom & junior.',
    priority: 40
  },
  {
    id: 'other_members_fee_share',
    name: 'Other Members Fee Share (60%, max 120 SEK)',
    description: 'For standard start fees, other members pay 60% of the fee, up to a maximum of 120 SEK. The club pays the rest.',
    priority: 100,
    parameters: { runnerPaysPercentage: 0.6, maxRunnerPays: 120 }
  }
];

// We might also need the Rule, OtherMembersFeeShareParameters, SummerEventFeeParameters interfaces here
// if they are not already in a central types.ts. For now, assuming Rule is imported.
