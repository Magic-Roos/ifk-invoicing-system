import { Rule, ParticipationData } from '../../types';

export const rule_youth_junior_fee: Rule = {
  priority: 40,
  name: 'Ungdom & Junior, fri startavgift',
  description: 'Klubben betalar full startavgift för ungdom & junior.',

  condition: (participation: ParticipationData): boolean => {
    // This rule applies to standard start fees for youth/juniors (age <= 20).
    return (
      typeof participation.age === 'number' &&
      participation.age <= 20 &&
      participation.feeType === 'Standard Startavgift'
    );
  },

  action: (participation: ParticipationData) => {
    // Club pays the full fee, runner pays nothing for this specific fee.
    return {
      runnerPays: 0,
      clubPays: participation.feeAmount,
    };
  },
};
