import React, { useState, useMemo } from 'react';
import DownloadIcon from '@mui/icons-material/Download';
import { exportToExcel, SheetConfig } from './exportToExcel';
import { Box, Typography, Paper, Button, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

// Define which keys of CombinedData are sortable
export type OrderableCombinedDataKeys = 
  'eventorCompetitionName' |
  'eventorCompetitionDate' |
  'eventorTotalFee' |
  'parsedInvoiceNumber' | // Allow sorting by invoice number
  'parsedInvoiceTotalAmount' |
  'diff';
import { ParticipationData } from './ResultsTable'; // Assuming this is the correct path
import { TableSortLabel } from '@mui/material';

// Helper function to format numbers with Swedish locale
const formatNumberSv = (value: number | undefined | null, options?: Intl.NumberFormatOptions): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '-'; // Placeholder for undefined, null, or NaN values
  }
  const defaultOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  };
  return new Intl.NumberFormat('sv-SE', { ...defaultOptions, ...options }).format(value);
};

// Helper function to get cell styling based on diff value
const getDiffCellStyle = (diff: number | undefined | null): React.CSSProperties => {
  if (diff === undefined || diff === null || isNaN(diff)) {
    return {}; // Default style
  }
  if (diff === 0) {
    return { color: 'green', fontWeight: 'bold' };
  } else if (diff > 0) {
    return { color: '#dc3545' }; // Bootstrap danger red - Eventor is higher
  } else { // diff < 0
    return { color: '#ffc107' }; // Bootstrap warning yellow/orange - Invoice is higher
  }
};



// Interface for the detailed parsed information from a single invoice PDF
interface ParsedInvoiceInfo {
  competitionName: string | null;
  date: string | null;
  totalAmount: string | null; // Will be string like "12345" from backend, needs parsing to number
  invoiceNumber: string | null;
}

// Interface for the structure of each item in the 'extractedData' array from the backend
export interface UploadedInvoiceData {
  filename: string;
  type: 'pdf' | 'zip' | 'unsupported' | 'error';
  pageCount?: number;
  textPreview?: string;
  parsedInfo?: ParsedInvoiceInfo; // For PDF files
  containedPdfs?: Array<{ // For ZIP files
    entryName: string;
    pageCount: number;
    textPreview: string;
    parsedInfo: ParsedInvoiceInfo;
  }>;
  message?: string; // For errors or unsupported types
}

// Interface for the data structure of each row in the reconciliation table
interface CombinedData {
  eventorCompetitionName: string;
  eventorCompetitionDate: string;
  eventorTotalFee: number;
  matchedPdf?: UploadedInvoiceData; // Optional, as not all Eventor entries will have a match
  isMatched: boolean;
  parsedInvoiceCompetitionName?: string;
  parsedInvoiceDate?: string;
  parsedInvoiceTotalAmount?: number;
  parsedInvoiceNumber?: string;
  parsedInvoiceFilename?: string;
  diff?: number; // Difference between eventorTotalFee and parsedInvoiceTotalAmount
}

// Helper function to normalize competition names for fuzzy matching
const normalizeNameForFuzzyMatching = (name: string | null | undefined): string => {
  if (!name) return '';
  // Konvertera till gemener, ta bort ALLA mellanslag, trimma sedan (trim är lite redundant men ofarligt)
  return name.toLowerCase().replace(/\s+/g, '').trim();
};

// Original stricter normalization, might be useful elsewhere or for specific exact matches if needed later.
const normalizeNameForExactMatching = (name: string | null | undefined): string => {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/gi, '');
};

interface InvoiceReconciliationTableProps {
  results: ParticipationData[];
  // selectedFiles: File[] | null; // Removed, handled in main.tsx
  // setSelectedFiles: React.Dispatch<React.SetStateAction<File[] | null>>; // Removed, handled in main.tsx
  parsedInvoiceDataList: UploadedInvoiceData[];
  setParsedInvoiceDataList: React.Dispatch<React.SetStateAction<UploadedInvoiceData[]>>; // This might also be removed if main.tsx directly updates and passes down the final list
  order: 'asc' | 'desc';
  setOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  orderBy: OrderableCombinedDataKeys;
  setOrderBy: React.Dispatch<React.SetStateAction<OrderableCombinedDataKeys>>;
}

const InvoiceReconciliationTable: React.FC<InvoiceReconciliationTableProps> = ({
  results,
  // selectedFiles, // Removed
  // setSelectedFiles, // Removed
  parsedInvoiceDataList,
  setParsedInvoiceDataList, // Keep for now, main.tsx will pass the updated list
  order,
  setOrder,
  orderBy,
  setOrderBy,
}) => {

  const handleExportReconciliation = () => {
    const reconciledSheetData: SheetConfig = {
      sheetName: 'Avstämda Fakturor',
      data: reconciliationTableRows.map(row => ({
        'Tävling (Eventor)': row.eventorCompetitionName,
        'Datum (Eventor)': row.eventorCompetitionDate,
        'Avgift (Eventor)': row.eventorTotalFee,
        'Matchad': row.isMatched ? 'Ja' : 'Nej',
        'Fakturanummer': row.parsedInvoiceNumber || '-',
        'Tävling (Faktura)': row.parsedInvoiceCompetitionName || '-',
        'Datum (Faktura)': row.parsedInvoiceDate || '-',
        'Belopp (Faktura)': row.parsedInvoiceTotalAmount,
        'Differens': row.diff,
        'Filnamn (Faktura)': row.parsedInvoiceFilename || '-',
      })),
      columnOrder: [
        'Tävling (Eventor)',
        'Datum (Eventor)',
        'Avgift (Eventor)',
        'Matchad',
        'Fakturanummer',
        'Tävling (Faktura)',
        'Datum (Faktura)',
        'Belopp (Faktura)',
        'Differens',
        'Filnamn (Faktura)',
      ],
    };

    const unmatchedSheetData: SheetConfig = {
      sheetName: 'Ej Matchade Fakturor',
      data: unmatchedInvoiceRows.map(row => {
        let parsedAmount: number | undefined = undefined;
        if (row.totalAmount) {
          const rawAmount = String(row.totalAmount).replace(/\s/g, '').replace(',', '.');
          const tempAmount = parseFloat(rawAmount);
          if (!isNaN(tempAmount)) {
            parsedAmount = tempAmount;
          }
        }
        return {
          'Filnamn (Ursprung)': row.entryName ? `${row.filename} (${row.entryName})` : row.filename,
          'Fakturanummer': row.invoiceNumber || '-',
          'Tävlingsnamn (Faktura)': row.competitionName || '-',
          'Datum (Faktura)': row.date || '-',
          'Belopp (Faktura)': parsedAmount,
        };
      }),
      columnOrder: [
        'Filnamn (Ursprung)',
        'Fakturanummer',
        'Tävlingsnamn (Faktura)',
        'Datum (Faktura)',
        'Belopp (Faktura)',
      ],
    };

    if (reconciledSheetData.data.length === 0 && unmatchedSheetData.data.length === 0) {
      alert('Ingen data att exportera.');
      return;
    }

    exportToExcel([reconciledSheetData, unmatchedSheetData], 'Fakturaavstamning');
  };

  const handleRequestSort = (property: OrderableCombinedDataKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  // 1. Aggregate Eventor data: Group participations by competition to get unique competitions and sum of fees
  const aggregatedEventorCompetitions = useMemo(() => {
    const competitionsMap: Map<string, { date: string; totalFee: number }> = new Map();

    results.forEach(item => {
      const key = `${item.CompetitionName}|${item.CompetitionDate}`;
      if (!competitionsMap.has(key)) {
        competitionsMap.set(key, { date: item.CompetitionDate, totalFee: 0 });
      }
      competitionsMap.get(key)!.totalFee += item.feeAmount; // Summing up feeAmount for total
    });

    return Array.from(competitionsMap.entries()).map(([key, data]) => ({
      competitionName: key.split('|')[0],
      competitionDate: data.date,
      eventorTotalFee: data.totalFee,
    }));
  }, [results]);

  // 2. Create reconciliation table rows by matching aggregated Eventor data with parsed invoice data
  const reconciliationTableRows = useMemo(() => {
    console.log('DEBUG: First aggregatedEventorCompetition:', aggregatedEventorCompetitions.length > 0 ? JSON.stringify(aggregatedEventorCompetitions[0], null, 2) : 'aggregatedEventorCompetitions is empty');
    const rows: CombinedData[] = [];

    // Flatten parsed invoice data and prepare for matching
    // Keep a reference to the original UploadedInvoiceData object
    const availableInvoices: Array<ParsedInvoiceInfo & { fuzzyNormalizedName: string; trimmedDate: string; originalFile: UploadedInvoiceData; entryName?: string }> = [];
    console.log('DEBUG: parsedInvoiceDataList before loop:', JSON.stringify(parsedInvoiceDataList, null, 2));

    parsedInvoiceDataList.forEach(uploadedFile => {
      if (uploadedFile.type === 'pdf' && uploadedFile.parsedInfo && uploadedFile.parsedInfo.competitionName) {
        availableInvoices.push({
          ...uploadedFile.parsedInfo,
          fuzzyNormalizedName: normalizeNameForFuzzyMatching(uploadedFile.parsedInfo.competitionName),
          trimmedDate: uploadedFile.parsedInfo.date?.trim() || '',
          originalFile: uploadedFile, // The PDF file object itself
        });
      } else if (uploadedFile.type === 'zip' && uploadedFile.containedPdfs) {
        uploadedFile.containedPdfs.forEach(pdfInZip => {
          if (pdfInZip.parsedInfo && pdfInZip.parsedInfo.competitionName) {
            // Ensure competitionName is not null before using it for normalization
            const competitionName = pdfInZip.parsedInfo.competitionName;
            if (competitionName) { // Extra check for robustness, though outer if should catch null
              availableInvoices.push({
                ...pdfInZip.parsedInfo,
                competitionName, // Ensure we use the non-null version
                fuzzyNormalizedName: normalizeNameForFuzzyMatching(competitionName),
                trimmedDate: pdfInZip.parsedInfo.date?.trim() || '',
                originalFile: uploadedFile, // The ZIP file object
                entryName: pdfInZip.entryName, // To identify the specific PDF within the ZIP
              });
            }
          }
        });
      }
    });
    console.log('DEBUG: availableInvoices for matching:', JSON.stringify(availableInvoices, null, 2));

    // Create a mutable copy of available invoices to 'consume' them as they are matched
    let mutableAvailableInvoices = [...availableInvoices];

    aggregatedEventorCompetitions.forEach(eventorComp => {
      const rawEventorName = eventorComp.competitionName; // Behåll rånamnet för loggning
      const normalizedEventorCompName = normalizeNameForFuzzyMatching(rawEventorName);
      const trimmedEventorCompDate = eventorComp.competitionDate?.trim() || '';
      
      // NY LOGG FÖR ATT VERIFIERA NORMALISERINGEN
      console.log(`DEBUG PRE-CHECK: Raw Eventor: '${rawEventorName}', Output of normalizeNameForFuzzyMatching: '${normalizedEventorCompName}'`);

      console.log(`DEBUG: Attempting to match Eventor: '${rawEventorName}' (Fuzzy Normalized: '${normalizedEventorCompName}', Date: '${trimmedEventorCompDate}')`);

      let matchedInvoiceIndex = -1;
      const matchedInvoiceData = mutableAvailableInvoices.find((invoice, index) => {
        // Date must match exactly
        if (invoice.trimmedDate !== trimmedEventorCompDate) {
          return false;
        }
        // Fuzzy name matching: one contains the other
        const nameMatch = normalizedEventorCompName.includes(invoice.fuzzyNormalizedName) || 
                        invoice.fuzzyNormalizedName.includes(normalizedEventorCompName);
        if (nameMatch) {
          matchedInvoiceIndex = index;
          return true;
        } else if (invoice.totalAmount !== null && invoice.totalAmount !== undefined) { // Log only if totalAmount was present but unparseable
          console.warn(`WARN: Could not parse totalAmount '${invoice.totalAmount}' for invoice ${invoice.invoiceNumber} (Entry: ${invoice.entryName || 'N/A'}) to a number.`);
        } else {
          console.log(`DEBUG: totalAmount is null or undefined for invoice ${invoice.invoiceNumber} (Entry: ${invoice.entryName || 'N/A'})`);
        }
      });
      console.log('DEBUG: matchedInvoiceData result:', matchedInvoiceData);

      let rowIsMatched = false;
      let rowParsedInvoiceCompetitionName: string | null | undefined = undefined;
      let rowParsedInvoiceDate: string | null | undefined = undefined;
      let rowParsedInvoiceTotalAmount: number | undefined = undefined;
      let rowParsedInvoiceNumber: string | null | undefined = undefined;
      let rowParsedInvoiceFilename: string | undefined = undefined;
      let rowDiff: number | undefined = undefined;
      // let rowMatchedPdfObject: UploadedInvoiceData | undefined = undefined; // If CombinedData.matchedPdf is strictly needed

      if (matchedInvoiceData) {
        rowIsMatched = true;
        console.log(`DEBUG: Matched invoice ${matchedInvoiceData.invoiceNumber} (Entry: ${matchedInvoiceData.entryName || 'N/A'}) has totalAmount: '${matchedInvoiceData.totalAmount}'`);

        if (matchedInvoiceData.totalAmount) {
          const rawAmount = matchedInvoiceData.totalAmount.replace(/\s/g, '').replace(',', '.');
          const tempParsedAmount = parseFloat(rawAmount);
          console.log(`DEBUG: Parsed amount for ${matchedInvoiceData.invoiceNumber} (raw: '${rawAmount}', parsed: ${tempParsedAmount})`);

          if (tempParsedAmount !== undefined && !isNaN(tempParsedAmount)) {
            rowParsedInvoiceTotalAmount = tempParsedAmount;
            if (eventorComp.eventorTotalFee !== undefined && rowParsedInvoiceTotalAmount !== undefined) {
              rowDiff = eventorComp.eventorTotalFee - rowParsedInvoiceTotalAmount;
            }
          } else {
            console.warn(`WARN: Could not parse totalAmount '${matchedInvoiceData.totalAmount}' for invoice ${matchedInvoiceData.invoiceNumber} (Entry: ${matchedInvoiceData.entryName || 'N/A'}) to a number.`);
          }
        } else {
          console.log(`DEBUG: totalAmount is null or undefined for invoice ${matchedInvoiceData.invoiceNumber} (Entry: ${matchedInvoiceData.entryName || 'N/A'})`);
        }

        rowParsedInvoiceCompetitionName = matchedInvoiceData.competitionName ?? undefined;
        rowParsedInvoiceDate = matchedInvoiceData.date ?? undefined;
        rowParsedInvoiceNumber = matchedInvoiceData.invoiceNumber ?? undefined;
        rowParsedInvoiceFilename = matchedInvoiceData.entryName || matchedInvoiceData.originalFile.filename; // Prefer entryName for ZIPs, fallback to originalFile.filename
        
        // Example for populating CombinedData.matchedPdf if it were used:
        // rowMatchedPdfObject = {
        //   filename: matchedInvoiceData.originalFilename,
        //   type: 'pdf', // Or derive dynamically if possible
        //   parsedInfo: { // Reconstruct ParsedInvoiceInfo part
        //     competitionName: matchedInvoiceData.competitionName,
        //     date: matchedInvoiceData.date,
        //     totalAmount: matchedInvoiceData.totalAmount, // original string form
        //     invoiceNumber: matchedInvoiceData.invoiceNumber,
        //   },
        //   entryName: matchedInvoiceData.entryName, // Include if part of UploadedInvoiceData structure
        // };

        if (matchedInvoiceIndex > -1) {
          mutableAvailableInvoices.splice(matchedInvoiceIndex, 1);
        }
      }
      console.log(`DEBUG: For Eventor '${eventorComp.competitionName}': isMatched: ${rowIsMatched}, invoiceTotal: ${rowParsedInvoiceTotalAmount}, diff: ${rowDiff}, ParsedFilename: ${rowParsedInvoiceFilename}, Remaining Invoices: ${mutableAvailableInvoices.length}`);

      rows.push({
        eventorCompetitionName: eventorComp.competitionName,
        eventorCompetitionDate: eventorComp.competitionDate,
        eventorTotalFee: eventorComp.eventorTotalFee,
        // matchedPdf: rowMatchedPdfObject, // Assign if using this field in CombinedData
        isMatched: rowIsMatched,
        parsedInvoiceCompetitionName: rowParsedInvoiceCompetitionName,
        parsedInvoiceDate: rowParsedInvoiceDate,
        parsedInvoiceTotalAmount: rowParsedInvoiceTotalAmount,
        parsedInvoiceNumber: rowParsedInvoiceNumber,
        parsedInvoiceFilename: rowParsedInvoiceFilename,
        diff: rowDiff,
      });
    });

    // Sort rows before returning
    const sortedRows = rows.sort((a, b) => {
      let comparison = 0;
      const valA = a[orderBy];
      const valB = b[orderBy];

      // Handle undefined/null for numeric and date fields to sort them consistently
      // For numeric fields (eventorTotalFee, parsedInvoiceTotalAmount, diff)
      if (orderBy === 'eventorTotalFee' || orderBy === 'parsedInvoiceTotalAmount' || orderBy === 'diff') {
        const numA = valA as number | undefined;
        const numB = valB as number | undefined;
        if (numA === undefined || numA === null) comparison = 1; // undefined/null goes last
        else if (numB === undefined || numB === null) comparison = -1; // undefined/null goes last
        else if (numA < numB) comparison = -1;
        else if (numA > numB) comparison = 1;

      } else {
        // String sorting (eventorCompetitionName, eventorCompetitionDate)
        const strA = (valA as string)?.toLowerCase() || '';
        const strB = (valB as string)?.toLowerCase() || '';
        comparison = strA.localeCompare(strB, 'sv');
      }
      return order === 'asc' ? comparison : -comparison;
    });

    return sortedRows;
  }, [aggregatedEventorCompetitions, parsedInvoiceDataList, order, orderBy]);

  // 3. Identify unmatched invoices
  const unmatchedInvoiceRows = useMemo(() => {
    // This logic assumes reconciliationTableRows has been processed and mutableAvailableInvoices
    // from its scope now contains only the invoices that were NOT matched.
    // To make this cleaner, we need to re-filter parsedInvoiceDataList against matched invoice numbers.

    const matchedInvoiceNumbers = new Set<string>();
    reconciliationTableRows.forEach(row => {
      if (row.isMatched && row.parsedInvoiceNumber) {
        matchedInvoiceNumbers.add(row.parsedInvoiceNumber);
      }
    });

    const unmatched: Array<ParsedInvoiceInfo & { filename: string, entryName?: string }> = [];
    parsedInvoiceDataList.forEach(uploadedFile => {
      if (uploadedFile.type === 'pdf' && uploadedFile.parsedInfo) {
        if (!uploadedFile.parsedInfo.invoiceNumber || !matchedInvoiceNumbers.has(uploadedFile.parsedInfo.invoiceNumber)) {
          unmatched.push({
            ...uploadedFile.parsedInfo,
            filename: uploadedFile.filename,
          });
        }
      } else if (uploadedFile.type === 'zip' && uploadedFile.containedPdfs) {
        uploadedFile.containedPdfs.forEach(pdfInZip => {
          if (pdfInZip.parsedInfo) {
            if (!pdfInZip.parsedInfo.invoiceNumber || !matchedInvoiceNumbers.has(pdfInZip.parsedInfo.invoiceNumber)) {
              unmatched.push({
                ...pdfInZip.parsedInfo,
                filename: uploadedFile.filename, // Original ZIP filename
                entryName: pdfInZip.entryName, // Specific PDF entry name in ZIP
              });
            }
          }
        });
      }
    });
    return unmatched;
  }, [parsedInvoiceDataList, reconciliationTableRows]);

  // Old placeholder, can be removed or adapted if still needed for other purposes
  const competitions_OLD_PLACEHOLDER = React.useMemo(() => {
    const grouped: { [key: string]: ParticipationData[] } = {};
    results.forEach(item => {
      if (!grouped[item.CompetitionName]) {
        grouped[item.CompetitionName] = [];
      }
      grouped[item.CompetitionName].push(item);
    });
    return Object.entries(grouped).map(([competitionName, participations]) => ({
      competitionName,
      competitionDate: participations[0]?.CompetitionDate, // Assuming all have same date
      participantsCount: participations.length,
      // Placeholder for invoice data
      invoiceAmount: null,
      invoiceStatus: 'Faktura saknas',
    }));
  }, [results]); // End of old competitions placeholder

  // If no Eventor results, show a message instead of the upload UI and table
  if (!results || results.length === 0) {
    return (
      <Paper sx={{ padding: 2, margin: 2, textAlign: 'center' }}>
        <Typography variant="h6">Inga Eventor-resultat att matcha mot.</Typography>
        <Typography variant="body1">Ladda upp en Eventor-fil först för att kunna stämma av fakturor.</Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper sx={{ padding: 2, margin: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Fakturaavstämning mot Eventor
          </Typography>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportReconciliation}
            disabled={reconciliationTableRows.length === 0 && unmatchedInvoiceRows.length === 0}
            sx={{ mb: 2 }}
          >
            Exportera Avstämning
          </Button>
        </Box>

        {/* Reconciliation Table Section */}
        {reconciliationTableRows.length > 0 ? (
          <TableContainer component={Paper} sx={{ mt: 3, boxShadow: 3, maxHeight: '60vh', overflow: 'auto' }}>
            <Table stickyHeader sx={{ minWidth: 650 }} size="small" aria-label="invoice reconciliation table">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.200' }}>
                  <TableCell sx={{ fontWeight: 'bold', padding: '10px', minWidth: '200px' }}>
                    <TableSortLabel
                      active={orderBy === 'eventorCompetitionName'}
                      direction={orderBy === 'eventorCompetitionName' ? order : 'asc'}
                      onClick={() => handleRequestSort('eventorCompetitionName')}
                    >
                      Tävling (Eventor)
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', padding: '10px' }}>
                    <TableSortLabel
                      active={orderBy === 'eventorCompetitionDate'}
                      direction={orderBy === 'eventorCompetitionDate' ? order : 'asc'}
                      onClick={() => handleRequestSort('eventorCompetitionDate')}
                    >
                      Datum (Eventor)
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', padding: '10px' }} align="right">
                    <TableSortLabel
                      active={orderBy === 'eventorTotalFee'}
                      direction={orderBy === 'eventorTotalFee' ? order : 'asc'}
                      onClick={() => handleRequestSort('eventorTotalFee')}
                    >
                      Totalavgift (Eventor)
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="left" sortDirection={orderBy === 'parsedInvoiceNumber' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'parsedInvoiceNumber'}
                      direction={orderBy === 'parsedInvoiceNumber' ? order : 'asc'}
                      onClick={() => handleRequestSort('parsedInvoiceNumber')}
                    >
                      Fakturanummer
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', padding: '10px' }} align="right">
                    <TableSortLabel
                      active={orderBy === 'parsedInvoiceTotalAmount'}
                      direction={orderBy === 'parsedInvoiceTotalAmount' ? order : 'asc'}
                      onClick={() => handleRequestSort('parsedInvoiceTotalAmount')}
                    >
                      Fakturerat Belopp (PDF)
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', padding: '10px' }} align="right">
                    <TableSortLabel
                      active={orderBy === 'diff'}
                      direction={orderBy === 'diff' ? order : 'asc'}
                      onClick={() => handleRequestSort('diff')}
                    >
                      Diff
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', padding: '10px' }}>Filnamn (Faktura)</TableCell> {/* Added filename column header */}
                </TableRow>
              </TableHead>
              <TableBody>
                {reconciliationTableRows.map((row, index) => (
                  <TableRow
                    key={`${row.eventorCompetitionName}-${row.eventorCompetitionDate}-${index}`}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      backgroundColor: row.isMatched && row.diff !== undefined
                        ? (row.diff === 0 ? '#e9f5e9' : (row.diff < 0 ? '#fff8e1' : '#fdecea')) // Softer shades
                        : 'inherit',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    <TableCell component="th" scope="row" sx={{ padding: '8px 10px', minWidth: '200px' }}>
                      {row.eventorCompetitionName}
                    </TableCell>
                    <TableCell sx={{ padding: '8px 10px' }}>{row.eventorCompetitionDate}</TableCell>
                    <TableCell align="right" sx={{ padding: '8px 10px' }}>{formatNumberSv(row.eventorTotalFee)}</TableCell>
                    <TableCell align="left" sx={{ padding: '8px 10px' }}>
                      {row.parsedInvoiceNumber || '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ padding: '8px 10px' }}>{formatNumberSv(row.parsedInvoiceTotalAmount)}</TableCell>
                    <TableCell align="right" sx={{ padding: '8px 10px', ...getDiffCellStyle(row.diff) }}>{formatNumberSv(row.diff)}</TableCell>
                    <TableCell sx={{ padding: '8px 10px' }}>{row.parsedInvoiceFilename || '-'}</TableCell> {/* Added filename cell */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography sx={{ mt: 3, fontStyle: 'italic' }}>Inga matchade eller oavstämda rader att visa baserat på uppladdade fakturor.</Typography>
        )}
      </Paper>

      {/* Unmatched Invoices Table */}
      {unmatchedInvoiceRows.length > 0 && (
        <Paper sx={{ padding: 2, margin: 2, marginTop: 4 }}>
          <Typography variant="h6" component="h3" sx={{ marginBottom: 2 }}>
            Ej matchade fakturor
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: '40vh', overflow: 'auto' }}>
            <Table stickyHeader size="small" aria-label="unmatched invoices table">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 'bold', padding: '10px' }}>Filnamn (Ursprung)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', padding: '10px' }}>Fakturanummer</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', padding: '10px' }}>Tävlingsnamn (Faktura)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', padding: '10px' }}>Datum (Faktura)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', padding: '10px' }} align="right">Belopp (Faktura)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unmatchedInvoiceRows.map((invoice, index) => (
                  <TableRow key={`${invoice.invoiceNumber || 'unmatched'}-${index}`} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell sx={{ padding: '8px 10px' }}>{invoice.entryName ? `${invoice.filename} -> ${invoice.entryName}` : invoice.filename}</TableCell>
                    <TableCell sx={{ padding: '8px 10px' }}>{invoice.invoiceNumber || '-'}</TableCell>
                    <TableCell sx={{ padding: '8px 10px' }}>{invoice.competitionName || '-'}</TableCell>
                    <TableCell sx={{ padding: '8px 10px' }}>{invoice.date || '-'}</TableCell>
                    <TableCell align="right" sx={{ padding: '8px 10px' }}>{formatNumberSv(parseFloat(invoice.totalAmount?.replace(/\s/g, '').replace(',', '.') || '0'))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </>
  );
};

export default InvoiceReconciliationTable;
