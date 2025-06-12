const path = require('path');
const fs = require('fs/promises'); // For reading files asynchronously
const pdf = require('pdf-parse'); // For parsing PDF files
const AdmZip = require('adm-zip'); // For handling ZIP files

// Helper function to extract specific details from invoice text
const extractInvoiceDetails = (text) => {
  const details = {
    competitionName: null,
    date: null,
    totalAmount: null,
    invoiceNumber: null, // Added for completeness, similar to previous example
  };

  // Regex for Competition Name (Tävling)
  // Looks for 'Tävling', optional non-alphanumeric chars, then captures text until a known next label or end of line.
  const competitionRegex = /Tävling(?:[\s·]*)([^\n]+?)(?=\n(?:Tävlingsdatum|Bankgiro|Summa(?:\s*att\s*betala)?|Förfallodatum|Fakturanummer)|$)/i;
  const competitionMatch = text.match(competitionRegex);
  if (competitionMatch && competitionMatch[1]) {
    details.competitionName = competitionMatch[1].trim();
  }

  // Regex for Date (Tävlingsdatum)
  const dateRegex = /Tävlingsdatum(?:[\s·]*)([0-9]{4}-[0-9]{2}-[0-9]{2})/i;
  const dateMatch = text.match(dateRegex);
  if (dateMatch && dateMatch[1]) {
    details.date = dateMatch[1].trim();
  }

  // Regex for Total Amount (Summa att betala)
  // Handles 'Summa att betala' or 'Summaattbetala', captures digits and spaces, removes spaces, ends with SEK.
  const amountRegex = /Summa(?:\s*att\s*betala)?(?:[\s·]*)([0-9\s]+)SEK/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch && amountMatch[1]) {
    details.totalAmount = amountMatch[1].replace(/\s/g, ''); // Remove spaces from amount like "4 320"
  }

  // Regex for Invoice Number (Fakturanummer) - from previous example, good to have
  const invoiceNumberRegex = /Fakturanummer(?:[\s·]*)([0-9A-Za-z]+)/i;
  const invoiceNumberMatch = text.match(invoiceNumberRegex);
  if (invoiceNumberMatch && invoiceNumberMatch[1]) {
    details.invoiceNumber = invoiceNumberMatch[1].trim();
  }

  return details;
};

const processUploadedInvoices = async (uploadedFiles) => {

  const extractedData = [];

  for (const file of uploadedFiles) {
    try {

      // Multer is configured with memoryStorage, so file.buffer should be used.

      if (!file.buffer) {
        console.error(`File buffer is missing for ${file.originalname}. This should not happen with memoryStorage.`);
        throw new Error(`File buffer is missing for ${file.originalname}`);
      }

      if (file.mimetype === 'application/pdf') {
        const data = await pdf(file.buffer); // Use file.buffer
        const parsedDetails = extractInvoiceDetails(data.text);
        extractedData.push({
          filename: file.originalname,
          type: 'pdf',
          pageCount: data.numpages,
          textPreview: data.text.substring(0, 500) + (data.text.length > 500 ? '...' : ''),
          parsedInfo: parsedDetails,
          // fullText: data.text, // Potentially very long
        });

      } else if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
        const zip = new AdmZip(file.buffer); // Use file.buffer
        const zipEntries = zip.getEntries();
        const zipFileContents = [];

        for (const zipEntry of zipEntries) {
          // Skip macOS metadata files and directories
          if (zipEntry.isDirectory || 
              zipEntry.entryName.startsWith('__MACOSX/') || 
              zipEntry.entryName.split('/').pop().startsWith('._')) {

            continue;
          }

          if (zipEntry.entryName.toLowerCase().endsWith('.pdf')) {

            const entryDataBuffer = zipEntry.getData(); // AdmZip gives buffer directly
            const data = await pdf(entryDataBuffer);
            const parsedDetails = extractInvoiceDetails(data.text);
            zipFileContents.push({
              entryName: zipEntry.entryName,
              pageCount: data.numpages,
              textPreview: data.text.substring(0, 500) + (data.text.length > 500 ? '...' : ''),
              parsedInfo: parsedDetails,
            });

          }
        }
        extractedData.push({
          filename: file.originalname,
          type: 'zip',
          containedPdfs: zipFileContents,
        });
      } else {

        extractedData.push({
          filename: file.originalname,
          type: 'unsupported',
          message: `File type ${file.mimetype} is not supported for parsing.`
        });
      }
    } catch (error) {
      console.error(`Error processing file ${file.originalname}:`, error);
      extractedData.push({
        filename: file.originalname,
        type: 'error',
        message: `Failed to process: ${error.message}`
      });
    }
  }



  return {
    message: 'Invoice files processed. Review extracted data.',
    processedFiles: extractedData
  };
};

exports.uploadInvoices = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No invoice files were uploaded.' });
    }


    // For now, just acknowledge receipt and list files
    // In the future, this will call more complex processing logic
    const processingResult = await processUploadedInvoices(req.files);

    res.status(200).json({
      message: 'Invoice files uploaded successfully. Further processing pending.',
      files: req.files.map(file => ({
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      })),
      parsedData: processingResult // Renamed for clarity
    });
  } catch (error) {
    console.error('Error uploading/processing invoices:', error);
    res.status(500).json({ message: 'Error processing invoice files', error: error.message });
  }
};
