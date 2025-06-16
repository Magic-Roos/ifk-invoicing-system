import React from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { BillingResult } from './types';

interface InvoicingBasisTabProps {
  results: BillingResult[];
  // Placeholder for customer number mapping - we'll discuss this
  // customerNumberMap: Record<string, string>;
}

const InvoicingBasisTab: React.FC<InvoicingBasisTabProps> = ({ results }) => {
  const generateCsvData = (includeZeroAmount: boolean): string => {
    const csvRows: string[] = [];
    // CSV-filen ska inte ha en rubrikrad enligt krav.

    const dataToProcess = includeZeroAmount
      ? results
      : results.filter((item) => item.runnerInvoiceAmount > 0);

    dataToProcess.forEach((item) => {
      const customerNumber = item.MemberName || '';
      const deliveredQuantity = 1;
      const price = item.runnerInvoiceAmount;
      const MAX_LEN = 50;

      let currentDesc = '';

      const appendToDesc = (str: string | undefined | null) => {
        if (!str || currentDesc.length >= MAX_LEN) return;
        const separator = currentDesc ? ' ' : '';
        const availableSpace = MAX_LEN - currentDesc.length - separator.length;
        if (availableSpace <= 0) return;

        if (str.length <= availableSpace) {
          currentDesc += separator + str;
        } else {
          if (availableSpace >= 3) {
            // Only add if meaningful part fits
            currentDesc += separator + str.substring(0, availableSpace);
          }
        }
      };

      appendToDesc(item.description); // Priority 1
      appendToDesc(item.CompetitionName); // Priority 2
      appendToDesc(item.CompetitionDate); // Priority 3
      appendToDesc(item.ClassName); // Priority 4

      const description = currentDesc.trim();

      const row = [
        `"${customerNumber}"`, // Enclose in quotes in case of commas in names
        deliveredQuantity,
        price,
        `"${description}"`, // Enclose in quotes
      ].join(',');
      csvRows.push(row);
    });

    return csvRows.join('\n');
  };

  const downloadCsv = (csvData: string, filename: string) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportBillable = () => {
    const csvData = generateCsvData(false);
    downloadCsv(csvData, 'fakturaunderlag-fakturerbart.csv');
  };

  const handleExportAll = () => {
    const csvData = generateCsvData(true);
    downloadCsv(csvData, 'fakturaunderlag-allt.csv');
  };

  const hasBillableItems = results.some((r) => r.runnerInvoiceAmount > 0);

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant='h6'>Fakturaunderlag per medlem</Typography>
        <Box>
          <Tooltip title='Skapar en CSV-fil för import till Fortnox. Innehåller endast poster med ett belopp större än noll.'>
            <span>
              <Button
                variant='contained'
                startIcon={<DownloadIcon />}
                onClick={handleExportBillable}
                disabled={!hasBillableItems}
                sx={{ mr: 1 }}
              >
                Exportera för Fortnox
              </Button>
            </span>
          </Tooltip>
          <Tooltip title='Skapar en CSV-fil med samtliga poster, inklusive de med belopp noll, för manuell granskning.'>
            <span>
              <Button
                variant='outlined'
                startIcon={<DownloadIcon />}
                onClick={handleExportAll}
                disabled={results.length === 0}
              >
                Exportera komplett underlag
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>
      <TableContainer component={Paper}>
        <Table stickyHeader aria-label='invoicing basis table'>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>
                <Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>
                  Medlem
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>
                  Tävling
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>
                  Klass
                </Typography>
              </TableCell>
              <TableCell align='right'>
                <Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>
                  Belopp (Att fakturera)
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>
                  Beskrivning (för CSV)
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.length > 0 ? (
              results.map((item, index) => (
                <TableRow
                  key={`${item.PersonId}-${item.CompetitionName}-${index}`}
                  hover
                >
                  <TableCell>{item.MemberName}</TableCell>
                  <TableCell>{item.CompetitionName}</TableCell>
                  <TableCell>{item.ClassName}</TableCell>
                  <TableCell align='right'>
                    {item.runnerInvoiceAmount.toFixed(2)} kr
                  </TableCell>
                  <TableCell>
                    {`${item.CompetitionName} ${item.ClassName} ${item.CompetitionDate}`.trim()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align='center'>
                  <Typography>
                    Inga resultat att visa för fakturaunderlag.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default InvoicingBasisTab;
