import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  Box,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ResultsTable from './ResultsTable';
import CompetitionResultsTable from './CompetitionResultsTable';
import InvoiceReconciliationTable from './InvoiceReconciliationTable';
import InvoicingBasisTab from './InvoicingBasisTab'; // Added for new invoicing basis tab
import { UploadedInvoiceData, OrderableReconciliationKeys } from './types';
import RuleEditor from './RuleEditor';
import InfoPage from './InfoPage'; // Import InfoPage // Import RuleEditor
import processAndBill from './processing/fileProcessor';
import { processInvoices } from './processing/invoiceProcessor';
import { BillingResult } from './types';
import { UploadFile as UploadFileIcon } from '@mui/icons-material';
import ifkLogo from './assets/ifk_logo.png';
import DescriptionIcon from '@mui/icons-material/Description';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Helper types and components for Tabs
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const App = () => {
  const [allSelectedFiles, setAllSelectedFiles] = useState<File[]>([]);
  const [uploadResponse, setUploadResponse] = useState<{
    billingResults: BillingResult[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [showInfoPage, setShowInfoPage] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 for Member View, 1 for Competition View, 2 for Reconciliation, 3 for Invoicing Basis
  const [lastParticipationFile, setLastParticipationFile] =
    useState<File | null>(null);

  // State for InvoiceReconciliationTable
  const [
    reconciliationParsedInvoiceDataList,
    setReconciliationParsedInvoiceDataList,
  ] = useState<UploadedInvoiceData[]>([]);
  const [reconciliationOrder, setReconciliationOrder] = useState<
    'asc' | 'desc'
  >('asc');
  const [reconciliationOrderBy, setReconciliationOrderBy] =
    useState<OrderableReconciliationKeys>('eventorCompetitionName');
  const [currentParticipationFileName, setCurrentParticipationFileName] =
    useState<string | null>(null);
  const [isInvoiceListExpanded, setIsInvoiceListExpanded] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleInvoiceListToggle = () => {
    setIsInvoiceListExpanded(!isInvoiceListExpanded);
  };

  const handleRestart = () => {
    setUploadResponse(null);
    setReconciliationParsedInvoiceDataList([]);
    setAllSelectedFiles([]);
    setCurrentParticipationFileName(null);
    setLastParticipationFile(null); // Clear the stored participation file
    setError(null);
    setIsProcessing(false);
    const fileInput = document.getElementById(
      'file-upload-input-main'
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    setIsInvoiceListExpanded(false); // Collapse on restart
    console.log('Process restarted, ready for new participation file.');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const filesArray = Array.from(event.target.files);
      setAllSelectedFiles(filesArray);
      console.log('Selected files:', filesArray.map((f) => f.name).join(', '));
    } else {
      setAllSelectedFiles([]);
    }
  };

  const handleProcessFiles = async () => {
    if (allSelectedFiles.length === 0) {
      alert('Vänligen välj en eller flera filer först.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Determine if we are in Step 1 (uploading participation data) or Step 2 (uploading invoices)
    const isStep1 = !(uploadResponse && uploadResponse.billingResults);

    if (isStep1) {
      // --- STEP 1: Upload Participation Data (Excel/CSV) ---
      console.log('Processing participation file:', allSelectedFiles[0].name);
      setUploadResponse(null); // Clear previous results
      setReconciliationParsedInvoiceDataList([]); // Clear previous invoice matches

      const participationFile = allSelectedFiles.find((file) =>
        ['csv', 'xls', 'xlsx'].includes(
          file.name.split('.').pop()?.toLowerCase() || ''
        )
      );

      if (!participationFile) {
        alert('Vänligen välj en giltig Excel- eller CSV-fil.');
        setIsProcessing(false);
        return;
      }
      if (allSelectedFiles.length > 1) {
        alert('Du kan bara ladda upp en deltagarfil åt gången i Steg 1.');
        // Keep files selected for user to correct, or clear them:
        // setAllSelectedFiles([]);
        // const fileInput = document.getElementById('file-upload-input-main') as HTMLInputElement;
        // if (fileInput) fileInput.value = '';
        setIsProcessing(false);
        return;
      }

      setLastParticipationFile(participationFile); // Store the file for reprocessing

      try {
        console.log('[FE] Starting client-side file processing...');
        const results = await processAndBill(participationFile);
        console.log('[FE] Client-side processing complete:', results);

        // The component expects the response in a specific shape
        setUploadResponse({ billingResults: results });
        setCurrentParticipationFileName(participationFile.name);
        alert(
          `Deltagarfilen ${participationFile.name} har bearbetats lokalt! Du kan nu ladda upp fakturor för avstämning.`
        );
      } catch (err) {
        console.error('Error processing participation file locally:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Ett okänt fel inträffade.';
        setError(errorMessage);
        alert(`Fel: ${errorMessage}`);
      } finally {
        setAllSelectedFiles([]);
        const fileInput = document.getElementById(
          'file-upload-input-main'
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        setIsProcessing(false);
      }
    } else {
      // --- STEP 2: Upload Invoice Data (PDF/ZIP) ---
      console.log(
        'Processing invoice files:',
        allSelectedFiles.map((f) => f.name).join(', ')
      );
      const invoiceFiles = allSelectedFiles.filter((file) =>
        ['pdf', 'zip'].includes(file.name.split('.').pop()?.toLowerCase() || '')
      );

      if (invoiceFiles.length === 0) {
        alert(
          'Vänligen välj giltiga PDF- eller ZIP-filer för fakturaavstämning.'
        );
        setIsProcessing(false);
        return;
      }

      try {
        console.log('[FE] Processing invoice files locally...');
        const parsedData = await processInvoices(invoiceFiles);
        console.log('[FE] Local invoice processing complete:', parsedData);
        setReconciliationParsedInvoiceDataList(parsedData);
        alert(
          `${invoiceFiles.length} fakturafil(er) har bearbetats och lagts till för avstämning.`
        );
      } catch (err) {
        console.error('Error processing invoice files locally:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Ett okänt fel inträffade.';
        setError(errorMessage);
        alert(`Fel: ${errorMessage}`);
      } finally {
        setAllSelectedFiles([]);
        const fileInput = document.getElementById(
          'file-upload-input-main'
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        setIsProcessing(false);
      }
    }
  };

  const handleSettingsChangedAndRecalculate = async () => {
    if (!lastParticipationFile) {
      alert(
        'Ingen deltagarfil har bearbetats tidigare. Ladda upp en fil först.'
      );
      return;
    }

    console.log(
      `[FE] Reprocessing participation file locally: ${lastParticipationFile.name} due to settings change.`
    );
    setIsProcessing(true);
    setError(null);

    try {
      const results = await processAndBill(lastParticipationFile);
      console.log('[FE] Client-side reprocessing complete:', results);

      setUploadResponse({ billingResults: results });
      // Note: We might want to re-evaluate invoice reconciliations here if they depend on the results.
      // For now, we just recalculate the billing results.
      alert(
        `Reglerna har uppdaterats och deltagardatan för ${lastParticipationFile.name} har omberäknats lokalt.`
      );
    } catch (err) {
      console.error('Error reprocessing participation file locally:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Ett okänt fel inträffade.';
      setError(errorMessage);
      alert(`Fel: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenRuleEditor = () => {
    setShowInfoPage(false); // Ensure info page is closed
    setShowRuleEditor(true);
  };

  const handleCloseRuleEditor = () => setShowRuleEditor(false);

  const handleOpenInfoPage = () => {
    setShowRuleEditor(false); // Ensure rule editor is closed
    setShowInfoPage(true);
  };
  const handleCloseInfoPage = () => setShowInfoPage(false);

  return (
    <React.Fragment>
      <CssBaseline />
      <AppBar position='static'>
        <Toolbar>
          <Box
            component='img'
            sx={{
              height: 40, // Adjust size as needed
              mr: 2, // Margin to the right
            }}
            alt='IFK Göteborg Orientering Logotyp'
            src={ifkLogo}
          />
          <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
            IFK Gbg Orientering - Startavgiftshantering
          </Typography>
          {(showRuleEditor || showInfoPage) && (
            <Button
              color='inherit'
              onClick={() => {
                setShowRuleEditor(false);
                setShowInfoPage(false);
              }}
              sx={{ textTransform: 'none' }}
            >
              Tillbaka till Startsidan
            </Button>
          )}
          {!showRuleEditor && !showInfoPage && (
            <>
              <Button
                color='inherit'
                onClick={handleOpenRuleEditor}
                sx={{ textTransform: 'none' }}
              >
                Hantera Regler
              </Button>
              <Button
                color='inherit'
                onClick={handleOpenInfoPage}
                sx={{ textTransform: 'none', ml: 1 }}
              >
                Information
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth='lg' sx={{ mt: 4, mb: 4 }}>
        {/* --- Status Box for Current Batch --- */}
        {uploadResponse &&
          uploadResponse.billingResults &&
          currentParticipationFileName && (
            <Paper
              sx={{
                p: 2,
                mb: 3,
                width: '100%',
                maxWidth: 'lg',
                textAlign: 'left',
                borderRadius: 2,
                boxShadow: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Box>
                  <Typography variant='h6' component='div'>
                    Aktuellt Underlag
                  </Typography>
                  <Typography variant='body1'>
                    <strong>Deltagarfil:</strong> {currentParticipationFileName}
                  </Typography>
                </Box>
                <Button
                  variant='outlined'
                  color='secondary'
                  onClick={handleRestart}
                  startIcon={<RestartAltIcon />}
                >
                  Starta Om
                </Button>
              </Box>

              {reconciliationParsedInvoiceDataList.length > 0 ? (
                <Accordion
                  expanded={isInvoiceListExpanded}
                  onChange={handleInvoiceListToggle}
                  sx={{
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    mt: 1,
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls='invoice-list-content'
                    id='invoice-list-header'
                    sx={{
                      padding: 0,
                      minHeight: '30px',
                      '& .MuiAccordionSummary-content': { margin: '8px 0' },
                    }}
                  >
                    <Typography variant='body1'>
                      <strong>
                        Uppladdade fakturor (
                        {reconciliationParsedInvoiceDataList.length} st)
                      </strong>
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ padding: '0 0 8px 0' }}>
                    <List
                      dense
                      sx={{ maxHeight: 150, overflow: 'auto', pl: 0, pt: 0 }}
                    >
                      {reconciliationParsedInvoiceDataList.map(
                        (invoice, index) => (
                          <ListItem key={index} disablePadding sx={{ pl: 0 }}>
                            <ListItemIcon sx={{ minWidth: '30px', pl: 0.5 }}>
                              <DescriptionIcon fontSize='small' />
                            </ListItemIcon>
                            <ListItemText
                              primary={invoice.filename}
                              secondary={`Nr: ${invoice.parsedInfo?.invoiceNumber || 'N/A'}, Belopp: ${invoice.parsedInfo?.totalAmount || 'N/A'}`}
                            />
                          </ListItem>
                        )
                      )}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ) : (
                <Typography variant='body2' sx={{ mt: 1, fontStyle: 'italic' }}>
                  Inga fakturor har laddats upp för detta underlag ännu.
                </Typography>
              )}
            </Paper>
          )}
        {/* --- End of Status Box --- */}

        {showRuleEditor && (
          <RuleEditor
            onClose={handleCloseRuleEditor}
            onRuleChangeAndRecalculate={handleSettingsChangedAndRecalculate}
          />
        )}
        {showInfoPage && <InfoPage onClose={handleCloseInfoPage} />}
        {!showRuleEditor && !showInfoPage && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            {/* Original main content starts here, including the Paper for uploads */}
            <Paper
              sx={{
                p: { xs: 2, sm: 3, md: 4 },
                mt: 4,
                width: '100%',
                maxWidth: '600px',
                textAlign: 'center',
                borderRadius: 2,
                boxShadow: 3,
              }}
            >
              <Typography
                variant='h4'
                component='h1'
                gutterBottom
                sx={{ mb: 1 }}
              >
                {!(uploadResponse && uploadResponse.billingResults)
                  ? 'Steg 1: Ladda upp Deltagardata'
                  : 'Steg 2: Ladda upp Fakturor för Matchning'}
              </Typography>
              <Typography
                variant='subtitle1'
                color='text.secondary'
                sx={{ mb: 4 }}
              >
                {!(uploadResponse && uploadResponse.billingResults)
                  ? 'Välj en Excel- eller CSV-fil från Eventor för att skapa ett faktureringsunderlag.'
                  : 'Ladda nu upp PDF- eller ZIP-fakturor för att matcha mot det skapade underlaget.'}
              </Typography>
              <Button
                variant='contained'
                component='label'
                startIcon={<UploadFileIcon />}
                sx={{
                  mb: 2,
                  py: 1.5,
                  px: 3,
                  textTransform: 'none',
                  fontSize: '1rem',
                }}
                size='large'
              >
                {!(uploadResponse && uploadResponse.billingResults)
                  ? 'Välj Excel/CSV-fil'
                  : 'Välj PDF/ZIP-filer'}
                <input
                  type='file'
                  hidden
                  multiple={!!(uploadResponse && uploadResponse.billingResults)} // Allow multiple only for invoices
                  accept={
                    !(uploadResponse && uploadResponse.billingResults)
                      ? '.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel'
                      : '.pdf, .zip'
                  }
                  onChange={handleFileChange}
                  id='file-upload-input-main'
                />
              </Button>
              {allSelectedFiles.length > 0 && (
                <Typography
                  variant='body1'
                  sx={{
                    mt: 2,
                    mb: 3,
                    fontStyle: 'italic',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  Valda filer: {allSelectedFiles.map((f) => f.name).join('\n')}
                </Typography>
              )}
              <Button
                variant='contained'
                color='secondary'
                onClick={handleProcessFiles}
                disabled={allSelectedFiles.length === 0 || isProcessing}
                fullWidth
                size='large'
                sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
              >
                {isProcessing ? 'Bearbetar...' : 'Bearbeta Valda Filer'}
              </Button>
            </Paper>
            {/* Error and Results Display */}
            {error && (
              <Typography
                color='error'
                sx={{
                  mt: 3,
                  width: '100%',
                  maxWidth: '800px',
                  textAlign: 'center',
                }}
              >
                Fel: {error}
              </Typography>
            )}
            {uploadResponse && uploadResponse.billingResults && (
              <Box sx={{ width: '100%', mt: 4 }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  aria-label='results view tabs'
                  centered
                  indicatorColor='secondary'
                  textColor='secondary'
                >
                  <Tab label='Per Medlem' {...a11yProps(0)} />
                  <Tab label='Per Tävling' {...a11yProps(1)} />
                  <Tab label='Fakturaavstämning' {...a11yProps(2)} />
                  <Tab label='Fakturaunderlag' {...a11yProps(3)} />{' '}
                  {/* Added new tab */}
                </Tabs>
                <TabPanel value={activeTab} index={0}>
                  {uploadResponse.billingResults && (
                    <ResultsTable results={uploadResponse.billingResults} />
                  )}
                </TabPanel>
                <TabPanel value={activeTab} index={1}>
                  {uploadResponse.billingResults && (
                    <CompetitionResultsTable
                      results={uploadResponse.billingResults}
                    />
                  )}
                </TabPanel>
                <TabPanel value={activeTab} index={2}>
                  {uploadResponse.billingResults && (
                    <InvoiceReconciliationTable
                      results={uploadResponse.billingResults}
                      parsedInvoiceDataList={
                        reconciliationParsedInvoiceDataList
                      }
                      order={reconciliationOrder}
                      setOrder={setReconciliationOrder}
                      orderBy={reconciliationOrderBy}
                      setOrderBy={setReconciliationOrderBy}
                    />
                  )}
                </TabPanel>
                <TabPanel value={activeTab} index={3}>
                  {' '}
                  {/* Added new TabPanel */}
                  {uploadResponse.billingResults && (
                    <InvoicingBasisTab
                      results={uploadResponse.billingResults}
                      // customerNumberMap={{}} // Placeholder, to be implemented
                    />
                  )}
                </TabPanel>
              </Box>
            )}
            {(error || isProcessing) && (
              <Box
                sx={{
                  textAlign: 'center',
                  mt: 2,
                  p: 2,
                  backgroundColor: 'grey.100',
                  borderRadius: 1,
                }}
              >
                {isProcessing && (
                  <Typography variant='h6'>Bearbetar...</Typography>
                )}
                {error && <Typography color='error'>Fel: {error}</Typography>}
              </Box>
            )}
          </Box>
        )}
      </Container>
    </React.Fragment>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
