import { ParticipationData, BillingResult, Rule, OtherMembersFeeShareParameters, SummerEventFeeParameters } from '../types';
import { DEFAULT_RULES, LOCAL_STORAGE_RULES_KEY } from '../rulesConfig';

const getActiveRules = (): Rule[] => {
  try {
    const storedRules = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
    if (storedRules) {
      const parsedRules: Rule[] = JSON.parse(storedRules);
      if (Array.isArray(parsedRules) && parsedRules.length > 0) {
        // Basic validation: check if essential properties exist on the first rule
        if (parsedRules[0] && 'id' in parsedRules[0] && 'priority' in parsedRules[0]) {
          console.log('[FE RuleEngine] Loaded rules from localStorage');
          return [...parsedRules].sort((a, b) => a.priority - b.priority);
        }
      }
    }
  } catch (error) {
    console.error('[FE RuleEngine] Error loading rules from localStorage, using default rules:', error);
  }
  console.log('[FE RuleEngine] Using default rules');
  return [...DEFAULT_RULES].sort((a, b) => a.priority - b.priority);
};

/**
 * Applies invoicing rules to a list of participation records.
 * @param {ParticipationData[]} participations - Array of standardized participation records.
 * @returns {BillingResult[]} - Array of participations with billing decisions.
 */
export const applyInvoicingRules = (participations: ParticipationData[]): BillingResult[] => {
  if (!participations || participations.length === 0) {
    return [];
  }

  const activeRules = getActiveRules();
  console.log('[FE RuleEngine] Active rules for this calculation run:', activeRules.map(r => r.name));

  return participations.map((participation) => {
    const { feeAmount, isSMCompetition, EventType, age, CompetitionDate, feeType } = participation;
    let runnerPays = feeAmount; // Default: runner pays the full fee amount
    let clubPays = 0;
    let appliedRuleName = 'Default: Runner pays 100%';

    for (const rule of activeRules) {
      let conditionMet = false;
      let actionResult = { runnerPays: feeAmount, clubPays: 0 };

      try {
        // Implement condition and action logic based on rule.id
        switch (rule.id) {
          case 'runner_pays_full_specific_fees':
            conditionMet = ['Late', 'DNS', 'ChipRental', 'Service'].includes(feeType || '');
            if (conditionMet) {
              actionResult = { runnerPays: feeAmount, clubPays: 0 };
            }
            break;

          case 'sm_competition_full_coverage':
            conditionMet = isSMCompetition === true && feeType === 'Standard Startavgift';
            if (conditionMet) {
              actionResult = { runnerPays: 0, clubPays: feeAmount };
            }
            break;

          case 'summer_event_fee':
            if (rule.parameters && feeType === 'Standard Startavgift') {
              const params = rule.parameters as SummerEventFeeParameters;
              const competitionDateObj = new Date(CompetitionDate);
              const startDateObj = new Date(params.startDate);
              const endDateObj = new Date(params.endDate);
              // Normalize dates to ignore time component for comparison
              competitionDateObj.setHours(0, 0, 0, 0);
              startDateObj.setHours(0, 0, 0, 0);
              endDateObj.setHours(0, 0, 0, 0);

              conditionMet = competitionDateObj >= startDateObj && competitionDateObj <= endDateObj;
              if (conditionMet) {
                actionResult = { runnerPays: feeAmount, clubPays: 0 };
              }
            }
            break;

          case 'youth_junior_free_fee':
            // Assuming youth/junior is <= 20 years old. EventType might be 'Nationell tävling', 'Distriktstävling', etc.
            // This rule should apply to 'Standard Startavgift' primarily.
            conditionMet = age !== null && age <= 20 && feeType === 'Standard Startavgift';
            if (conditionMet) {
              actionResult = { runnerPays: 0, clubPays: feeAmount };
            }
            break;

          case 'other_members_fee_share':
            if (rule.parameters && feeType === 'Standard Startavgift') {
              const params = rule.parameters as OtherMembersFeeShareParameters;
              // This rule should apply if no higher priority rule for standard fees has been met.
              // The logic here assumes it's a catch-all for standard fees not covered by SM, Summer, Youth.
              conditionMet = true; // Applied if no other specific rule for standard fees matched
              if (conditionMet) {
                let calculatedRunnerPays = feeAmount * params.runnerPaysPercentage;
                if (params.maxRunnerPays && calculatedRunnerPays > params.maxRunnerPays) {
                  calculatedRunnerPays = params.maxRunnerPays;
                }
                actionResult = { runnerPays: calculatedRunnerPays, clubPays: feeAmount - calculatedRunnerPays };
              }
            }
            break;
          
          default:
            console.warn(`[FE RuleEngine] Unknown rule ID: ${rule.id}`);
            break;
        }

        if (conditionMet) {
          runnerPays = actionResult.runnerPays;
          clubPays = actionResult.clubPays;
          appliedRuleName = rule.name;
          // Ensure runnerPays is not negative and clubPays covers the rest if runnerPays is capped/reduced
          if (runnerPays < 0) runnerPays = 0;
          if (runnerPays > feeAmount) runnerPays = feeAmount; // Cannot pay more than original fee
          clubPays = feeAmount - runnerPays;
          if (clubPays < 0) clubPays = 0; // Club cannot have negative payment

          console.log(`[FE RuleEngine] Applied rule '${rule.name}' to:`, participation, `Result: runnerPays=${runnerPays}, clubPays=${clubPays}`);
          break; // First matching rule determines the outcome
        }
      } catch (error) {
        console.error(`[FE RuleEngine] Error applying rule '${rule.name}' to participation:`, participation, error);
        // If a rule fails, we fall through to the next or to the default.
      }
    }

    return {
      ...participation,
      runnerInvoiceAmount: runnerPays,
      clubPaysAmount: clubPays,
      appliedRule: appliedRuleName,
    };
  });
};
