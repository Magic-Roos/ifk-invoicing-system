import React, { useMemo } from 'react';
import DownloadIcon from '@mui/icons-material/Download';
import { exportToExcel, SheetConfig } from './exportToExcel';
import { Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@mui/material';
import { BillingResult, UploadedInvoiceData, ParsedInvoiceInfo, OrderableReconciliationKeys, ContainedPdfData } from './types';

// --- TYPE DEFINITIONS ---
interface HeadCell {
  id: OrderableReconciliationKeys;
  label: string;
  numeric: boolean;
  width?: string | number;    // For specific width
  maxWidth?: string | number; // For columns that can truncate
}

interface ReconciliationRow {
  id: string;
  eventorCompetitionName: string;
  eventorCompetitionDate: string;
  eventorTotalFee: number;
  invoiceOriginFile: string;
  invoiceCompetitionName: string | null;
  invoiceDate: string | null;
  invoiceTotalAmount: number | null;
  invoiceNumber: string | null;
  difference: number | null;
}

interface UnmatchedInvoiceRow extends ParsedInvoiceInfo {
  sourceFilename: string;
}

// --- PROPS INTERFACE ---
interface InvoiceReconciliationTableProps {
  results: BillingResult[];
  parsedInvoiceDataList: UploadedInvoiceData[];
  order: 'asc' | 'desc';
  setOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  orderBy: OrderableReconciliationKeys;
  setOrderBy: React.Dispatch<React.SetStateAction<OrderableReconciliationKeys>>;
}

// --- HELPER FUNCTIONS ---
const formatNumberSv = (value: number | undefined | null, options?: Intl.NumberFormatOptions): string => {
  if (value === undefined || value === null || isNaN(value)) return '-';
  return new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2, ...options }).format(value);
};

const getDiffCellStyle = (diff: number | undefined | null): React.CSSProperties => {
  if (diff === undefined || diff === null || isNaN(diff)) return {};
  if (Math.abs(diff) < 0.01) return { color: 'green', fontWeight: 'bold' };
  if (diff > 0) return { color: 'red' }; // Eventor is higher
  return { color: 'orange' }; // Invoice is higher
};

const getRowStyle = (diff: number | undefined | null): React.CSSProperties => {
  if (diff === undefined || diff === null || isNaN(diff)) return {};
  if (Math.abs(diff) < 0.01) return { backgroundColor: 'rgba(76, 175, 80, 0.1)' }; // Light green
  if (diff > 0) return { backgroundColor: 'rgba(244, 67, 54, 0.1)' }; // Light red
  return { backgroundColor: 'rgba(255, 152, 0, 0.1)' }; // Light orange
};

function descendingComparator<T>(a: T, b: T, orderBy: keyof T): number {
  // Handle null or undefined values consistently, e.g., by treating them as smaller or larger
  if (b[orderBy] == null && a[orderBy] != null) return -1;
  if (a[orderBy] == null && b[orderBy] != null) return 1;
  if (b[orderBy] == null && a[orderBy] == null) return 0;

  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

type Order = 'asc' | 'desc';

interface EventorCompetitionDateRange {
  startDate: Date;
  endDate: Date;
}

const parseEventorDateString = (dateStr: string): EventorCompetitionDateRange | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmedDateStr = dateStr.trim();
  const parts = trimmedDateStr.split(' - ');
  if (parts.length === 2) {
    const startDate = new Date(parts[0]);
    const endDate = new Date(parts[1]);
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      // Set time to ensure full day comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
  } else if (parts.length === 1) {
    const singleDate = new Date(parts[0]);
    if (!isNaN(singleDate.getTime())) {
      singleDate.setHours(0, 0, 0, 0); // Start of the day
      // For a single date, endDate is the end of that same day
      const endDateForSingle = new Date(singleDate);
      endDateForSingle.setHours(23, 59, 59, 999);
      return { startDate: singleDate, endDate: endDateForSingle };
    }
  }
  return null;
};

// Utility type to get the return type of an array's element from a function returning an array
type ArrayReturnType<T extends (...args: any) => any> = T extends (...args: any) => (infer R)[] ? R : any;

function getComparator<Key extends OrderableReconciliationKeys>(
  order: Order,
  orderBy: Key,
): (a: ReconciliationRow, b: ReconciliationRow) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number): T[] {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const getSimilarity = (name1: string, name2: string): number => {
  const normalize = (str: string) => 
    str.toLowerCase().replace(/[^a-z0-9åäö]+/gi, ' ').trim().split(/\s+/).filter(Boolean);

  const words1 = new Set(normalize(name1));
  const words2 = new Set(normalize(name2));
  if (words1.size === 0 || words2.size === 0) return 0;
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
};

// --- COMPONENT ---
const InvoiceReconciliationTable: React.FC<InvoiceReconciliationTableProps> = ({
  results,
  parsedInvoiceDataList,
  order,
  setOrder,
  orderBy,
  setOrderBy,
}) => {

  const handleRequestSort = (property: OrderableReconciliationKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const eventorDataByCompetition = useMemo(() => {
    const competitionMap = new Map<string, { competitionName: string; competitionStartDate: Date; competitionEndDate: Date; displayDate: string; eventorTotalFee: number }>();
    results.forEach(item => {
      // Key should be unique per competition instance, original date string is good for this
      const key = `${item.CompetitionName}|${item.CompetitionDate}`; 
      const dateRange = parseEventorDateString(item.CompetitionDate);

      if (dateRange) {
        const existing = competitionMap.get(key) || {
          competitionName: item.CompetitionName,
          competitionStartDate: dateRange.startDate,
          competitionEndDate: dateRange.endDate,
          displayDate: item.CompetitionDate, // Store original string for display
          eventorTotalFee: 0,
        };
        existing.eventorTotalFee += item.feeAmount;
        competitionMap.set(key, existing);
      }
    });
    return Array.from(competitionMap.values());
  }, [results]);

  const findBestMatch = React.useCallback((
    invoice: ParsedInvoiceInfo,
    eventorDataList: typeof eventorDataByCompetition,
    threshold: number
  ): { eventorCompetition: typeof eventorDataList[0]; score: number } | null => {
    if (!invoice.date || !invoice.competitionName) return null;
    
    const invoiceDateObj = new Date(invoice.date);
    invoiceDateObj.setHours(0,0,0,0); // Normalize invoice date to start of day for comparison
    if (isNaN(invoiceDateObj.getTime())) return null; // Invalid invoice date

    let bestMatch: { eventorCompetition: typeof eventorDataList[0]; score: number } | null = null;

    for (const eventorComp of eventorDataList) {
      // Date check: invoiceDateObj must be within eventorComp.competitionStartDate and eventorComp.competitionEndDate
      if (
        invoiceDateObj.getTime() >= eventorComp.competitionStartDate.getTime() &&
        invoiceDateObj.getTime() <= eventorComp.competitionEndDate.getTime()
      ) {
        const similarity = getSimilarity(eventorComp.competitionName, invoice.competitionName);
        if (similarity >= threshold && (!bestMatch || similarity > bestMatch.score)) {
          bestMatch = { eventorCompetition: eventorComp, score: similarity };
        }
      }
    }
    return bestMatch;
  }, []); // getSimilarity is stable

  const reconciliationTableRows = useMemo(() => {
    const rows: ReconciliationRow[] = [];
    const matchedInvoiceNumbers = new Set<string>();

    const processInvoice = (invoiceDataSource: ParsedInvoiceInfo, originFilename: string, eventorCompetitions: typeof eventorDataByCompetition) => {
      const rawInvoiceAmount = invoiceDataSource.totalAmount;
      const invoiceAmount = typeof rawInvoiceAmount === 'string' ? parseFloat(String(rawInvoiceAmount).replace(/,/g, '.')) : (rawInvoiceAmount ?? 0);
      const bestMatch = findBestMatch(invoiceDataSource, eventorCompetitions, 0.75);

      if (bestMatch && bestMatch.eventorCompetition && !matchedInvoiceNumbers.has(invoiceDataSource.invoiceNumber || '')) {
        rows.push({
          id: (bestMatch.eventorCompetition.competitionName + '-' + bestMatch.eventorCompetition.displayDate) + '-' + (invoiceDataSource.invoiceNumber || Math.random().toString()),
          eventorCompetitionName: bestMatch.eventorCompetition.competitionName,
          eventorCompetitionDate: bestMatch.eventorCompetition.displayDate, // Use displayDate for UI
          eventorTotalFee: bestMatch.eventorCompetition.eventorTotalFee,
          invoiceOriginFile: originFilename, // Actual PDF filename
          invoiceCompetitionName: invoiceDataSource.competitionName,
          invoiceDate: invoiceDataSource.date,
          invoiceTotalAmount: invoiceAmount,
          invoiceNumber: invoiceDataSource.invoiceNumber,
          difference: parseFloat((bestMatch.eventorCompetition.eventorTotalFee - invoiceAmount).toFixed(2)),
        });
        if (invoiceDataSource.invoiceNumber) matchedInvoiceNumbers.add(invoiceDataSource.invoiceNumber);
      }
    };

    parsedInvoiceDataList.forEach(uploadedInvoice => {
      if (uploadedInvoice.type === 'pdf' && uploadedInvoice.parsedInfo) {
        processInvoice(uploadedInvoice.parsedInfo, uploadedInvoice.filename, eventorDataByCompetition);
      } else if (uploadedInvoice.type === 'zip' && uploadedInvoice.containedPdfs) {
        uploadedInvoice.containedPdfs.forEach(containedPdf => {
          if (containedPdf.type === 'pdf' && containedPdf.parsedInfo) {
            processInvoice(containedPdf.parsedInfo, containedPdf.filename, eventorDataByCompetition);
          }
        });
      }
    });
    return rows;
  }, [parsedInvoiceDataList, eventorDataByCompetition, findBestMatch]); // findBestMatch is a dependency if defined outside

  const unmatchedInvoiceRows = useMemo(() => {
    const unmatched: UnmatchedInvoiceRow[] = [];
    const matchedInvoiceNumbersInTable = new Set(reconciliationTableRows.map(row => row.invoiceNumber).filter(Boolean) as string[]);

    const addUnmatched = (invoiceDataSource: ParsedInvoiceInfo, originFilename: string) => {
      // Check if this specific invoice instance (by invoice number, if available) is already matched
      // Or, if no invoice number, consider it unmatched if not processed by findBestMatch (which implies it didn't meet criteria)
      // A simpler approach: if it has an invoice number and that number is in matchedInvoiceNumbersInTable, it's matched.
      // Otherwise, if it has parsedInfo, it's potentially unmatched.
      if (invoiceDataSource.invoiceNumber && matchedInvoiceNumbersInTable.has(invoiceDataSource.invoiceNumber)) {
        return; // Already matched and in the reconciliation table
      }
      // If no invoice number, or invoice number not in matched set, add to unmatched
      unmatched.push({
        ...invoiceDataSource,
        sourceFilename: originFilename, // Actual PDF filename
      });
    };

    parsedInvoiceDataList.forEach(uploadedInvoice => {
      if (uploadedInvoice.type === 'pdf' && uploadedInvoice.parsedInfo) {
        addUnmatched(uploadedInvoice.parsedInfo, uploadedInvoice.filename);
      } else if (uploadedInvoice.type === 'zip' && uploadedInvoice.containedPdfs) {
        uploadedInvoice.containedPdfs.forEach(containedPdf => {
          if (containedPdf.type === 'pdf' && containedPdf.parsedInfo) {
            addUnmatched(containedPdf.parsedInfo, containedPdf.filename);
          }
        });
      }
    });
    return unmatched.filter(u => u.invoiceNumber ? !matchedInvoiceNumbersInTable.has(u.invoiceNumber) : true);
  }, [parsedInvoiceDataList, reconciliationTableRows]);

  const sortedRows = useMemo(() => {
    return stableSort(reconciliationTableRows, getComparator(order, orderBy));
  }, [reconciliationTableRows, order, orderBy]);

  const handleExportReconciliation = () => {
    const matchedSheet: SheetConfig<ReconciliationRow> = {
      sheetName: 'Avstämda Fakturor',
      data: sortedRows,
      columns: [
        { header: 'Tävlingsnamn (Eventor)', key: 'eventorCompetitionName' },
        { header: 'Datum (Eventor)', key: 'eventorCompetitionDate' }, // This will now show the displayDate string
        { header: 'Avgift (Eventor)', key: 'eventorTotalFee', isCurrency: true },
        { header: 'Fil', key: 'invoiceOriginFile' },
        { header: 'Tävlingsnamn (Faktura)', key: 'invoiceCompetitionName' },
        { header: 'Tävlingsdatum (Faktura)', key: 'invoiceDate' },
        { header: 'Belopp (Faktura)', key: 'invoiceTotalAmount', isCurrency: true },
        { header: 'Fakturanummer', key: 'invoiceNumber' },
        { header: 'Differens', key: 'difference', isCurrency: true },
      ]
    };
    const unmatchedSheet: SheetConfig<UnmatchedInvoiceRow> = {
      sheetName: 'Ej Matchade Fakturor',
      data: unmatchedInvoiceRows,
      columns: [
        { header: 'Filnamn (Ursprung)', key: 'sourceFilename' },
        { header: 'Fakturanummer', key: 'invoiceNumber' },
        { header: 'Tävlingsnamn (Faktura)', key: 'competitionName' },
        { header: 'Tävlingsdatum (Faktura)', key: 'date' },
        { header: 'Belopp (Faktura)', key: 'totalAmount', isCurrency: true, transform: (val) => {
            if (typeof val === 'string') {
              const num = parseFloat(val);
              return isNaN(num) ? 0 : num;
            }
            return val || 0;
          }
        },
      ]
    };
    exportToExcel([matchedSheet, unmatchedSheet], 'Fakturaavstamning.xlsx');
  };

  const headCells: readonly HeadCell[] = [
    { id: 'eventorCompetitionName', label: 'Tävlingsnamn (Eventor)', numeric: false, maxWidth: '200px' },
    { id: 'eventorCompetitionDate', label: 'Datum (Eventor)', numeric: false, width: '125px' },
    { id: 'eventorTotalFee', label: 'Avgift (Eventor)', numeric: true, width: '100px' },
    { id: 'invoiceOriginFile', label: 'Fil', numeric: false, maxWidth: '170px' },
    { id: 'invoiceCompetitionName', label: 'Tävlingsnamn (Faktura)', numeric: false, maxWidth: '200px' },
    { id: 'invoiceDate', label: 'Tävlingsdatum (Faktura)', numeric: false, width: '125px' },
    { id: 'invoiceTotalAmount', label: 'Belopp (Faktura)', numeric: true, width: '100px' },
    { id: 'invoiceNumber', label: 'Fakturanummer', numeric: false, width: '130px' },
    { id: 'difference', label: 'Differens', numeric: true, width: '100px' },
  ];

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Avstämning av Fakturor</Typography>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExportReconciliation} disabled={sortedRows.length === 0 && unmatchedInvoiceRows.length === 0}>Exportera Avstämning</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: '1250px', tableLayout: 'fixed' }} aria-label="reconciliation table">
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              {headCells.map((headCell) => (
                <TableCell
                key={headCell.id}
                align={headCell.numeric ? 'right' : 'left'}
                sortDirection={orderBy === headCell.id ? order : false}
                sx={{
                  width: headCell.width,
                  maxWidth: headCell.maxWidth,
                  // Allow header text to wrap by not setting whiteSpace: 'nowrap'
                }}
              >
                  <TableSortLabel active={orderBy === headCell.id} direction={orderBy === headCell.id ? order : 'asc'} onClick={() => handleRequestSort(headCell.id)}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{headCell.label}</Typography>
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows.length > 0 ? sortedRows.map((row) => (
              <TableRow key={row.id} hover style={getRowStyle(row.difference)}>
                <TableCell sx={{ maxWidth: headCells.find(h => h.id === 'eventorCompetitionName')?.maxWidth, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.eventorCompetitionName}</TableCell>
                <TableCell sx={{ width: headCells.find(h => h.id === 'eventorCompetitionDate')?.width, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.eventorCompetitionDate}</TableCell>
                <TableCell align="right" sx={{ width: headCells.find(h => h.id === 'eventorTotalFee')?.width, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatNumberSv(row.eventorTotalFee)}</TableCell>
                <TableCell sx={{ maxWidth: headCells.find(h => h.id === 'invoiceOriginFile')?.maxWidth, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.invoiceOriginFile}</TableCell>
                <TableCell sx={{ maxWidth: headCells.find(h => h.id === 'invoiceCompetitionName')?.maxWidth, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.invoiceCompetitionName || '-'}</TableCell>
                <TableCell sx={{ width: headCells.find(h => h.id === 'invoiceDate')?.width, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.invoiceDate}</TableCell>
                <TableCell align="right" sx={{ width: headCells.find(h => h.id === 'invoiceTotalAmount')?.width, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatNumberSv(row.invoiceTotalAmount)}</TableCell>
                <TableCell sx={{ width: headCells.find(h => h.id === 'invoiceNumber')?.width, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.invoiceNumber}</TableCell>
                <TableCell align="right" style={getDiffCellStyle(row.difference)} sx={{ width: headCells.find(h => h.id === 'difference')?.width, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatNumberSv(row.difference)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={headCells.length} align="center">
                  <Typography>Inga matchade fakturor hittades.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {unmatchedInvoiceRows.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>Ej matchade fakturor</Typography>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="unmatched invoices table">
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Filnamn (Ursprung)</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Fakturanummer</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Tävlingsnamn (Faktura)</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Tävlingsdatum (Faktura)</Typography></TableCell>
                  <TableCell align="right"><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Belopp (Faktura)</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unmatchedInvoiceRows.map((invoice, index) => (
                  <TableRow key={`${invoice.invoiceNumber || 'unmatched'}-${index}`} hover>
                    <TableCell>{invoice.sourceFilename}</TableCell>
                    <TableCell>{invoice.invoiceNumber || '-'}</TableCell>
                    <TableCell>{invoice.competitionName || '-'}</TableCell>
                    <TableCell>{invoice.date || '-'}</TableCell>
                    <TableCell align="right">{formatNumberSv(typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) : invoice.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default InvoiceReconciliationTable;
