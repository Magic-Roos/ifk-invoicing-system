# CLAUDE.md

## Projektöversikt

IFK Göteborg Orientering - Medlemsfakturering Underlagssystem. En frontend-only webbapplikation (React + TypeScript + Vite) som hjälper klubbens kassör att hantera faktureringsunderlag baserat på medlemmars tävlingsdeltagande via Eventor.

## Projektstruktur

- `/frontend` - React + TypeScript app (Vite)
  - `src/processing/` - Databehandlingslogik (filparsning, regelmotor, faktura)
  - `src/` - React-komponenter (vyer, redigering)
  - `src/rulesConfig.ts` - Standardregler för avgiftsberäkning
  - `src/types.ts` - TypeScript-typdefinitioner
- `/Sample data` - Exempelfiler för testning

## Teknikstack

- React 18, TypeScript, Vite, Material UI (MUI 5)
- PapaParse (CSV), exceljs (Excel-export), JSZip, pdf.js
- ESLint + Prettier för kodkvalitet
- Datapersistens via `localStorage` (regler)
- Deployment: Netlify (statisk site)

## Utvecklingskommandon

Alla kommandon körs från `/frontend`:

```bash
npm install        # Installera beroenden
npm run dev        # Starta dev-server (localhost:5173)
npm run build      # Bygg för produktion
npm run lint       # Kör linting
npm run lint:fix   # Fixa lint-problem
npm run format     # Formatera kod med Prettier
```

## Git-arbetsflöde

- **Skapa alltid en ny branch** i början av varje session – namnge den beskrivande (t.ex. `feature/beskrivning` eller `fix/beskrivning`)
- **Planera innan kod skrivs** – presentera en plan för användaren och invänta godkännande innan implementation påbörjas
- **Aldrig commit direkt till `main`** – allt arbete sker på feature-branches
- **Commits kräver godkännande** – fråga användaren innan varje commit
- **Pusha branchen till GitHub** när arbetet är klart och committat
- **Skapa en Pull Request (PR)** efter push – så användaren kan granska ändringarna på GitHub innan merge till `main`
- **Merga aldrig till `main` utan godkännande** – invänta användarens OK
- `main` → auto-deploy till produktion
