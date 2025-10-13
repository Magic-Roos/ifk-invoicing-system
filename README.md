# IFK Göteborg Orientering - Medlemsfakturering Underlagssystem

Detta projekt är en webbapplikation (frontend-only) designad för att hjälpa IFK Göteborg Orienterings kassör att hantera underlag för fakturering av medlemmar baserat på deras tävlingsdeltagande. Applikationen hanterar parsning av deltagarfiler, tillämpning av avgiftsregler och generering av sammanställningar för fakturering och avstämning mot fakturor. All databehandling och regelhantering sker direkt i användarens webbläsare.

## Funktionalitet

### Import och regelhantering
- **Import av deltagardata:** Stöd för både Excel- och CSV-filer exporterade från Eventor.
- **Regelhantering:** Avgifter beräknas automatiskt enligt klubbens regler:
  - Ungdom (t.o.m. 16 år): Klubben betalar hela avgiften
  - Juniorer (17-20 år): Betalar 50% av startavgiften, dock max 200 kr
  - SM-tävlingar: Klubben betalar hela avgiften (kräver både "SM" i namnet och arrangemangstyp "Mästerskapstävling")
  - Sommarperiod: Löpare betalar hela avgiften (konfiguerbar period)
  - Sena anmälningar, DNS, chip-hyra: Löpare betalar hela avgiften
  - Övriga medlemmar: Betalar 70% av avgiften, dock max 200 kr (konfigurerbart)

### Visningar och export
- **Per Medlem:** Översikt grupperad per medlem med totalsummor
- **Per Tävling:** Översikt grupperad per tävling
- **Fakturaavstämning:** Matcha uppladdade fakturor mot deltagardata
- **Fakturaunderlag:** Export för Fortnox-import
  - **Excel:** Hierarkisk export där varje medlem kan expanderas för att visa tävlingsrader
  - **CSV:** Två varianter för Fortnox-import:
    - **Endast fakturerbara poster** (belopp > 0)
    - **Komplett underlag** (alla poster, även de med 0 kr)
  - CSV-filerna saknar rubrikrad enligt krav. Alla belopp avrundas till två decimaler.

### Tränings- och tävlingsavgift (NY!)
- **Automatisk räkning:** Identifierar medlemmar som sprungit 3 eller fler tävlingar
- **Smarta undantag:** Exkluderar automatiskt:
  - Vårserien
  - Motion- och veteranorientering
  - Flerdagars sommartävlingar
- **Flexibel hantering:**
  - Konfigurerbart avgiftsbelopp (default 300 kr)
  - Konfigurerbar beskrivning
  - Manuell in-/exkludering av både medlemmar och individuella tävlingar
- **CSV-export:** Genererar fil för Fortnox-import med endast kvalificerade medlemmar (3+ tävlingar)

**Exempel på CSV-rader:**
```csv
"Anders Andersson",1,120.00,"SM lång 2024-06-18 H21"
"Karin Karlsson",1,300,"Tävlings- och träningsavgift"
```

## Projektstruktur

- `/frontend`: Innehåller React + TypeScript frontend-applikationen, byggd med Vite.
  - `src/processing/`: Innehåller all databehandlingslogik
    - `fileProcessor.ts`: Parsning av Excel/CSV-filer från Eventor
    - `ruleEngineService.ts`: Regelmotor för avgiftsberäkning
    - `trainingFeeProcessor.ts`: Logik för tränings- och tävlingsavgift
    - `invoiceProcessor.ts`: Hantering av faktura-PDF:er
  - `src/`: React-komponenter för olika vyer
    - `ResultsTable.tsx`: Vy per medlem
    - `CompetitionResultsTable.tsx`: Vy per tävling
    - `InvoiceReconciliationTable.tsx`: Fakturaavstämning
    - `InvoicingBasisTab.tsx`: Fakturaunderlag för Fortnox
    - `TrainingFeeTab.tsx`: Tränings- och tävlingsavgift (NY!)
    - `RuleEditor.tsx`: Redigering av regler
  - `src/rulesConfig.ts`: Standardregler för avgiftsberäkning
  - `src/types.ts`: TypeScript-typdefinitioner
  - `src/utils/roundToTwoDecimals.ts`: Gemensam avrundningsfunktion
- `/Sample data`: Innehåller exempeldatafiler för testning.

## Förutsättningar

- Node.js och npm (eller Yarn)

## Komma igång (Utveckling)

1.  **Klona projektet (om du inte redan gjort det):**
    ```bash
    git clone [URL till ditt GitHub repo]
    cd ifk-invoicing-system
    ```

2.  **Navigera till frontend-katalogen:**
    ```bash
    cd frontend
    ```

3.  **Installera beroenden:**
    ```bash
    npm install
    ```

4.  **Starta utvecklingsservern:**
    ```bash
    npm run dev
    ```
    Applikationen bör nu vara tillgänglig på `http://localhost:5173` (eller en annan port som Vite anger).

5.  **Testa applikationen:**
    - Ladda upp en deltagarfil från Eventor (Excel eller CSV)
    - Utforska de olika vyerna (Per Medlem, Per Tävling, etc.)
    - Testa den nya funktionen för tränings- och tävlingsavgift
    - Exportera fakturaunderlag för Fortnox

6.  **Spara och pusha ändringar till GitHub:**
    ```bash
    git add .
    git commit -m "Din commit-meddelande här"
    git push
    ```

## Linting och Formatering (i `/frontend`-katalogen)

Projektet använder ESLint och Prettier för kodkvalitet.

-   **Kör linting:**
    ```bash
    npm run lint
    ```
-   **Fixa linting-problem automatiskt:**
    ```bash
    npm run lint:fix
    ```
-   **Formatera kod:**
    ```bash
    npm run format
    ```

## Teknisk Stack

-   **Frontend:** React, TypeScript, Vite, Material UI (MUI), PapaParse (CSV-parser), exceljs (Excel-export), JSZip, pdf.js (PDF-hantering)
-   **Datapersistens (för regler):** Webbläsarens `localStorage`
-   **Pakethanterare:** npm

## Deployment

Applikationen är konfigurerad för att kunna deployas som en statisk webbplats. För Netlify, se till att följande inställningar används:
-   **Base directory:** `frontend`
-   **Build command:** `npm run build`
-   **Publish directory:** `dist` (eller `frontend/dist`)
