export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const cleanMonetaryValue = (value: string | number): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  
  // Remove currency symbols, spaces, and other non-numeric chars except digits, dots and commas
  let clean = value.toString().replace(/[^\d.,-]/g, '').trim();
  
  if (clean === '') return 0;

  // Handle common formats: 
  // 1.000.000,00 (Latin/Euro) 
  // 1,000,000.00 (US)
  
  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');

  if (hasComma && hasDot) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      // 1.000,00 -> 1000.00
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,000.00 -> 1000.00
      clean = clean.replace(/,/g, '');
    }
  } else if (hasComma) {
    // 1000,00 -> 1000.00 OR 1,000 -> 1000
    // Check if it's likely a decimal (comma followed by 1 or 2 digits)
    const parts = clean.split(',');
    if (parts[1].length <= 2) {
      clean = clean.replace(',', '.');
    } else {
      clean = clean.replace(',', '');
    }
  } else if (hasDot) {
    // 1.000 -> 1000 OR 1000.00
    // If there's only one dot and it's near the end, it might be a decimal
    const parts = clean.split('.');
    if (parts[1].length > 2 && parts.length > 1) {
       // Likely thousands: 1.000
       clean = clean.replace(/\./g, '');
    }
  }

  return parseFloat(clean) || 0;
};

export const parseExcelDate = (date: any): string => {
  if (!date) return '';
  
  // Handle serial Excel date (e.g. 44649)
  if (!isNaN(date) && typeof date !== 'string') {
    const excelDate = Number(date);
    const dateObj = new Date((excelDate - 25569) * 86400 * 1000);
    return dateObj.toISOString().split('T')[0];
  }

  const dateStr = String(date).trim();
  if (dateStr === '') return '';

  // Handle DD/MM/YY or DD/MM/YYYY
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let [day, month, year] = parts;
      if (year.length === 2) {
        year = `20${year}`;
      }
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Handle DD-MM-YYYY
  if (dateStr.includes('-') && dateStr.split('-').length === 3) {
    const parts = dateStr.split('-');
    if (parts[0].length <= 2) { // Is likely DD-MM-YYYY
       let [day, month, year] = parts;
       if (year.length === 2) year = `20${year}`;
       return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return dateStr;
};
