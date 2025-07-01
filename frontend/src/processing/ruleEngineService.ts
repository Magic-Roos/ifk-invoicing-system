import {
  ParticipationData,
  BillingResult,
  RuleConfig,
  ExecutableRule,
  OtherMembersFeeShareParameters,
  SummerEventFeeParameters,
} from '../types';
import { DEFAULT_RULES, LOCAL_STORAGE_RULES_KEY } from '../rulesConfig';

const getActiveRules = (): RuleConfig[] => {
  try {
    const storedRules = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
    if (storedRules) {
      const parsedRules: RuleConfig[] = JSON.parse(storedRules);
      if (Array.isArray(parsedRules) && parsedRules.length > 0) {
        if (
          parsedRules[0] &&
          'id' in parsedRules[0] &&
          'priority' in parsedRules[0]
        ) {
          console.log('[FE RuleEngine] Loaded rules from localStorage');
          return [...parsedRules].sort((a, b) => a.priority - b.priority);
        }
      }
    }
  } catch (error) {
    console.error(
      '[FE RuleEngine] Error loading rules from localStorage, using default rules:',
      error
    );
  }
  console.log('[FE RuleEngine] Using default rules');
  return [...DEFAULT_RULES].sort((a, b) => a.priority - b.priority);
};

const buildExecutableRules = (rules: RuleConfig[]): ExecutableRule[] => {
  return rules.map((rule) => {
    const { id, name, description, priority, parameters } = rule;

    const condition = (participation: ParticipationData): boolean => {
      const { feeType, isSMCompetition, age, CompetitionDate } = participation;
      switch (id) {
        case 'runner_pays_full_specific_fees':
          return ['Late', 'DNS', 'ChipRental', 'Service'].includes(
            feeType || ''
          );
        case 'sm_competition_full_coverage':
          return isSMCompetition === true && feeType === 'Standard Startavgift';
        case 'summer_event_fee':
          if (
            parameters &&
            feeType === 'Standard Startavgift' &&
            !isSMCompetition &&
            CompetitionDate
          ) {
            const params = parameters as SummerEventFeeParameters;
            const competitionStartDate = CompetitionDate.split(' - ')[0]; // Use start date for ranges
            return (
              competitionStartDate >= params.startDate &&
              competitionStartDate <= params.endDate
            );
          }
          return false;
        case 'junior_fee_share':
          return (
            age !== null && age >= 17 && age <= 20 && feeType === 'Standard Startavgift'
          );
        case 'youth_junior_free_fee':
          return (
            age !== null && age <= 16 && feeType === 'Standard Startavgift'
          );
        case 'other_members_fee_share':
          return feeType === 'Standard Startavgift';
        default:
          return false;
      }
    };

    const action = (
      participation: ParticipationData
    ): { runnerPays: number; clubPays: number } => {
      const { feeAmount } = participation;
      switch (id) {
        case 'runner_pays_full_specific_fees':
        case 'summer_event_fee':
          return { runnerPays: feeAmount, clubPays: 0 };
        case 'sm_competition_full_coverage':
        case 'youth_junior_free_fee':
          return { runnerPays: 0, clubPays: feeAmount };
        case 'junior_fee_share':
          if (parameters) {
            const params = parameters as OtherMembersFeeShareParameters;
            let calculatedRunnerPays = feeAmount * params.runnerPaysPercentage;
            if (
              params.maxRunnerPays &&
              calculatedRunnerPays > params.maxRunnerPays
            ) {
              calculatedRunnerPays = params.maxRunnerPays;
            }
            return {
              runnerPays: calculatedRunnerPays,
              clubPays: feeAmount - calculatedRunnerPays,
            };
          }
          // Fallback for misconfiguration
          return { runnerPays: feeAmount, clubPays: 0 };
        case 'other_members_fee_share':
          if (parameters) {
            const params = parameters as OtherMembersFeeShareParameters;
            let calculatedRunnerPays = feeAmount * params.runnerPaysPercentage;
            if (
              params.maxRunnerPays &&
              calculatedRunnerPays > params.maxRunnerPays
            ) {
              calculatedRunnerPays = params.maxRunnerPays;
            }
            return {
              runnerPays: calculatedRunnerPays,
              clubPays: feeAmount - calculatedRunnerPays,
            };
          }
          // Fallback for misconfiguration
          return { runnerPays: feeAmount, clubPays: 0 };
        default:
          return { runnerPays: feeAmount, clubPays: 0 };
      }
    };

    return { id, name, description, priority, condition, action, parameters };
  });
};

export const run = (participations: ParticipationData[]): BillingResult[] => {
  const activeRules = getActiveRules();
  const executableRules = buildExecutableRules(activeRules);

  console.log(
    '[FE RuleEngine] Running with rules:',
    executableRules.map((r) => r.name)
  );

  return participations.map((participation) => {
    for (const rule of executableRules) {
      if (rule.condition(participation)) {
        const { runnerPays, clubPays } = rule.action(participation);
        const result: BillingResult = {
          ...participation,
          runnerInvoiceAmount: runnerPays,
          clubPaysAmount: clubPays,
          appliedRule: rule.name,
        };
        console.log(
          `[FE RuleEngine] Applied rule '${rule.name}' to ${participation.MemberName} for ${participation.CompetitionName}. Result: Runner pays ${runnerPays}, Club pays ${clubPays}`
        );
        return result;
      }
    }

    // Default outcome if no rule matches
    const defaultResult: BillingResult = {
      ...participation,
      runnerInvoiceAmount: participation.feeAmount,
      clubPaysAmount: 0,
      appliedRule: 'Default: Runner pays full amount',
    };
    console.log(
      `[FE RuleEngine] No rule matched for ${participation.MemberName} for ${participation.CompetitionName}. Applying default.`
    );
    return defaultResult;
  });
};
