// Rule 4: Late entries, DNS, Chip Rental: Runner pays 100%

module.exports = {
  priority: 10,
  name: 'Runner Pays Full for Specific Fee Types',
  description: 'Runner pays 100% for late entries, Did Not Start (DNS), and chip rental fees.',
  // This rule should likely have high priority in the rule execution order.
  condition: (participation) => {
    const applicableFeeTypes = ['Late', 'DNS', 'ChipRental']; // Case-sensitive, ensure matches Eventor export
    return applicableFeeTypes.includes(participation.feeType);
  },
  action: (participation) => {
    return {
      runnerPays: participation.feeAmount,
      clubPays: 0,
    };
  },
};
