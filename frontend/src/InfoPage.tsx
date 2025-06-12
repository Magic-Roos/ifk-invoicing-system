import React from 'react';
import { Box, Typography, Button, Paper, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface InfoPageProps {
  onClose: () => void;
}

const InfoPage: React.FC<InfoPageProps> = ({ onClose }) => {
  return (
    <Paper sx={{ p: { xs: 2, sm: 3, md: 4 }, mt: 4, borderRadius: 2, boxShadow: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Om Faktureringssystemet
        </Typography>
        <Button variant="outlined" onClick={onClose} sx={{ textTransform: 'none' }}>
          Stäng Information
        </Button>
      </Box>

      <Typography variant="h5" gutterBottom sx={{mt: 3}}>
        Syfte
      </Typography>
      <Typography paragraph>
        Detta system är designat för att underlätta hanteringen av tävlingsavgifter för IFK Göteborg Orientering. 
        Målet är att automatisera och förenkla processen från det att medlemmar deltar i tävlingar till dess att 
        korrekta faktureringsunderlag skapas, både för vad medlemmen själv ska betala och vad klubben eventuellt täcker.
      </Typography>

      <Typography variant="h5" gutterBottom sx={{mt: 3}}>
        Arbetsflöde
      </Typography>
      <List>
        <ListItem>
          <ListItemIcon><InfoIcon color="primary" /></ListItemIcon>
          <ListItemText 
            primary="Steg 1: Ladda upp Deltagardata"
            secondary="Börja med att ladda upp en Excel- eller CSV-fil exporterad från Eventor. Denna fil innehåller information om vilka medlemmar som deltagit i vilka tävlingar, deras klasser, och de ursprungliga avgifterna."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon><ArrowForwardIcon color="action" /></ListItemIcon>
          <ListItemText 
            primary="Automatisk Regelberäkning"
            secondary="Systemet applicerar automatiskt de fördefinierade ekonomiska reglerna på deltagardatan. Reglerna bestämmer hur stor del av avgiften som löparen ska betala respektive klubben. Exempelvis kan regler baseras på ålder, tävlingstyp (SM), eller om det är en sommartävling."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon><ArrowForwardIcon color="action" /></ListItemIcon>
          <ListItemText 
            primary="Resultatöversikt"
            secondary="Efter bearbetningen visas två tabeller: en summering per medlem och en detaljerad vy per tävling. Här kan du se de beräknade avgifterna och vilka regler som har tillämpats."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon><ArrowForwardIcon color="action" /></ListItemIcon>
          <ListItemText 
            primary="Exportera till Excel"
            secondary="Du kan exportera resultaten till en Excel-fil. Exporten är grupperad med medlemmar som huvudrader och deras tävlingar som underordnade, hopfällbara rader."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon><ArrowForwardIcon color="action" /></ListItemIcon>
          <ListItemText 
            primary="Steg 2: Ladda upp Fakturor (Frivilligt)"
            secondary="Om du vill stämma av de beräknade avgifterna mot faktiska fakturor från arrangörer, kan du ladda upp dessa som PDF- eller ZIP-filer. Observera att endast fakturor från Eventor kan matchas. Systemet försöker då matcha tävlingar från deltagardatan med information från fakturorna."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon><ArrowForwardIcon color="action" /></ListItemIcon>
          <ListItemText 
            primary="Fakturaavstämning"
            secondary="En separat tabell visar resultatet av fakturaavstämningen, där du kan se matchade tävlingar, eventuella differenser i belopp, samt ej matchade fakturor."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon><ArrowForwardIcon color="action" /></ListItemIcon>
          <ListItemText 
            primary="Hantera Regler"
            secondary="Under 'Hantera Regler' kan du justera parametrarna för vissa av de ekonomiska reglerna, t.ex. procentandel och maxbelopp för medlemmars egenavgift eller datumintervall för sommarperioden. När en regel ändras och sparas, kommer systemet automatiskt att omberäkna resultaten baserat på den senast uppladdade deltagarfilen."
          />
        </ListItem>
      </List>

      <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
        Viktigt att notera:
      </Typography>
      <Typography component="div">
        <ul>
          <li>Systemet är beroende av korrekt formaterade indatafiler från Eventor.</li>
          <li>Regelmotorn är flexibel men dess korrekthet beror på hur reglerna är definierade och underhållna.</li>
          <li>Vid omberäkning efter regeländring används alltid den senast bearbetade deltagarfilen. Om du vill använda en annan fil måste du starta om processen och ladda upp den på nytt.</li>
        </ul>
      </Typography>
      
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button variant="contained" onClick={onClose} color="primary">
          Stäng Information
        </Button>
      </Box>
    </Paper>
  );
};

export default InfoPage;
