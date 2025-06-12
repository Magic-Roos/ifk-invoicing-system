import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Box,
  Typography,
  TableSortLabel,
  Button,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DownloadIcon from '@mui/icons-material/Download';
import { exportToExcel, SheetConfig, ExportRow } from './exportToExcel';
import { BillingResult } from './types';

// Type definitions
type Order = 'asc' | 'desc';

interface ConsolidatedParticipation {
  competitionName: string;
  competitionDate: string;
  standardFee: number;
  lateFee: number;
  serviceFee: number;
  totalRunnerInvoiceAmount: number;
  appliedRules: string;
  descriptions: string;
  rulesSet: Set<string>;
  descsSet: Set<string>;
  displayDescsSet: Set<string>;
}

interface MemberSummary {
  personId?: string | number | null;
  memberName: string;
  competitionCount: number;
  totalOriginalFee: number;
  totalToInvoiceMember: number;
  participations: BillingResult[];
}

interface ResultsTableProps {
  results: BillingResult[];
}

type OrderableMemberSummaryKeys = keyof Pick<MemberSummary, 'memberName' | 'competitionCount' | 'totalOriginalFee' | 'totalToInvoiceMember'>;

const formatCurrency = (amount: number | undefined): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '-'; // Return a dash for undefined or NaN amounts
  }
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amount);
};

const Row: React.FC<{ memberSummary: MemberSummary }> = ({ memberSummary }) => {
  const [open, setOpen] = useState(false);

  const consolidatedParticipations = useMemo(() => {
    if (!memberSummary.participations || memberSummary.participations.length === 0) {
      return [];
    }

    const groupedByCompetition: Record<string, ConsolidatedParticipation> = {};

    memberSummary.participations.forEach(p => {
      const key = `${p.CompetitionName}_${p.CompetitionDate}`;
      if (!groupedByCompetition[key]) {
        groupedByCompetition[key] = {
          competitionName: p.CompetitionName,
          competitionDate: p.CompetitionDate,
          standardFee: 0,
          lateFee: 0,
          serviceFee: 0,
          totalRunnerInvoiceAmount: 0,
          appliedRules: '',
          descriptions: '',
          rulesSet: new Set<string>(),
          descsSet: new Set<string>(),
          displayDescsSet: new Set<string>(),
        };
      }

      const group = groupedByCompetition[key];
      group.totalRunnerInvoiceAmount += p.runnerInvoiceAmount;

      if (p.feeType === 'Standard Startavgift' || p.feeType === 'DNS') {
        group.standardFee += p.feeAmount;
      } else if (p.feeType === 'Late') {
        group.lateFee += p.feeAmount;
      } else if (p.feeType === 'ChipRental' || p.feeType === 'Service') {
        group.serviceFee += p.feeAmount;
      }

      if (p.appliedRule) group.rulesSet.add(p.appliedRule);
      
      if (p.description) {
        group.descsSet.add(p.description);
        if ((p.runnerInvoiceAmount > 0 && p.description) || 
            p.description.toLowerCase().includes('ej start') || 
            p.description.toLowerCase().includes('dns')) {
            group.displayDescsSet.add(p.description);
        }
      }
    });

    return Object.values(groupedByCompetition).map(group => {
      let finalDescriptions = Array.from(group.displayDescsSet).join(', ');
      if (finalDescriptions === '' && group.descsSet.size > 0) {
        finalDescriptions = Array.from(group.descsSet).join(', ');
      }
      if ((group.displayDescsSet.size === 1 && group.displayDescsSet.has('Ej start')) ||
          (finalDescriptions === '' && group.descsSet.size === 1 && group.descsSet.has('Ej start'))) {
        finalDescriptions = 'Ej start';
      }
      
      return {
        ...group,
        appliedRules: Array.from(group.rulesSet).join(', ') || '-',
        descriptions: finalDescriptions || '-',
      };
    });
  }, [memberSummary.participations]);

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">{memberSummary.memberName}</TableCell>
        <TableCell align="right">{memberSummary.competitionCount}</TableCell>
        <TableCell align="right">{formatCurrency(memberSummary.totalOriginalFee)}</TableCell>
        <TableCell align="right">{formatCurrency(memberSummary.totalToInvoiceMember)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Detaljer för {memberSummary.memberName}
              </Typography>
              <Table size="small" aria-label="competition-details">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Tävling</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Datum</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Startavgift</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Efteranm.avgift</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Tjänsteavgift</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Att fakturera (Löpare)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Tillämpad Regel</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Beskrivning</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {consolidatedParticipations.map((cp, index) => (
                    <TableRow key={`${cp.competitionName}-${cp.competitionDate}-${index}`}>
                      <TableCell component="th" scope="row">{cp.competitionName}</TableCell>
                      <TableCell>{cp.competitionDate}</TableCell>
                      <TableCell align="right">{cp.standardFee > 0 ? formatCurrency(cp.standardFee) : '-'}</TableCell>
                      <TableCell align="right">{cp.lateFee > 0 ? formatCurrency(cp.lateFee) : '-'}</TableCell>
                      <TableCell align="right">{cp.serviceFee > 0 ? formatCurrency(cp.serviceFee) : '-'}</TableCell>
                      <TableCell align="right">{formatCurrency(cp.totalRunnerInvoiceAmount)}</TableCell>
                      <TableCell>{cp.appliedRules}</TableCell>
                      <TableCell>{cp.descriptions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<OrderableMemberSummaryKeys>('memberName');

  const memberSummaries = useMemo(() => {
    if (!results || results.length === 0) return [];

    const summaryMap: Record<string, MemberSummary> = {};

    results.forEach(p => {
      const memberKey = p.PersonId ? String(p.PersonId) : p.MemberName; // Use PersonId if available, else MemberName
      if (!summaryMap[memberKey]) {
        summaryMap[memberKey] = {
          personId: p.PersonId,
          memberName: p.MemberName,
          competitionCount: 0,
          totalOriginalFee: 0,
          totalToInvoiceMember: 0,
          participations: [],
        };
      }
      summaryMap[memberKey].participations.push(p);
      summaryMap[memberKey].totalOriginalFee += p.feeAmount;
      summaryMap[memberKey].totalToInvoiceMember += p.runnerInvoiceAmount;
    });

    return Object.values(summaryMap).map(summary => ({
      ...summary,
      competitionCount: new Set(summary.participations.map(p => `${p.CompetitionName}_${p.CompetitionDate}`)).size,
    }));
  }, [results]);

  const handleRequestSort = (property: OrderableMemberSummaryKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedMemberSummaries = useMemo(() => {
    return [...memberSummaries].sort((a, b) => {
      let comparison = 0;
      const valA = a[orderBy];
      const valB = b[orderBy];

      if (orderBy === 'memberName') {
        const nameA = String(valA).split(' ');
        const nameB = String(valB).split(' ');
        const lastNameA = nameA.pop() || '';
        const lastNameB = nameB.pop() || '';
        const firstNameA = nameA.join(' ');
        const firstNameB = nameB.join(' ');

        comparison = lastNameA.localeCompare(lastNameB, 'sv-SE');
        if (comparison === 0) {
          comparison = firstNameA.localeCompare(firstNameB, 'sv-SE');
        }
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB), 'sv-SE');
      }
      return order === 'asc' ? comparison : -comparison;
    });
  }, [memberSummaries, order, orderBy]);

  // Helper function to consolidate participations for export
  const consolidateParticipationsForExport = (participations: BillingResult[]) => {
    if (!participations || participations.length === 0) {
      return [];
    }

    const groupedByCompetition: Record<string, {
      competitionName: string;
      competitionDate: string;
      standardFee: number;
      lateFee: number;
      serviceFee: number;
      totalRunnerInvoiceAmount: number;
      rulesSet: Set<string>;
      descsSet: Set<string>;
      displayDescsSet: Set<string>; // For specific descriptions to show
    }> = {};

    participations.forEach(p => {
      const key = `${p.CompetitionName}_${p.CompetitionDate}`;
      if (!groupedByCompetition[key]) {
        groupedByCompetition[key] = {
          competitionName: p.CompetitionName,
          competitionDate: p.CompetitionDate,
          standardFee: 0,
          lateFee: 0,
          serviceFee: 0,
          totalRunnerInvoiceAmount: 0,
          rulesSet: new Set<string>(),
          descsSet: new Set<string>(),
          displayDescsSet: new Set<string>(),
        };
      }

      const group = groupedByCompetition[key];
      group.totalRunnerInvoiceAmount += p.runnerInvoiceAmount;

      if (p.feeType === 'Standard Startavgift' || p.feeType === 'DNS') {
        group.standardFee += p.feeAmount;
      } else if (p.feeType === 'Late') {
        group.lateFee += p.feeAmount;
      } else if (p.feeType === 'ChipRental' || p.feeType === 'Service') {
        group.serviceFee += p.feeAmount;
      }

      if (p.appliedRule) group.rulesSet.add(p.appliedRule);
      
      if (p.description) {
        group.descsSet.add(p.description);
        if ((p.runnerInvoiceAmount > 0 && p.description) || 
            p.description.toLowerCase().includes('ej start') || 
            p.description.toLowerCase().includes('dns')) {
            group.displayDescsSet.add(p.description);
        }
      }
    });

    return Object.values(groupedByCompetition).map(group => {
      let finalDescriptions = Array.from(group.displayDescsSet).join(', ');
      if (finalDescriptions === '' && group.descsSet.size > 0) {
        finalDescriptions = Array.from(group.descsSet).join(', ');
      }
      if ((group.displayDescsSet.size === 1 && group.displayDescsSet.has('Ej start')) ||
          (finalDescriptions === '' && group.descsSet.size === 1 && group.descsSet.has('Ej start'))) {
        finalDescriptions = 'Ej start';
      }

      return {
        'Tävling': group.competitionName,
        'Datum': group.competitionDate,
        'Startavgift': group.standardFee, // MODIFIED: Export raw number
        'Efteranm.avgift': group.lateFee, // MODIFIED: Export raw number
        'Tjänsteavgift': group.serviceFee, // MODIFIED: Export raw number
        'Att Fakturera (Tävling)': group.totalRunnerInvoiceAmount, // MODIFIED: Export raw number
        'Tillämpad Regel': Array.from(group.rulesSet).join(', ') || '-',
        'Beskrivning': finalDescriptions || '-',
      };
    });
  };

  const handleExportResults = () => {
    if (!memberSummaries || memberSummaries.length === 0) {
      alert('Ingen data att exportera.');
      return;
    }

    const exportRows: any[] = [];

    sortedMemberSummaries.forEach(memberSummary => { // Use sortedMemberSummaries for consistent export order
      // Add summary row for the member
      exportRows.push({
        _rowType: 'summary', // For Excel outlining
        'Medlem': memberSummary.memberName,
        'Antal Tävlingar': memberSummary.competitionCount,
        'Total Urspr. Avgift': memberSummary.totalOriginalFee, // MODIFIED: Export raw number
        'Total Att Fakturera': memberSummary.totalToInvoiceMember, // MODIFIED: Export raw number
        // Empty placeholders for competition-specific columns
        'Tävling': '',
        'Datum': '',
        'Startavgift': '',
        'Efteranm.avgift': '',
        'Tjänsteavgift': '',
        'Att Fakturera (Tävling)': '',
        'Tillämpad Regel': '',
        'Beskrivning': '',
      });

      // Add detail rows for each of the member's consolidated participations
      const detailedParticipations = consolidateParticipationsForExport(memberSummary.participations);
      detailedParticipations.forEach(compDetail => {
        exportRows.push({
          _rowType: 'detail', // For Excel outlining
          'Medlem': memberSummary.memberName, // Repeat member name for context
          // Empty placeholders for member summary columns
          'Antal Tävlingar': '',
          'Total Urspr. Avgift': '',
          'Total Att Fakturera': '',
          // Spread the competition-specific details
          ...compDetail,
        });
      });
    });

    const sheetConfig: SheetConfig<ExportRow> = {
      sheetName: 'Grupperade Resultat',
      data: exportRows,
      columns: [
        { header: 'Medlem', key: 'Medlem' },
        { header: 'Antal Tävlingar', key: 'Antal Tävlingar' },
        { header: 'Total Urspr. Avgift', key: 'Total Urspr. Avgift', isCurrency: true },
        { header: 'Total Att Fakturera', key: 'Total Att Fakturera', isCurrency: true },
        { header: 'Tävling', key: 'Tävling' },
        { header: 'Datum', key: 'Datum' },
        { header: 'Startavgift', key: 'Startavgift', isCurrency: true },
        { header: 'Efteranm.avgift', key: 'Efteranm.avgift', isCurrency: true },
        { header: 'Tjänsteavgift', key: 'Tjänsteavgift', isCurrency: true },
        { header: 'Att Fakturera (Tävling)', key: 'Att Fakturera (Tävling)', isCurrency: true },
        { header: 'Tillämpad Regel', key: 'Tillämpad Regel' },
        { header: 'Beskrivning', key: 'Beskrivning' },
      ],
    };
    exportToExcel([sheetConfig], 'ResultatPerMedlem_Grupperad.xlsx');
  };

  if (!results || results.length === 0) { // Check original results for initial render
    return (
      <Paper sx={{ padding: 2, margin: 2, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Resultat per Medlem</Typography>
        <Typography variant="subtitle1">Inga resultat att visa.</Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExportResults}
          disabled={true} // Initially disabled as no results
          sx={{ marginTop: 2 }}
        >
          Exportera Grupperat
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ margin: 2, padding: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" gutterBottom component="div" sx={{m:0}}>
          Resultat per Medlem
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExportResults}
          disabled={memberSummaries.length === 0}
        >
          Exportera Grupperat
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: '70vh', boxShadow: 3 }}>
        <Table aria-label="collapsible table">
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell />
              <TableCell sortDirection={orderBy === 'memberName' ? order : false} sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={orderBy === 'memberName'}
                  direction={orderBy === 'memberName' ? order : 'asc'}
                  onClick={() => handleRequestSort('memberName')}
                >
                  Medlem
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sortDirection={orderBy === 'competitionCount' ? order : false} sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={orderBy === 'competitionCount'}
                  direction={orderBy === 'competitionCount' ? order : 'asc'}
                  onClick={() => handleRequestSort('competitionCount')}
                >
                  Antal Tävlingar
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sortDirection={orderBy === 'totalOriginalFee' ? order : false} sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={orderBy === 'totalOriginalFee'}
                  direction={orderBy === 'totalOriginalFee' ? order : 'asc'}
                  onClick={() => handleRequestSort('totalOriginalFee')}
                >
                  Total Urspr. Avgift
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sortDirection={orderBy === 'totalToInvoiceMember' ? order : false} sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={orderBy === 'totalToInvoiceMember'}
                  direction={orderBy === 'totalToInvoiceMember' ? order : 'asc'}
                  onClick={() => handleRequestSort('totalToInvoiceMember')}
                >
                  Total Att Fakturera
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedMemberSummaries.map((memberSummary) => (
              <Row key={memberSummary.personId || memberSummary.memberName} memberSummary={memberSummary} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ResultsTable;