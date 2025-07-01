# IFK Göteborg Orientering - Medlemsfakturering Underlagssystem

Detta projekt är en webbapplikation (frontend-only) designad för att hjälpa IFK Göteborg Orienterings kassör att hantera underlag för fakturering av medlemmar baserat på deras tävlingsdeltagande. Applikationen hanterar parsning av deltagarfiler, tillämpning av avgiftsregler och generering av sammanställningar för fakturering och avstämning mot fakturor. All databehandling och regelhantering sker direkt i användarens webbläsare.

## Funktionalitet

- **Import av deltagardata:** Stöd för både Excel- och CSV-filer exporterade från Eventor.
- **Regelhantering:** Avgifter beräknas automatiskt enligt klubbens regler (ungdom, SM, sommarperiod, junior-subvention mm).
  - **Ny regel:** Juniorer (17-20 år) betalar 50% av startavgiften, dock max 200 kr, resten betalas av klubben.
- **Export av fakturaunderlag:**
  - **Excel:** Hierarkisk export där varje medlem kan expanderas för att visa tävlingsrader (för granskning och arkivering). Alla belopp avrundas nu konsekvent till två decimaler.
  - **CSV:** Två varianter för Fortnox-import:
    - **Endast fakturerbara poster** (belopp > 0)
    - **Komplett underlag** (alla poster, även de med 0 kr)
  - CSV-filerna är anpassade för enkel import till Fortnox och saknar rubrikrad enligt krav. Alla belopp avrundas till två decimaler.

**Exempel på CSV-rad:**
```csv
"Anders Andersson",1,120.00,"SM lång 2024-06-18 H21"
```

## Projektstruktur

- `/frontend`: Innehåller React + TypeScript frontend-applikationen, byggd med Vite.
  - `src/processing/rules/`: Innehåller regler (t.ex. junior_fee_share, other_members_fee_share)
  - `src/exportToExcelWithOutline.ts` och `src/InvoicingBasisTab.tsx`: Exportfunktioner för Excel och CSV
  - `src/utils/roundToTwoDecimals.ts`: Gemensam avrundningsfunktion för två decimaler
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

5.  **Spara och pusha ändringar till GitHub:**
    ```bash
    git add .
    git commit -m "Implementerat juniorregel och harmoniserad avrundning för export"
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
