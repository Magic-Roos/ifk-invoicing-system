import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
// Minimal MemberSummary type for export
interface MemberSummary {
  personId?: string | number | null;
  memberName: string;
  competitionCount: number;
  totalOriginalFee: number;
  totalToInvoiceMember: number;
  participations: BillingResult[];
}
// BillingResult from types.ts
interface BillingResult {
  PersonId: string | number | null;
  MemberName: string;
  CompetitionName: string;
  CompetitionDate: string;
  Arranger: string;
  EventType: string;
  BirthYear: number | null;
  ClassName: string;
  ClassType: string;
  Started: boolean;
  Placement: string | number | null;
  Time: string | null;
  age: number | null;
  isSMCompetition: boolean;
  feeAmount: number;
  feeType: string;
  description: string;
  runnerInvoiceAmount: number;
  clubPaysAmount: number;
  appliedRule: string;
}

export async function exportToExcelWithOutline(
  memberSummaries: MemberSummary[],
  filename = 'Faktureringsunderlag.xlsx'
) {
  // Sortera på efternamn (sista ordet i memberName)
  const sortedMembers = [...memberSummaries].sort((a, b) => {
    const getLastName = (name: string) => {
      if (!name) return '';
      const parts = name.trim().split(/\s+/);
      return parts.length > 1
        ? parts[parts.length - 1].toLowerCase()
        : name.toLowerCase();
    };
    const lastA = getLastName(a.memberName);
    const lastB = getLastName(b.memberName);
    if (lastA < lastB) return -1;
    if (lastA > lastB) return 1;
    // Om efternamn är lika, sortera på hela namnet
    return a.memberName.localeCompare(b.memberName);
  });
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Resultat per medlem');

  // Header
  worksheet.addRow([
    'Typ',
    'Namn',
    'Antal tävlingar',
    'Total originalavgift',
    'Att fakturera medlem',
    'Tävling',
    'Datum',
    'Startavgift',
    'Efteranm.avgift',
    'Tjänsteavgift',
    'Att fakturera (Löpare)',
    'Tillämpad Regel',
    'Beskrivning',
  ]);

  sortedMembers.forEach((summary) => {
    // Medlemsrad (outlineLevel 0)
    const memberRow = worksheet.addRow([
      'Medlem',
      summary.memberName,
      summary.competitionCount,
      summary.totalOriginalFee,
      summary.totalToInvoiceMember,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
    memberRow.outlineLevel = 0;
    memberRow.font = { bold: true };

    // Tävlingar (outlineLevel 1)
    if (summary.participations && summary.participations.length > 0) {
      summary.participations.forEach((p: BillingResult) => {
        const lateFee = p.feeType === 'Efteranm.avgift' ? p.feeAmount : '';
        const serviceFee = p.feeType === 'Tjänsteavgift' ? p.feeAmount : '';
        const standardFee = p.feeType === 'Startavgift' ? p.feeAmount : '';
        const compRow = worksheet.addRow([
          '',
          '',
          '',
          '',
          '',
          p.CompetitionName,
          p.CompetitionDate,
          standardFee,
          lateFee,
          serviceFee,
          p.runnerInvoiceAmount,
          p.appliedRule,
          p.description,
        ]);
        compRow.outlineLevel = 1;
      });
    }
  });

  worksheet.properties.outlineLevelRow = 1;
  worksheet.autoFilter = 'A1:M1';
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Adjust column widths
  worksheet.columns.forEach((col, idx) => {
    let maxLength = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLength) maxLength = val.length;
    });
    col.width = Math.min(maxLength + 2, 40);
  });

  // Write and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
}
