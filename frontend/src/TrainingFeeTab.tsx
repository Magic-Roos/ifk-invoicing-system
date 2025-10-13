import React, { useState, useEffect } from 'react';
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
  Checkbox,
  TextField,
  Chip,
  Collapse,
  IconButton,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { BillingResult, TrainingFeeMember } from './types';
import {
  processTrainingFeeData,
  generateTrainingFeeCsv,
} from './processing/trainingFeeProcessor';

interface TrainingFeeTabProps {
  results: BillingResult[];
}

const TrainingFeeTab: React.FC<TrainingFeeTabProps> = ({ results }) => {
  const [members, setMembers] = useState<TrainingFeeMember[]>([]);
  const [feeAmount, setFeeAmount] = useState<number>(300);
  const [description, setDescription] = useState<string>(
    'Tävlings- och träningsavgift'
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const processedData = processTrainingFeeData(results);
    setMembers(processedData);
  }, [results]);

  const handleToggleRow = (memberName: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(memberName)) {
      newExpanded.delete(memberName);
    } else {
      newExpanded.add(memberName);
    }
    setExpandedRows(newExpanded);
  };

  const handleToggleMemberIncluded = (memberName: string) => {
    setMembers((prevMembers) =>
      prevMembers.map((member) =>
        member.memberName === memberName
          ? { ...member, included: !member.included }
          : member
      )
    );
  };

  const handleToggleCompetitionIncluded = (
    memberName: string,
    competitionName: string,
    competitionDate: string
  ) => {
    setMembers((prevMembers) =>
      prevMembers.map((member) => {
        if (member.memberName === memberName) {
          const updatedCompetitions = member.competitions.map((comp) =>
            comp.competitionName === competitionName &&
            comp.competitionDate === competitionDate
              ? { ...comp, included: !comp.included }
              : comp
          );

          const newIncludedCount = updatedCompetitions.filter(
            (c) => c.included
          ).length;

          return {
            ...member,
            competitions: updatedCompetitions,
            includedCount: newIncludedCount,
          };
        }
        return member;
      })
    );
  };

  const handleExport = () => {
    const csvData = generateTrainingFeeCsv(members, feeAmount, description);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'tavlings-och-traningsavgift.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const eligibleMembers = members.filter(
    (m) => m.included && m.includedCount >= 3
  );
  const totalAmount = eligibleMembers.length * feeAmount;

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant='h6' gutterBottom>
            Tävlings- och träningsavgift
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Medlemmar som har sprungit 3 eller fler tävlingar (exklusive
            undantag)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            label='Avgift (kr)'
            type='number'
            value={feeAmount}
            onChange={(e) => setFeeAmount(Number(e.target.value))}
            size='small'
            sx={{ width: 120 }}
          />
          <TextField
            label='Beskrivning'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size='small'
            sx={{ width: 250 }}
          />
          <Button
            variant='contained'
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={eligibleMembers.length === 0}
          >
            Exportera CSV
          </Button>
        </Box>
      </Box>

      <Alert severity='info' sx={{ mb: 2 }}>
        <strong>{eligibleMembers.length}</strong> medlemmar är kvalificerade för
        avgift. Totalt belopp: <strong>{totalAmount} kr</strong>
      </Alert>

      <TableContainer component={Paper}>
        <Table stickyHeader aria-label='training fee table'>
          <TableHead>
            <TableRow>
              <TableCell width={50} />
              <TableCell width={50}>
                <Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>
                  Inkludera
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>
                  Medlem
                </Typography>
              </TableCell>
              <TableCell align='center'>
                <Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>
                  Antal tävlingar
                </Typography>
              </TableCell>
              <TableCell align='center'>
                <Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>
                  Status
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.length > 0 ? (
              members.map((member) => (
                <React.Fragment key={member.memberName}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton
                        size='small'
                        onClick={() => handleToggleRow(member.memberName)}
                      >
                        {expandedRows.has(member.memberName) ? (
                          <KeyboardArrowUpIcon />
                        ) : (
                          <KeyboardArrowDownIcon />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={member.included}
                        onChange={() =>
                          handleToggleMemberIncluded(member.memberName)
                        }
                        disabled={member.includedCount < 3}
                      />
                    </TableCell>
                    <TableCell>{member.memberName}</TableCell>
                    <TableCell align='center'>
                      <Chip
                        label={member.includedCount}
                        color={member.includedCount >= 3 ? 'success' : 'default'}
                        size='small'
                      />
                    </TableCell>
                    <TableCell align='center'>
                      {member.includedCount >= 3 ? (
                        <Chip
                          label='Kvalificerad'
                          color='success'
                          size='small'
                          variant='outlined'
                        />
                      ) : (
                        <Chip
                          label='Ej kvalificerad'
                          color='default'
                          size='small'
                          variant='outlined'
                        />
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      style={{ paddingBottom: 0, paddingTop: 0 }}
                      colSpan={5}
                    >
                      <Collapse
                        in={expandedRows.has(member.memberName)}
                        timeout='auto'
                        unmountOnExit
                      >
                        <Box sx={{ margin: 2 }}>
                          <Typography
                            variant='subtitle2'
                            gutterBottom
                            component='div'
                          >
                            Tävlingar
                          </Typography>
                          <Table size='small' aria-label='competitions'>
                            <TableHead>
                              <TableRow>
                                <TableCell>Inkludera</TableCell>
                                <TableCell>Tävling</TableCell>
                                <TableCell>Datum</TableCell>
                                <TableCell>Klass</TableCell>
                                <TableCell>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {member.competitions.map((comp, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>
                                    <Checkbox
                                      checked={comp.included}
                                      onChange={() =>
                                        handleToggleCompetitionIncluded(
                                          member.memberName,
                                          comp.competitionName,
                                          comp.competitionDate
                                        )
                                      }
                                      size='small'
                                    />
                                  </TableCell>
                                  <TableCell>{comp.competitionName}</TableCell>
                                  <TableCell>{comp.competitionDate}</TableCell>
                                  <TableCell>{comp.className}</TableCell>
                                  <TableCell>
                                    {comp.excludeReason && (
                                      <Chip
                                        label={comp.excludeReason}
                                        size='small'
                                        color='warning'
                                        variant='outlined'
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align='center'>
                  <Typography>Inga medlemmar att visa.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TrainingFeeTab;
