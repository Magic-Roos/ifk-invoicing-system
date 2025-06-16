import { Rule, ParticipationData } from '../../types';

// Configuration values are hardcoded as we cannot read files in the browser.
const MAX_RUNNER_PAYS = 120;
const RUNNER_PAYS_PERCENTAGE = 0.6;

export const rule_other_members_fee_share: Rule = {
  priority: 100,
  name: `Other Members Fee Share (${(RUNNER_PAYS_PERCENTAGE * 100).toFixed(0)}%, max ${MAX_RUNNER_PAYS} SEK)`,
  description: `For standard start fees, other members pay ${(RUNNER_PAYS_PERCENTAGE * 100).toFixed(0)}% of the fee, up to a maximum of ${MAX_RUNNER_PAYS} SEK. The club pays the rest.`,

  condition: (participation: ParticipationData): boolean => {
    // This rule applies to standard start fees and acts as a general fallback.
    return participation.feeType === 'Standard Startavgift';
  },

  action: (participation: ParticipationData) => {
    let runnerPays = participation.feeAmount * RUNNER_PAYS_PERCENTAGE;
    if (runnerPays > MAX_RUNNER_PAYS) {
      runnerPays = MAX_RUNNER_PAYS;
    }
    const clubPays = participation.feeAmount - runnerPays;

    return {
      runnerPays: Math.round(runnerPays * 100) / 100, // Round to 2 decimal places
      clubPays: Math.round(clubPays * 100) / 100, // Round to 2 decimal places
    };
  },
};
