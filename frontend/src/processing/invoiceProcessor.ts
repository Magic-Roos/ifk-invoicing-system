import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ParsedInvoiceInfo, UploadedInvoiceData, ContainedPdfData } from '../types';

// Set up the worker source for pdf.js. This is crucial for it to work in a web environment.
// Note: This path might need adjustment based on your project's build setup (e.g., Vite, Webpack).
// We point it to the copy of the worker file in the public directory or node_modules.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Helper function to extract specific details from invoice text using regex.
// This function is migrated directly from the backend controller.
const extractInvoiceDetails = (text: string): ParsedInvoiceInfo => {
  const details: ParsedInvoiceInfo = {
    competitionName: null,
    date: null,
    totalAmount: null,
    invoiceNumber: null,
  };

  const competitionRegex = /Tävling(?:[\s·:]+)(.*?)(?=\s*·?\s*(?:Tävlingsdatum|Bankgiro|Summa|Förfallodatum|Fakturanummer)|$)/is;
  const competitionMatch = text.match(competitionRegex);
  if (competitionMatch && competitionMatch[1]) {
    details.competitionName = competitionMatch[1].trim();
  }

  const dateRegex = /Tävlingsdatum(?:[\s·:]+)([0-9]{4}-\s?[0-9]{2}-\s?[0-9]{2})/i;
  const dateMatch = text.match(dateRegex);
  if (dateMatch && dateMatch[1]) {
    details.date = dateMatch[1].replace(/\s/g, '').trim();
  }

  const amountRegex = /Summa(?:\s*att\s*betala)?(?:[\s·]*)([0-9\s]+)SEK/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch && amountMatch[1]) {
    details.totalAmount = amountMatch[1].replace(/\s/g, '');
  }

  const invoiceNumberRegex = /Fakturanummer(?:[\s·]*)([0-9A-Za-z]+)/i;
  const invoiceNumberMatch = text.match(invoiceNumberRegex);
  if (invoiceNumberMatch && invoiceNumberMatch[1]) {
    details.invoiceNumber = invoiceNumberMatch[1].trim();
  }

  return details;
};

// Processes a single PDF file (as an ArrayBuffer) to extract text and parse details.
const processPdf = async (pdfBuffer: ArrayBuffer): Promise<{ pageCount: number; text: string; parsedInfo: ParsedInvoiceInfo }> => {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';

  if (pdf.numPages > 0) {
    const page = await pdf.getPage(1); // Only process the first page
    const textContent = await page.getTextContent();
    fullText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
  }

  return {
    pageCount: pdf.numPages,
    text: fullText,
    parsedInfo: extractInvoiceDetails(fullText),
  };
};

// Main function to process uploaded invoice files (PDFs or ZIPs).
export const processInvoices = async (files: File[]): Promise<UploadedInvoiceData[]> => {
  const allParsedData: UploadedInvoiceData[] = [];

  for (const file of files) {
    const fileBuffer = await file.arrayBuffer();

    if (file.type === 'application/pdf') {
      try {
        const pdfData = await processPdf(fileBuffer);
        allParsedData.push({
          filename: file.name,
          type: 'pdf',
          pageCount: pdfData.pageCount,
          textPreview: pdfData.text.substring(0, 200),
          parsedInfo: pdfData.parsedInfo,
        });
      } catch (error) {
        console.error(`Error processing PDF ${file.name}:`, error);
        allParsedData.push({ filename: file.name, type: 'error', message: 'Kunde inte läsa PDF-filen.' });
      }
    } else if (file.type === 'application/zip') {
      try {
        const zip = await JSZip.loadAsync(fileBuffer);
        const collectedContainedPdfs: ContainedPdfData[] = [];

        for (const entryName in zip.files) {
          const relativePath = entryName.replace(/^\/+/, '');
          if (relativePath.startsWith('__MACOSX/') || relativePath.endsWith('.DS_Store')) {
            continue;
          }

          if (relativePath.toLowerCase().endsWith('.pdf')) {
            const zipEntry = zip.files[entryName];
            const pdfBuffer = await zipEntry.async('arraybuffer');
            try {
              const pdfData = await processPdf(pdfBuffer);
              collectedContainedPdfs.push({
                filename: entryName, // PDF's own name
                type: 'pdf',
                pageCount: pdfData.pageCount,
                textPreview: pdfData.text.substring(0, 200),
                parsedInfo: pdfData.parsedInfo,
              });
            } catch (error) {
              console.error(`Error processing PDF ${entryName} from ZIP ${file.name}:`, error);
              collectedContainedPdfs.push({
                filename: entryName, // PDF's own name
                type: 'error',
                message: `Kunde inte läsa PDF-filen ${entryName} från ZIP-arkivet.`,
              });
            }
          }
        }
        allParsedData.push({ 
          filename: file.name, // ZIP file's name
          type: 'zip', 
          containedPdfs: collectedContainedPdfs 
        });
      } catch (error) {
        console.error(`Error processing ZIP ${file.name}:`, error);
        allParsedData.push({ filename: file.name, type: 'error', message: 'Kunde inte läsa ZIP-filen.' });
      }
    } else {
      console.warn(`Unsupported file type: ${file.name} (${file.type})`);
      allParsedData.push({ filename: file.name, type: 'error', message: 'Filtypen stöds inte. Endast PDF och ZIP accepteras.' });
    }
  }
  return allParsedData;
};
