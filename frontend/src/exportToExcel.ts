import * as XLSX from 'xlsx';

// A generic row type
export type ExportRow = {
  [key: string]: any;
};

// Configuration for a single column in a sheet
export interface ColumnConfig<T> {
  header: string;
  key: keyof T;
  isCurrency?: boolean;
  transform?: (value: T[keyof T]) => string | number;
}

// Configuration for a single sheet, generic over the data row type
export interface SheetConfig<T> {
  sheetName: string;
  data: T[];
  columns: ColumnConfig<T>[];
}

/**
 * Exports data to an Excel file with multiple sheets.
 * @param sheets An array of SheetConfig objects, each defining a sheet.
 * @param filename The desired name for the Excel file (e.g., "report.xlsx").
 */
export const exportToExcel = (sheets: SheetConfig<any>[], filename: string): void => {
  if (!sheets || sheets.length === 0) {
    console.warn('No sheets data provided for export.');
    alert('Ingen data att exportera.');
    return;
  }

  const workbook = XLSX.utils.book_new();

  sheets.forEach(sheetConfig => {
    const { sheetName, data, columns } = sheetConfig;

    if (!data || data.length === 0) {
      console.warn(`No data for sheet '${sheetName}'. Creating an empty sheet.`);
      const emptyWs = XLSX.utils.aoa_to_sheet([[`Ingen data tillgänglig för ${sheetName}`]]);
      XLSX.utils.book_append_sheet(workbook, emptyWs, sheetName);
      return;
    }

    // Transform data according to column configuration
    const finalSheetData = data.map(row => {
      const newRow: ExportRow = {};
      columns.forEach(col => {
        const rawValue = row[col.key];
        // The transform function should handle potential undefined/null values
        const value = col.transform ? col.transform(rawValue) : rawValue;
        newRow[col.header] = value === undefined || value === null ? '' : value;
      });
      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(finalSheetData, {
      // Headers are derived from the keys of objects in finalSheetData
    });

    // Add row outlining/grouping based on _rowType from original sheetConfig.data
    // The `data` here refers to sheetConfig.data which contains the _rowType property.
    // `finalSheetData` is what's actually in the sheet (transformed, without _rowType).
    if (data && data.length > 0 && data.some(r => r && typeof r === 'object' && '_rowType' in r)) {
      if (!worksheet['!rows']) {
        worksheet['!rows'] = [];
      }
      const actualRowsArray = worksheet['!rows']; // Guarantees actualRowsArray is RowInfo[]
      data.forEach((originalRow, index) => {
        // originalRow is from sheetConfig.data, which might have _rowType
        // index corresponds to the row in finalSheetData (0-indexed data part of the sheet)
        const rowIndexInSheet = index + 1; // +1 because sheet data rows start after header (row 0 in sheet model)

        if (originalRow && typeof originalRow === 'object' && '_rowType' in originalRow) {
          // Ensure the row object exists in '!rows' array for this specific index
          if (!actualRowsArray[rowIndexInSheet]) {
            actualRowsArray[rowIndexInSheet] = {};
          }
          
          const rowObj = actualRowsArray[rowIndexInSheet];
          if (rowObj) { // Should always be true due to earlier check
            if (originalRow._rowType === 'summary') {
              rowObj.level = 1;
            } else if (originalRow._rowType === 'detail') {
              rowObj.level = 2;
            }
          }
        }
      });

      // Set worksheet options to show outlines if any row has a level > 0
      const rowsArray = worksheet['!rows']; // Keep reference for type narrowing
      const hasOutlineLevels = Array.isArray(rowsArray) && rowsArray.some(row => row && typeof row.level === 'number' && row.level > 0);
      if (hasOutlineLevels) {
        if (!worksheet['!outline']) {
          worksheet['!outline'] = {};
        }
        worksheet['!outline'].showoutline = true;
        worksheet['!outline'].summaryBelow = false; // Summary rows are above detail rows
      }
    }

    // Auto-size columns
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

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  if (workbook.SheetNames.length > 0) {
    XLSX.writeFile(workbook, filename);
    console.log(`Data exported to ${filename}`);
  } else {
    console.warn('Workbook has no sheets. Export aborted.');
    alert('Kunde inte generera exportfilen då ingen data fanns.');
  }
};
