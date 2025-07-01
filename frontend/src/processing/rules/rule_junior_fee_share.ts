import { ExecutableRule, ParticipationData } from '../../types';

// Junior är löpare som är mellan 17 och 20 år (inklusive det år man fyller 20)
const MAX_RUNNER_PAYS = 200;
const RUNNER_PAYS_PERCENTAGE = 0.5;

export const rule_junior_fee_share: ExecutableRule = {
  id: 'junior_fee_share',
  priority: 50,
  name: 'Subvention junior',
  description: 'För normala startavgifter betalar junior 50% av avgiften, upp till maximalt 200 kr. Klubben betalar resten.',
  condition: (participation: ParticipationData): boolean => {
    const currentYear = new Date().getFullYear();
    if (participation.BirthYear == null) return false;
    const age = currentYear - participation.BirthYear;
    return age >= 17 && age <= 20 && participation.feeType === 'Standard Startavgift';
  },
  action: (participation: ParticipationData) => {
    let runnerPays = participation.feeAmount * RUNNER_PAYS_PERCENTAGE;
    if (runnerPays > MAX_RUNNER_PAYS) {
      runnerPays = MAX_RUNNER_PAYS;
    }
    const clubPays = participation.feeAmount - runnerPays;
    return {
      runnerPays: Math.round(runnerPays * 100) / 100,
      clubPays: Math.round(clubPays * 100) / 100,
    };
  },
};
