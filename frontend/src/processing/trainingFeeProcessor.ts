import { BillingResult, TrainingFeeMember, TrainingFeeCompetition } from '../types';
import { LOCAL_STORAGE_RULES_KEY, DEFAULT_RULES } from '../rulesConfig';
import { SummerEventFeeParameters } from '../types';

/**
 * Determines if a competition should be excluded by default based on various criteria
 */
const shouldExcludeCompetition = (
  competitionName: string,
  competitionDate: string,
  className: string
): { exclude: boolean; reason?: string } => {
  const nameLower = competitionName.toLowerCase();
  const classLower = className.toLowerCase();

  // Check for Vårserien
  if (nameLower.includes('vårserien')) {
    return { exclude: true, reason: 'Vårserien' };
  }

  // Check for Motion/Veteran orienteering
  if (
    classLower.includes('motion') ||
    classLower.includes('veteran') ||
    nameLower.includes('motion') ||
    nameLower.includes('veteran')
  ) {
    return { exclude: true, reason: 'Motion/Veteran' };
  }

  // Check for multi-day summer competitions
  // Get summer period from rules
  try {
    let summerRule;
    const storedRules = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
    if (storedRules) {
      const parsedRules = JSON.parse(storedRules);
      summerRule = parsedRules.find((r: any) => r.id === 'summer_event_fee');
    }
    // Fallback to default rules if not found in localStorage
    if (!summerRule) {
      summerRule = DEFAULT_RULES.find((r) => r.id === 'summer_event_fee');
    }
    
    if (summerRule?.parameters) {
      const params = summerRule.parameters as SummerEventFeeParameters;
      
      // Check if it's a date range (multi-day event)
      if (competitionDate.includes(' - ')) {
        const [startDate] = competitionDate.split(' - ').map(d => d.trim());
        
        // Check if it's within summer period
        if (startDate >= params.startDate && startDate <= params.endDate) {
          console.log(`[TrainingFee] Excluding multi-day summer competition: ${competitionName}, date: ${startDate}, summer period: ${params.startDate} - ${params.endDate}`);
          return { exclude: true, reason: 'Flerdagars sommartävling' };
        }
      }
    }
  } catch (error) {
    console.error('[TrainingFee] Error checking summer period:', error);
  }

  return { exclude: false };
};

/**
 * Processes billing results to generate training fee data grouped by member
 */
export const processTrainingFeeData = (
  results: BillingResult[]
): TrainingFeeMember[] => {
  // Group by member
  const memberMap = new Map<string, BillingResult[]>();

  results.forEach((result) => {
    // Only include standard fees (not late fees, chip rental, etc.)
    if (result.feeType === 'Standard Startavgift') {
      const existing = memberMap.get(result.MemberName) || [];
      existing.push(result);
      memberMap.set(result.MemberName, existing);
    }
  });

  // Convert to TrainingFeeMember array
  const members: TrainingFeeMember[] = [];

  memberMap.forEach((competitions, memberName) => {
    // Remove duplicates (same competition, same date)
    const uniqueCompetitions = new Map<string, BillingResult>();
    competitions.forEach((comp) => {
      const key = `${comp.CompetitionName}-${comp.CompetitionDate}`;
      if (!uniqueCompetitions.has(key)) {
        uniqueCompetitions.set(key, comp);
      }
    });

    const trainingFeeCompetitions: TrainingFeeCompetition[] = [];
    let includedCount = 0;

    uniqueCompetitions.forEach((comp) => {
      const exclusionCheck = shouldExcludeCompetition(
        comp.CompetitionName,
        comp.CompetitionDate,
        comp.ClassName
      );

      const included = !exclusionCheck.exclude;
      if (included) {
        includedCount++;
      }

      trainingFeeCompetitions.push({
        competitionName: comp.CompetitionName,
        competitionDate: comp.CompetitionDate,
        className: comp.ClassName,
        included,
        excludeReason: exclusionCheck.reason,
      });
    });

    // Sort competitions by date
    trainingFeeCompetitions.sort((a, b) => {
      const dateA = a.competitionDate.split(' - ')[0];
      const dateB = b.competitionDate.split(' - ')[0];
      return dateA.localeCompare(dateB);
    });

    members.push({
      memberName,
      personId: competitions[0].PersonId,
      competitions: trainingFeeCompetitions,
      includedCount,
      included: includedCount >= 3, // Only include members with 3+ competitions
    });
  });

  // Sort members by name
  members.sort((a, b) => a.memberName.localeCompare(b.memberName, 'sv'));

  return members;
};

/**
 * Generates CSV data for export
 */
export const generateTrainingFeeCsv = (
  members: TrainingFeeMember[],
  feeAmount: number,
  description: string
): string => {
  const csvRows: string[] = [];

  members.forEach((member) => {
    // Only export members who are included and have 3+ included competitions
    if (member.included && member.includedCount >= 3) {
      const row = [
        `"${member.memberName}"`,
        1,
        feeAmount,
        `"${description}"`,
      ].join(',');
      csvRows.push(row);
    }
  });

  return csvRows.join('\n');
};
