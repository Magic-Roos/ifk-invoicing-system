import React, { useMemo, useState } from 'react';
import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, IconButton, Collapse, TableSortLabel } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { ParticipationData } from './ResultsTable'; // Assuming ParticipationData is exported from ResultsTable or a shared types file

interface CompetitionSummary {
  competitionName: string;
  competitionDate: string;
  participants: ParticipationData[];
  participantCount: number;
  totalOriginalFee: number;
  totalToInvoiceRunner: number;
}

type Order = 'asc' | 'desc';

interface HeadCell {
  id: keyof CompetitionSummary | 'actions'; // 'actions' for the expand icon column
  label: string;
  numeric: boolean;
  disablePadding?: boolean;
}

// Helper function to format currency, can be moved to a shared utils file later
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amount);
};

interface CompetitionRowProps {
  competition: CompetitionSummary;
}

const CompetitionRow: React.FC<CompetitionRowProps> = ({ competition }) => {
  const [open, setOpen] = useState(false);

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {competition.competitionName}
        </TableCell>
        <TableCell>{competition.competitionDate}</TableCell>
        <TableCell align="right">{competition.participantCount}</TableCell>
        <TableCell align="right">{formatCurrency(competition.totalOriginalFee)}</TableCell>
        <TableCell align="right">{formatCurrency(competition.totalToInvoiceRunner)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Deltagare i {competition.competitionName}
              </Typography>
              <Table size="small" aria-label="participants">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Medlem</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Klass</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Avgiftstyp</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Avgiftsbelopp</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Att Fakturera (Löpare)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Tillämpad Regel</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Beskrivning</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {competition.participants.map((participant, index) => (
                    <TableRow key={`${participant.PersonId || participant.MemberName}-${participant.feeType}-${index}`}>
                      <TableCell>{participant.MemberName}</TableCell>
                      <TableCell>{participant.ClassName || 'N/A'}</TableCell>
                      <TableCell>{participant.feeType}</TableCell>
                      <TableCell align="right">{formatCurrency(participant.feeAmount)}</TableCell>
                      <TableCell align="right">{formatCurrency(participant.runnerInvoiceAmount)}</TableCell>
                      <TableCell>{participant.appliedRule || 'N/A'}</TableCell>
                      <TableCell>{participant.description || 'N/A'}</TableCell>
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

interface CompetitionResultsTableProps {
  results: ParticipationData[];
}

const CompetitionResultsTable: React.FC<CompetitionResultsTableProps> = ({ results }) => {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof CompetitionSummary>('competitionDate');
  const groupedAndSortedCompetitions = useMemo(() => {
    if (!results || results.length === 0) return [];

    const competitionsMap: Record<string, CompetitionSummary> = {};

    results.forEach(item => {
      const key = `${item.CompetitionName}_${item.CompetitionDate}`;
      if (!competitionsMap[key]) {
        competitionsMap[key] = {
          competitionName: item.CompetitionName,
          competitionDate: item.CompetitionDate,
          participants: [],
          participantCount: 0,
          totalOriginalFee: 0,
          totalToInvoiceRunner: 0,
        };
      }
      competitionsMap[key].participants.push(item);
      // participantCount kommer att beräknas senare baserat på unika deltagare
      competitionsMap[key].totalOriginalFee += item.feeAmount;
      competitionsMap[key].totalToInvoiceRunner += item.runnerInvoiceAmount;
    });

    // Beräkna unika deltagare för varje tävling
    Object.values(competitionsMap).forEach(competition => {
      const uniqueParticipantKeys = new Set<string | number>();
      competition.participants.forEach(p => {
        // Använd PersonId om det finns och inte är tomt/null, annars MemberName som fallback
        const uniqueKey = (p.PersonId !== undefined && p.PersonId !== null && String(p.PersonId).trim() !== '') 
                          ? p.PersonId 
                          : p.MemberName;
        uniqueParticipantKeys.add(uniqueKey);
      });
      competition.participantCount = uniqueParticipantKeys.size;
    });

    const sortedCompetitions = Object.values(competitionsMap).sort((a, b) => {
      let comparison = 0;
      const valA = a[orderBy];
      const valB = b[orderBy];

      if (orderBy === 'competitionDate') {
        comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB, 'sv');
      }
      return order === 'asc' ? comparison : -comparison;
    });
    return sortedCompetitions;
  }, [results, order, orderBy]);

  const handleRequestSort = (property: keyof CompetitionSummary) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  if (!groupedAndSortedCompetitions || groupedAndSortedCompetitions.length === 0) {
    return <Typography sx={{ mt: 2 }}>Inga tävlingsresultat att visa.</Typography>;
  }

  return (
    <Paper sx={{ mt: 2, p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Resultat per Tävling
      </Typography>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table aria-label="competition results table">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.200' }}>
              <TableCell /> {/* For expand icon */}
              {([
                { id: 'competitionName', label: 'Tävlingsnamn', numeric: false },
                { id: 'competitionDate', label: 'Datum', numeric: true }, // True for date sorting logic
                { id: 'participantCount', label: 'Antal Deltagare', numeric: true },
                { id: 'totalOriginalFee', label: 'Total Avgift (Ursprunglig)', numeric: true },
                { id: 'totalToInvoiceRunner', label: 'Total att Fakturera (Löpare)', numeric: true },
              ] as HeadCell[]).map((headCell) => (
                <TableCell
                  key={headCell.id}
                  align={headCell.numeric ? 'right' : 'left'}
                  padding={headCell.disablePadding ? 'none' : 'normal'}
                  sortDirection={orderBy === headCell.id ? order : false}
                  sx={{ fontWeight: 'bold' }}
                >
                  {headCell.id !== 'actions' && (
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : 'asc'}
                      onClick={() => handleRequestSort(headCell.id as keyof CompetitionSummary)}
                    >
                      {headCell.label}
                    </TableSortLabel>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedAndSortedCompetitions.map((competition) => (
              <CompetitionRow key={`${competition.competitionName}-${competition.competitionDate}`} competition={competition} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default CompetitionResultsTable;
