const xlsx = require('xlsx');
const csv = require('csv-parser');
const stream = require('stream');
const fs = require('fs').promises; // For reading local file asynchronously
const path = require('path'); // For constructing file path
const ruleEngineService = require('../services/ruleEngineService');


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

// Helper function to get a value from an item using mapped keys
// Handles case-insensitivity for keys in the item
const getVal = (item, possibleKeys, defaultValue = null) => {
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

// Helper function to parse CSV buffer
const parseCsvBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// Internal helper function to process file data (buffer, name, type)
const _processFileData = async (fileBuffer, originalFilename, mimeType) => {
  let parsedData = [];

  if (mimeType === 'text/csv' || originalFilename.toLowerCase().endsWith('.csv')) {
    
    parsedData = await parseCsvBuffer(fileBuffer);
  } else if (
    mimeType === 'application/vnd.ms-excel' || // .xls
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
    originalFilename.toLowerCase().endsWith('.xls') ||
    originalFilename.toLowerCase().endsWith('.xlsx')
  ) {
    
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    parsedData = xlsx.utils.sheet_to_json(worksheet);
  } else {
    throw new Error('Unsupported file type. Please upload CSV or Excel.');
  }

  

  // Standardize data using mapped column names
  const standardizedData = [];
  parsedData.forEach(item => {
    const competitionDateStr = getVal(item, columnMappings.date);
    const birthYearStr = getVal(item, columnMappings.birthYear);
    const firstName = getVal(item, columnMappings.firstName, '');
    const lastName = getVal(item, columnMappings.lastName, '');
    const competitionName = getVal(item, columnMappings.competition);
    const timeRaw = getVal(item, columnMappings.time);
    const startedRaw = getVal(item, columnMappings.started);

    let age = null;
    let competitionDateObj = null;

    if (competitionDateStr) {
      try {
        let parsableDateStr = competitionDateStr;
        // If the date string contains " - ", assume it's a range and take the first date
        if (typeof competitionDateStr === 'string' && competitionDateStr.includes(' - ')) {
          parsableDateStr = competitionDateStr.split(' - ')[0].trim();
        }
        competitionDateObj = new Date(parsableDateStr);

        if (birthYearStr && !isNaN(competitionDateObj.getFullYear())) { // Also check if date parsing was successful
          const competitionYear = competitionDateObj.getFullYear();
          age = competitionYear - parseInt(birthYearStr, 10);
        }
      } catch (e) {
        // console.warn(`Could not parse date '${competitionDateStr}' for item:`, item); // Keep as comment for now, might be useful
      }
    }
    
    const memberName = `${firstName} ${lastName}`.trim();
    let hasStarted = false;
    if (startedRaw !== null) {
      const startedLower = String(startedRaw).toLowerCase();
      if (startedLower === '1' || startedLower === 'true' || startedLower === 'yes' || startedLower === 'ja') {
        hasStarted = true;
      }
    }
    if (!hasStarted && timeRaw) {
      const timeLower = String(timeRaw).toLowerCase();
      if (timeLower !== 'ej start' && timeLower !== 'dns' && timeLower.trim() !== '') {
        hasStarted = true;
      }
    }

    const baseParticipationData = {
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
      isSMCompetition: competitionName && competitionName.includes('SM'), // Check for exact 'SM' (uppercase)
      // isSummerPeriodEvent is now determined by the rule_summer_event_fee.js itself
    };


    const ordinaryFeeRaw = getVal(item, columnMappings.ordinaryFee, '0');
    const ordinaryFee = parseFloat(String(ordinaryFeeRaw).replace(',', '.')) || 0;
    if (ordinaryFee > 0) {
      let feeType = 'Standard Startavgift';
      if (timeRaw && String(timeRaw).toLowerCase() === 'ej start') {
        feeType = 'DNS';
      }
      let description = 'Startavgift';
      if (feeType === 'DNS') {
        description = 'Ej start';
      }
      standardizedData.push({
        ...baseParticipationData,
        feeAmount: ordinaryFee,
        feeType: feeType,
        description: description,
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

  
  
  
  const billingResults = ruleEngineService.applyInvoicingRules(standardizedData);

  

  const sortedBillingResults = [...billingResults].sort((a, b) => {
    const namePartsA = a.MemberName.split(' ');
    const namePartsB = b.MemberName.split(' ');
    const lastNameA = (namePartsA.length > 1 ? namePartsA[namePartsA.length - 1] : namePartsA[0] || '').toLowerCase();
    const lastNameB = (namePartsB.length > 1 ? namePartsB[namePartsB.length - 1] : namePartsB[0] || '').toLowerCase();
    const firstNameA = (namePartsA[0] || '').toLowerCase();
    const firstNameB = (namePartsB[0] || '').toLowerCase();
    const lastNameComparison = lastNameA.localeCompare(lastNameB, 'sv');
    if (lastNameComparison !== 0) return lastNameComparison;
    return firstNameA.localeCompare(firstNameB, 'sv');
  });

  return sortedBillingResults;
};

const handleParticipationUpload = async (req, res) => {
  if (!req.file || !req.file.buffer) {
    // This check might be redundant if multer is configured correctly in index.js and handles no file error
    return res.status(400).json({ message: 'No participation file was uploaded or file buffer is missing.' });
  }

  try {
    const billingResults = await _processFileData(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.status(200).json({
      message: 'File processed successfully by uploadController router.',
      filename: req.file.originalname,
      size: req.file.size,
      billingResults: billingResults,
    });
  } catch (error) {
    console.error('Error in /api/upload/participation route:', error);
    res.status(500).json({ message: 'Error processing participation file via router', error: error.message });
  }
};

const processLocalTestFile = async (req, res) => {
  const testFilePath = '/Users/stefan/CascadeProjects/ifk-invoicing-system/Sample data/Competitor summary 2024-01-01 - 2024-06-30.xls';
  const originalFilename = path.basename(testFilePath);
  // Determine a sensible MIME type, or make it generic if unsure for local files
  const mimeType = originalFilename.toLowerCase().endsWith('.csv') ? 'text/csv' :
                   originalFilename.toLowerCase().endsWith('.xls') ? 'application/vnd.ms-excel' :
                   originalFilename.toLowerCase().endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                   'application/octet-stream'; // Fallback MIME type
  
  try {
    const fileBuffer = await fs.readFile(testFilePath);

    const sortedBillingResults = await _processFileData(fileBuffer, originalFilename, mimeType);

    res.status(200).json({
      message: 'Local test file processed, standardized, and invoicing rules applied.',
      filename: originalFilename,
      size: fileBuffer.length,
      billingResults: sortedBillingResults
    });
  } catch (error) {
    console.error('Error processing local test file:', error);
    if (error.code === 'ENOENT') {
        return res.status(500).send(`Error processing local test file: File not found at ${testFilePath}`);
    }
    res.status(500).send(`Error processing local test file: ${error.message}`);
  }
};

const handleReprocessParticipation = async (req, res) => {
  try {
    const file = req.file; // Assuming multer is configured for 'participationFile'
    if (!file) {
      return res.status(400).json({ message: 'No participation file provided for reprocessing.' });
    }



    // Use the existing internal helper to process the file data
    // This assumes _processFileData and subsequently ruleEngineService.applyInvoicingRules
    // will use the latest/current rules.
    const results = await _processFileData(file.buffer, file.originalname, file.mimetype);

    res.status(200).json(results);
  } catch (error) {
    console.error('Error reprocessing participation file:', error);
    res.status(500).json({ message: 'Error reprocessing participation file', error: error.message });
  }
};

module.exports = {
  handleParticipationUpload,
  processLocalTestFile,
  _processFileData,
  handleReprocessParticipation
};
