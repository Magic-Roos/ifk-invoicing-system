import { Rule, ParticipationData } from '../../types';

export const rule_runner_pays_full_specific_fees: Rule = {
  priority: 10,
  name: 'Runner Pays Full for Specific Fee Types',
  description: 'Runner pays 100% for late entries, Did Not Start (DNS), and chip rental fees.',

  condition: (participation: ParticipationData): boolean => {
    const applicableFeeTypes = ['Late', 'DNS', 'ChipRental'];
    return applicableFeeTypes.includes(participation.feeType);
  },

  action: (participation: ParticipationData) => {
    return {
      runnerPays: participation.feeAmount,
      clubPays: 0,
    };
  },
};
