/* eslint-disable @typescript-eslint/no-explicit-any */

// Represents a single row of raw data parsed from a CSV or Excel file.
// Keys are typically column headers.
export type RawDataItem = {
  [key: string]: any;
};

// Represents the standardized data structure for a single participation event
// after initial processing and before rules are applied.
export interface ParticipationData {
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
}

// Represents the final output after the rule engine has processed a participation event.
export interface BillingResult extends ParticipationData {
  runnerInvoiceAmount: number;
  clubPaysAmount: number;
  appliedRule: string;
}

// Defines the structure for a single invoicing rule.
// Interface for the detailed parsed information from a single invoice PDF
export interface ParsedInvoiceInfo {
  competitionName: string | null;
  date: string | null;
  totalAmount: string | null;
  invoiceNumber: string | null;
}

// Interface for the structure of each item in the 'extractedData' array from the backend
// Define which keys of CombinedData are sortable
export type OrderableReconciliationKeys =
  | 'eventorCompetitionName'
  | 'eventorCompetitionDate'
  | 'eventorTotalFee'
  | 'invoiceOriginFile'
  | 'invoiceCompetitionName'
  | 'invoiceDate'
  | 'invoiceTotalAmount'
  | 'invoiceNumber'
  | 'difference';

export interface ContainedPdfData {
  filename: string; // Name of the PDF file itself
  type: 'pdf' | 'error'; // Type of the content within the zip
  pageCount?: number;
  textPreview?: string;
  parsedInfo?: ParsedInvoiceInfo;
  message?: string; // Error message if this specific PDF failed
}

export interface UploadedInvoiceData {
  filename: string; // Name of the uploaded file (PDF or ZIP)
  type: 'pdf' | 'zip' | 'error';
  // For type 'pdf'
  pageCount?: number;
  textPreview?: string;
  parsedInfo?: ParsedInvoiceInfo;
  // For type 'zip'
  containedPdfs?: ContainedPdfData[];
  // For type 'error' (top-level file error)
  message?: string;
}

export interface Rule {
  name: string;
  description: string;
  priority: number;
  condition: (participation: ParticipationData) => boolean;
  action: (participation: ParticipationData) => { runnerPays: number; clubPays: number };
}
