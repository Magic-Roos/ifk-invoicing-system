// Rule 2: SM competitions: Club pays full start fee for all ages

module.exports = {
  priority: 30,
  name: 'SM Competition Full Fee Coverage',
  description: 'Club pays the full start fee for all members participating in SM (Swedish Championship) competitions.',
  condition: (participation) => {
    // Assumes participation.isSMCompetition (boolean) is available and feeType is 'Standard'.
    // Alternatively, could check participation.CompetitionName against a list of SM events.
    return participation.isSMCompetition === true && 
           participation.feeType === 'Standard Startavgift';
  },
  action: (participation) => {
    return {
      runnerPays: 0,
      clubPays: participation.feeAmount,
    };
  },
};
