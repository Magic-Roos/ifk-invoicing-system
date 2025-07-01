import { ExecutableRule, ParticipationData } from '../../types';

export const rule_youth_junior_fee: ExecutableRule = {
  id: 'youth_junior_free_fee',
  priority: 40,
  name: 'Ungdom & Junior, fri startavgift',
  description: 'Klubben betalar full startavgift för ungdom & junior.',

  condition: (participation: ParticipationData): boolean => {
    // Denna regel gäller endast ungdomar t.o.m. det år de fyller 16 år.
    const currentYear = new Date().getFullYear();
    if (participation.BirthYear == null) return false;
    const age = currentYear - participation.BirthYear;
    return (
      age <= 16 &&
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
