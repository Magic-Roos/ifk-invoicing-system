import { Rule, ParticipationData } from '../../types';

// Configuration is hardcoded as we cannot read files in the browser.
const SUMMER_START_DATE = '2024-06-15'; // YYYY-MM-DD
const SUMMER_END_DATE = '2024-08-15'; // YYYY-MM-DD

export const rule_summer_event_fee: Rule = {
  priority: 35,
  name: `Runner Pays Full for Summer Period Events (${SUMMER_START_DATE} - ${SUMMER_END_DATE})`,
  description: `Runner pays the full start fee for events during the summer period (${SUMMER_START_DATE} - ${SUMMER_END_DATE}).`,

  condition: (participation: ParticipationData): boolean => {
    if (!participation.CompetitionDate) {
      return false;
    }

    // Direct string comparison works for YYYY-MM-DD format.
    const competitionDate = participation.CompetitionDate;

    return (
      competitionDate >= SUMMER_START_DATE &&
      competitionDate <= SUMMER_END_DATE &&
      participation.feeType === 'Standard Startavgift'
    );
  },

  action: (participation: ParticipationData) => {
    return {
      runnerPays: participation.feeAmount,
      clubPays: 0,
    };
  },
};
