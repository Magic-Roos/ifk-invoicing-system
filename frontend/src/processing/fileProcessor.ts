import * as xlsx from 'xlsx';
import Papa from 'papaparse';
import * as ruleEngineService from './ruleEngineService';
import { BillingResult, ParticipationData, RawDataItem } from '../types';

// Mappings for common column name variations from Eventor exports
const columnMappings = {
  personId: ['Person-id', 'PersonId', 'Personnummer', 'Medlemsnr'],
  firstName: ['Förnamn', 'First Name'],
  lastName: ['Efternamn', 'Last Name', 'Surname'],
  competition: ['Tävling', 'Competition', 'Tävlingsnamn'],
  date: ['Datum', 'Date', 'Tävlingsdatum'],
  arranger: ['Arrangör', 'Organizer', 'Arrangörsförening'],
  eventType: ['Arrangemangstyp', 'Event Type'],
  birthYear: ['Födelseår', 'Birth Year', 'Född'],
  class: ['Klass', 'Class', 'Tävlingsklass'],
  classType: ['Klasstyp', 'Class Type'],
  started: ['Startat', 'Started', 'Har startat'],
  placement: ['Placering', 'Placement', 'Plac'],
  time: ['Tid', 'Time', 'Resultat'],
  ordinaryFee: ['Ordinarie avgift', 'Avgift', 'Ord.Avgift', 'Anmälningsavgift'],
  lateFee: ['Efteranmälningsavgift', 'Efteranm.avgift', 'Late Fee'],
  serviceFees: [
    'Tjänsteavgifter',
    'Serviceavgifter',
    'Serviceavgift',
    'Brickhyra',
    'Hyrbricka',
  ],
};

// Helper to get a value from an item using mapped keys (case-insensitive)
const getVal = (
  item: RawDataItem,
  possibleKeys: string[],
  defaultValue: string | number | null = null
): string | number | null => {
  const itemKeys = Object.keys(item);
  for (const pKey of possibleKeys) {
    for (const itemKey of itemKeys) {
      if (itemKey.toLowerCase() === pKey.toLowerCase()) {
        const val = item[itemKey];
        // Return the value if it's not null or an empty string, otherwise fall through to default
        if (val !== null && val !== '') {
          return val;
        }
      }
    }
  }
  return defaultValue;
};

// Standardize data using mapped column names
const transformData = (data: RawDataItem[]): ParticipationData[] => {
  const standardizedData: ParticipationData[] = [];
  data.forEach((item) => {
    // Skip empty rows that might have slipped through
    if (Object.values(item).every((val) => val === null || val === '')) {
      return;
    }

    const competitionDateStr = getVal(item, columnMappings.date, '');
    const birthYearStr = getVal(item, columnMappings.birthYear, '');
    const firstName = getVal(item, columnMappings.firstName, '');
    const lastName = getVal(item, columnMappings.lastName, '');
    const competitionName = getVal(item, columnMappings.competition, '');
    const timeRaw = getVal(item, columnMappings.time, '');
    const startedRaw = getVal(item, columnMappings.started, 'nej');

    let age: number | null = null;
    if (competitionDateStr && birthYearStr) {
      try {
        let parsableDateStr = competitionDateStr;
        if (
          typeof competitionDateStr === 'string' &&
          competitionDateStr.includes(' - ')
        ) {
          parsableDateStr = competitionDateStr.split(' - ')[0].trim();
        }
        const competitionDateObj = new Date(parsableDateStr);
        if (!isNaN(competitionDateObj.getFullYear())) {
          const competitionYear = competitionDateObj.getFullYear();
          age = competitionYear - parseInt(String(birthYearStr), 10);
        }
      } catch (e) {
        console.warn(`Could not parse date or birth year for item:`, item);
      }
    }

    const memberName = `${firstName} ${lastName}`.trim();
    let hasStarted = false;
    if (startedRaw !== null) {
      const startedLower = String(startedRaw).toLowerCase();
      if (['1', 'true', 'yes', 'ja'].includes(startedLower)) {
        hasStarted = true;
      }
    }
    if (!hasStarted && timeRaw) {
      const timeLower = String(timeRaw).toLowerCase();
      if (
        timeLower !== 'ej start' &&
        timeLower !== 'dns' &&
        timeLower.trim() !== ''
      ) {
        hasStarted = true;
      }
    }

    const baseParticipationData: Omit<
      ParticipationData,
      'feeAmount' | 'feeType' | 'description'
    > = {
      PersonId: getVal(item, columnMappings.personId, null)?.toString() ?? '',
      MemberName: memberName,
      CompetitionName: competitionName?.toString() ?? '',
      CompetitionDate: competitionDateStr?.toString() ?? '',
      Arranger: getVal(item, columnMappings.arranger, '')?.toString() ?? '',
      EventType: getVal(item, columnMappings.eventType, '')?.toString() ?? '',
      BirthYear: birthYearStr ? parseInt(String(birthYearStr), 10) : null,
      ClassName: getVal(item, columnMappings.class, '')?.toString() ?? '',
      ClassType: getVal(item, columnMappings.classType, '')?.toString() ?? '',
      Started: hasStarted,
      Placement:
        getVal(item, columnMappings.placement, null)?.toString() ?? null,
      Time:
        typeof timeRaw === 'string' ? timeRaw : (timeRaw?.toString() ?? null),
      age: age,
      isSMCompetition: !!(
        (competitionName?.toString() ?? '') &&
        /(?<!\p{L})SM(?!\p{L})/iu.test(competitionName?.toString() ?? '')
      ),
    };

    const ordinaryFeeRaw = getVal(item, columnMappings.ordinaryFee, '0');
    const ordinaryFee =
      parseFloat(ordinaryFeeRaw?.toString().replace(',', '.') ?? '0') || 0;
    if (ordinaryFee > 0) {
      standardizedData.push({
        ...baseParticipationData,
        feeAmount: ordinaryFee,
        feeType:
          timeRaw && String(timeRaw).toLowerCase() === 'ej start'
            ? 'DNS'
            : 'Standard Startavgift',
        description:
          timeRaw && String(timeRaw).toLowerCase() === 'ej start'
            ? 'Ej start'
            : 'Startavgift',
      });
    }

    const lateFeeRaw = getVal(item, columnMappings.lateFee, '0');
    const lateFee =
      parseFloat(lateFeeRaw?.toString().replace(',', '.') ?? '0') || 0;
    if (lateFee > 0) {
      standardizedData.push({
        ...baseParticipationData,
        feeAmount: lateFee,
        feeType: 'Late',
        description: 'Efteranmälningsavgift',
      });
    }

    const serviceFeeRaw = getVal(item, columnMappings.serviceFees, '0');
    const serviceFee =
      parseFloat(serviceFeeRaw?.toString().replace(',', '.') ?? '0') || 0;
    if (serviceFee > 0) {
      standardizedData.push({
        ...baseParticipationData,
        feeAmount: serviceFee,
        feeType: 'ChipRental',
        description: 'Hyrbricka/Tjänsteavgift',
      });
    }
  });
  return standardizedData;
};

// Helper to parse CSV using PapaParse
const parseCsv = (file: File): Promise<RawDataItem[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const nonEmptyData = (results.data as RawDataItem[]).filter((row) =>
          Object.values(row).some((val) => val !== null && val !== '')
        );
        resolve(nonEmptyData);
      },
      error: (error) => reject(error),
    });
  });
};

// The single exported function for the frontend to use
const processAndBill = async (file: File): Promise<BillingResult[]> => {
  let parsedData: RawDataItem[] = [];
  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith('.csv')) {
      parsedData = await parseCsv(file);
    } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
      const fileBuffer = await file.arrayBuffer();
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      parsedData = xlsx.utils.sheet_to_json(worksheet);
    } else {
      throw new Error('Unsupported file type. Please upload CSV or Excel.');
    }

    if (parsedData.length === 0) {
      console.warn('[FE] No data parsed from the file.');
      return [];
    }

    console.log(`[FE] Parsed ${parsedData.length} records from ${fileName}`);

    const participationData = transformData(parsedData);
    console.log(
      `[FE] Transformed into ${participationData.length} participation records.`
    );

    const billingResults = ruleEngineService.run(participationData);
    console.log(`[FE] Rule engine processed ${billingResults.length} records.`);

    // Sort results by last name, then first name
    const sortedBillingResults = [...billingResults].sort((a, b) => {
      const namePartsA = a.MemberName.split(' ');
      const namePartsB = b.MemberName.split(' ');
      const lastNameA = (
        namePartsA.length > 1 ? namePartsA.pop() || '' : namePartsA[0] || ''
      ).toLowerCase();
      const lastNameB = (
        namePartsB.length > 1 ? namePartsB.pop() || '' : namePartsB[0] || ''
      ).toLowerCase();
      const firstNameA = (namePartsA[0] || '').toLowerCase();
      const firstNameB = (namePartsB[0] || '').toLowerCase();
      const lastNameComparison = lastNameA.localeCompare(lastNameB, 'sv');
      if (lastNameComparison !== 0) return lastNameComparison;
      return firstNameA.localeCompare(firstNameB, 'sv');
    });

    return sortedBillingResults;
  } catch (error) {
    console.error('[FE] Error during file processing and billing:', error);
    throw error; // Re-throw to be caught by the UI
  }
};

export default processAndBill;
