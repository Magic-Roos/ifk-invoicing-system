import * as XLSX from 'xlsx';

// Interface for data rows, can be generic
export interface ExportRow {
  [key: string]: any;
}

// Configuration for each sheet
export interface SheetConfig {
  sheetName: string;
  data: ExportRow[];
  columnOrder?: string[]; // Optional: to specify column order and inclusion
  columnHeaders?: { [key: string]: string }; // Optional: to rename headers
}

/**
 * Exports data to an Excel file with multiple sheets.
 * @param sheets An array of SheetConfig objects, each defining a sheet.
 * @param filename The desired name for the Excel file (without .xlsx extension).
 */
export const exportToExcel = (sheets: SheetConfig[], filename: string): void => {
  if (!sheets || sheets.length === 0) {
    console.warn('No sheets data provided for export.');
    alert('Ingen data att exportera.');
    return;
  }

  const workbook = XLSX.utils.book_new();

  sheets.forEach(sheetConfig => {
    const originalData = sheetConfig.data;

    if (!originalData || originalData.length === 0) {
      console.warn(`No data for sheet '${sheetConfig.sheetName}'. Creating an empty sheet.`);
      const emptyWs = XLSX.utils.aoa_to_sheet([[`Ingen data tillgänglig för ${sheetConfig.sheetName}`]]);
      XLSX.utils.book_append_sheet(workbook, emptyWs, sheetConfig.sheetName);
      return; 
    }

    const rowOutlineLevels: Array<{ level?: number }> = [];
    
    // Create data for processing: extract outline levels and remove _rowType property.
    const dataForProcessing = originalData.map(originalRow => {
      const rowCopy = { ...originalRow };
      if (rowCopy.hasOwnProperty('_rowType')) {
        if (rowCopy._rowType === 'summary') {
          rowOutlineLevels.push({ level: 1 });
        } else if (rowCopy._rowType === 'detail') {
          rowOutlineLevels.push({ level: 2 });
        } else {
          rowOutlineLevels.push({}); // No specific level for other types
        }
        delete rowCopy._rowType; // Remove the property so it doesn't become a column
      } else {
        rowOutlineLevels.push({}); // No _rowType, no specific level
      }
      return rowCopy;
    });

    let finalSheetData: ExportRow[];

    // Apply column order and custom headers if specified, using dataForProcessing
    if (sheetConfig.columnOrder) {
      finalSheetData = dataForProcessing.map(row => {
        const newRow: ExportRow = {};
        sheetConfig.columnOrder!.forEach(keyFromOrder => {
          const displayHeader = (sheetConfig.columnHeaders && sheetConfig.columnHeaders[keyFromOrder]) 
                                ? sheetConfig.columnHeaders[keyFromOrder] 
                                : keyFromOrder;
          if (row.hasOwnProperty(keyFromOrder)) {
            newRow[displayHeader] = row[keyFromOrder];
          } else {
            newRow[displayHeader] = ''; 
          }
        });
        return newRow;
      });
    } else if (sheetConfig.columnHeaders) {
      finalSheetData = dataForProcessing.map(row => {
        const newRow: ExportRow = {};
        Object.keys(row).forEach(originalKey => {
          const displayHeader = sheetConfig.columnHeaders![originalKey] || originalKey;
          newRow[displayHeader] = row[originalKey];
        });
        return newRow;
      });
    } else {
      finalSheetData = dataForProcessing; // Use data with _rowType removed, no other transformations
    }
    
    const worksheet = XLSX.utils.json_to_sheet(finalSheetData);

    // Apply outline levels to the worksheet rows
    if (rowOutlineLevels.length === finalSheetData.length && rowOutlineLevels.some(p => p.level !== undefined)) {
      worksheet['!rows'] = rowOutlineLevels;
    }

    // Auto-size columns based on finalSheetData
    if (finalSheetData.length > 0) {
      const columnKeysForWidth = Object.keys(finalSheetData[0] || {});
      const colWidths = columnKeysForWidth.map(header => {
        let maxWidth = header.length;
        finalSheetData.forEach(dataRow => {
          const cellValue = dataRow[header];
          const cellLength = cellValue ? String(cellValue).length : 0;
          if (cellLength > maxWidth) {
            maxWidth = cellLength;
          }
        });
        return { wch: maxWidth + 2 }; 
      });
      if (colWidths.length > 0) {
        worksheet['!cols'] = colWidths;
      }
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetConfig.sheetName);
  });

  if (workbook.SheetNames.length > 0) {
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    console.log(`Data exported to ${filename}.xlsx`);
  } else {
    console.warn('Workbook has no sheets. Export aborted.');
    alert('Kunde inte generera exportfilen då ingen data fanns.');
  }
};
