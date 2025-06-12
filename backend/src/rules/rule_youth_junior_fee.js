// Rule 1: Youth (≤16) & Junior (17–20): Club pays full start fee

module.exports = {
  priority: 40,
  name: 'Ungdom & Junior, fri startavgift',
  description: 'Klubben betalar full startavgift för ungdom & junior.',
  condition: (participation) => {
    // Assumes participation.age is available and participation.feeType is 'Standard' or similar (not late fee, DNS, etc.)
    // We might need to refine feeType checks later.
    // This rule applies to standard start fees for youth/juniors.
    // Other fees like late entry, chip rental are handled by other rules.
    return typeof participation.age === 'number' && 
           participation.age <= 20 && 
           participation.feeType === 'Standard Startavgift';
  },
  action: (participation) => {
    // Club pays the full fee, runner pays nothing for this specific fee.
    return {
      runnerPays: 0,
      clubPays: participation.feeAmount, // Assumes feeAmount is the relevant standard start fee
    };
  },
};