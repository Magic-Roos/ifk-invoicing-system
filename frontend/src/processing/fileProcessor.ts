import * as xlsx from 'xlsx';
import Papa from 'papaparse';
import * as ruleEngineService from './ruleEngineService';
import { BillingResult, ParticipationData, RawDataItem } from '../types';

// Mappings for common column name variations from Eventor exports
const columnMappings = {
  personId: ["Person-id", "PersonId", "Personnummer", "Medlemsnr"],
  firstName: ["Förnamn", "First Name"],
  lastName: ["Efternamn", "Last Name", "Surname"],
  competition: ["Tävling", "Competition", "Tävlingsnamn"],
  date: ["Datum", "Date", "Tävlingsdatum"],
  arranger: ["Arrangör", "Organizer", "Arrangörsförening"],
  eventType: ["Arrangemangstyp", "Event Type"],
  birthYear: ["Födelseår", "Birth Year", "Född"],
  class: ["Klass", "Class", "Tävlingsklass"],
  classType: ["Klasstyp", "Class Type"],
  started: ["Startat", "Started", "Har startat"],
  placement: ["Placering", "Placement", "Plac"],
  time: ["Tid", "Time", "Resultat"],
  ordinaryFee: ["Ordinarie avgift", "Avgift", "Ord.Avgift", "Anmälningsavgift"],
  lateFee: ["Efteranmälningsavgift", "Efteranm.avgift", "Late Fee"],
  serviceFees: ["Tjänsteavgifter", "Serviceavgifter", "Serviceavgift", "Brickhyra", "Hyrbricka"]
};

// Helper to get a value from an item using mapped keys (case-insensitive)
const getVal = (item: RawDataItem, possibleKeys: string[], defaultValue: any = null): any => {
  const itemKeys = Object.keys(item);
  for (const pKey of possibleKeys) {
    for (const itemKey of itemKeys) {
      if (itemKey.toLowerCase() === pKey.toLowerCase()) {
        return item[itemKey];
      }
    }
  }
  return defaultValue;
};

// Helper to parse CSV using PapaParse in the browser
const parseCsv = (file: File): Promise<RawDataItem[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as RawDataItem[]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

// Main function to process the uploaded file
const _processFileData = async (fileBuffer: ArrayBuffer, file: File): Promise<BillingResult[]> => {
  let parsedData: RawDataItem[] = [];
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    console.log('[FE] Attempting to parse CSV');
    // PapaParse works better with the File object directly
    parsedData = await parseCsv(file);
    console.log('[FE] CSV parsed, records:', parsedData.length);
  } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
    console.log('[FE] Attempting to parse Excel');
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    parsedData = xlsx.utils.sheet_to_json(worksheet);
    console.log('[FE] Excel parsed, records:', parsedData.length);
  } else {
    throw new Error('Unsupported file type. Please upload CSV or Excel.');
  }

  // Standardize data using mapped column names
  const standardizedData: ParticipationData[] = [];
  parsedData.forEach(item => {
    const competitionDateStr = getVal(item, columnMappings.date);
    const birthYearStr = getVal(item, columnMappings.birthYear);
    const firstName = getVal(item, columnMappings.firstName, '');
    const lastName = getVal(item, columnMappings.lastName, '');
    const competitionName = getVal(item, columnMappings.competition);
    const timeRaw = getVal(item, columnMappings.time);
    const startedRaw = getVal(item, columnMappings.started);

    let age: number | null = null;
    if (competitionDateStr && birthYearStr) {
      try {
        let parsableDateStr = competitionDateStr;
        if (typeof competitionDateStr === 'string' && competitionDateStr.includes(' - ')) {
          parsableDateStr = competitionDateStr.split(' - ')[0].trim();
        }
        const competitionDateObj = new Date(parsableDateStr);
        if (!isNaN(competitionDateObj.getFullYear())) {
          const competitionYear = competitionDateObj.getFullYear();
          age = competitionYear - parseInt(birthYearStr, 10);
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
      if (timeLower !== 'ej start' && timeLower !== 'dns' && timeLower.trim() !== '') {
        hasStarted = true;
      }
    }

    const baseParticipationData: Omit<ParticipationData, 'feeAmount' | 'feeType' | 'description'> = {
      PersonId: getVal(item, columnMappings.personId),
      MemberName: memberName,
      CompetitionName: competitionName,
      CompetitionDate: competitionDateStr,
      Arranger: getVal(item, columnMappings.arranger),
      EventType: getVal(item, columnMappings.eventType),
      BirthYear: birthYearStr ? parseInt(birthYearStr, 10) : null,
      ClassName: getVal(item, columnMappings.class),
      ClassType: getVal(item, columnMappings.classType),
      Started: hasStarted,
      Placement: getVal(item, columnMappings.placement),
      Time: timeRaw,
      age: age,
      isSMCompetition: !!(competitionName && competitionName.includes('SM')),
    };

    const ordinaryFeeRaw = getVal(item, columnMappings.ordinaryFee, '0');
    const ordinaryFee = parseFloat(String(ordinaryFeeRaw).replace(',', '.')) || 0;
    if (ordinaryFee > 0) {
      standardizedData.push({
        ...baseParticipationData,
        feeAmount: ordinaryFee,
        feeType: (timeRaw && String(timeRaw).toLowerCase() === 'ej start') ? 'DNS' : 'Standard Startavgift',
        description: (timeRaw && String(timeRaw).toLowerCase() === 'ej start') ? 'Ej start' : 'Startavgift',
      });
    }

    const lateFeeRaw = getVal(item, columnMappings.lateFee, '0');
    const lateFee = parseFloat(String(lateFeeRaw).replace(',', '.')) || 0;
    if (lateFee > 0) {
      standardizedData.push({
        ...baseParticipationData,
        feeAmount: lateFee,
        feeType: 'Late',
        description: 'Efteranmälningsavgift',
      });
    }

    const serviceFeeRaw = getVal(item, columnMappings.serviceFees, '0');
    const serviceFee = parseFloat(String(serviceFeeRaw).replace(',', '.')) || 0;
    if (serviceFee > 0) {
      standardizedData.push({
        ...baseParticipationData,
        feeAmount: serviceFee,
        feeType: 'ChipRental',
        description: 'Hyrbricka/Tjänsteavgift',
      });
    }
  });

  console.log('[FE] Data standardized, count:', standardizedData.length);
  console.log('[FE] Applying invoicing rules...');
  const billingResults = ruleEngineService.applyInvoicingRules(standardizedData);
  console.log('[FE] Invoicing rules applied, results count:', billingResults.length);

  const sortedBillingResults = [...billingResults].sort((a, b) => {
    const namePartsA = a.MemberName.split(' ');
    const namePartsB = b.MemberName.split(' ');
    const lastNameA = (namePartsA.length > 1 ? namePartsA.pop() || '' : namePartsA[0] || '').toLowerCase();
    const lastNameB = (namePartsB.length > 1 ? namePartsB.pop() || '' : namePartsB[0] || '').toLowerCase();
    const firstNameA = (namePartsA[0] || '').toLowerCase();
    const firstNameB = (namePartsB[0] || '').toLowerCase();
    const lastNameComparison = lastNameA.localeCompare(lastNameB, 'sv');
    if (lastNameComparison !== 0) return lastNameComparison;
    return firstNameA.localeCompare(firstNameB, 'sv');
  });

  return sortedBillingResults;
};

// The single exported function for the frontend to use
export const processFile = (file: File): Promise<BillingResult[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      if (event.target && event.target.result) {
        try {
          const fileBuffer = event.target.result as ArrayBuffer;
          const results = await _processFileData(fileBuffer, file);
          resolve(results);
        } catch (error) {
          console.error('Error processing file data:', error);
          reject(error);
        }
      } else {
        reject(new Error('Failed to read file.'));
      }
    };

    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(error);
    };

    // Read the file as an ArrayBuffer, which works for both xlsx and papaparse
    reader.readAsArrayBuffer(file);
  });
};
