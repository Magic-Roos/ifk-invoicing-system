# IFK Göteborg Orientering - Medlemsfakturering Underlagssystem

Detta projekt är en webbapplikation (frontend-only) designad för att hjälpa IFK Göteborg Orienterings kassör att hantera underlag för fakturering av medlemmar baserat på deras tävlingsdeltagande. Applikationen hanterar parsning av deltagarfiler, tillämpning av avgiftsregler och generering av sammanställningar för fakturering och avstämning mot fakturor. All databehandling och regelhantering sker direkt i användarens webbläsare.

## Projektstruktur

- `/frontend`: Innehåller React + TypeScript frontend-applikationen, byggd med Vite.
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

-   **Frontend:** React, TypeScript, Vite, Material UI (MUI), PapaParse (CSV-parser), SheetJS (xlsx) (Excel-hantering), JSZip, pdf.js (PDF-hantering)
-   **Datapersistens (för regler):** Webbläsarens `localStorage`
-   **Pakethanterare:** npm

## Deployment

Applikationen är konfigurerad för att kunna deployas som en statisk webbplats. För Netlify, se till att följande inställningar används:
-   **Base directory:** `frontend`
-   **Build command:** `npm run build`
-   **Publish directory:** `dist` (eller `frontend/dist`)
