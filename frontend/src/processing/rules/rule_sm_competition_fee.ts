import { Rule, ParticipationData } from '../../types';

export const rule_sm_competition_fee: Rule = {
  priority: 30,
  name: 'SM Competition Full Fee Coverage',
  description:
    'Club pays the full start fee for all members participating in SM (Swedish Championship) competitions.',

  condition: (participation: ParticipationData): boolean => {
    return (
      participation.isSMCompetition === true &&
      participation.feeType === 'Standard Startavgift'
    );
  },

  action: (participation: ParticipationData) => {
    return {
      runnerPays: 0,
      clubPays: participation.feeAmount,
    };
  },
};
