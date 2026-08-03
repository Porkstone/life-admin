// Convert stored date to yyyy-mm-dd for HTML date input
export function formatDateForInput(dateStr: string): string {
  if (!dateStr) return "";
  
  // If already in yyyy-mm-dd format, return as is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // If in dd-mm-yyyy format, convert to yyyy-mm-dd
  if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const [day, month, year] = dateStr.split("-");
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

// Convert date to UK format (DD/MM/YYYY) for display
export function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return "";
  
  let day, month, year;
  
  // If in yyyy-mm-dd format, convert to DD/MM/YYYY
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    [year, month, day] = dateStr.split("-");
  }
  // If in dd-mm-yyyy format, extract components
  else if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
    [day, month, year] = dateStr.split("-");
  }
  else {
    return dateStr;
  }
  
  return `${day}/${month}/${year}`;
}

// Convert dd/mm/yyyy input to dd-mm-yyyy for storage
export function formatDateFromInput(dateStr: string): string {
  if (!dateStr) return "";
  
  // If in dd/mm/yyyy format, convert to dd-mm-yyyy
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return dateStr.replace(/\//g, "-");
  }
  
  return dateStr;
}

// Convert HTML date input value (yyyy-mm-dd) to dd-mm-yyyy for storage
export function formatDateForStorage(dateStr: string): string {
  if (!dateStr) return "";
  
  // If in yyyy-mm-dd format (from HTML input), convert to dd-mm-yyyy
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
  }
  
  return dateStr;
}

// Validate dd/mm/yyyy format
export function isValidDateFormat(dateStr: string): boolean {
  if (!dateStr) return true; // Empty is valid (optional field)
  
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateStr)) return false;
  
  const [day, month, year] = dateStr.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

// Calculate whole calendar days from today to a stored date.
export function getDaysUntilDate(dateStr: string): number | null {
  if (!dateStr) return null;

  let day: number;
  let month: number;
  let year: number;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    [year, month, day] = dateStr.split("-").map(Number);
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    [day, month, year] = dateStr.split("-").map(Number);
  } else {
    return null;
  }

  const expiry = new Date(Date.UTC(year, month - 1, day));
  if (
    expiry.getUTCFullYear() !== year ||
    expiry.getUTCMonth() !== month - 1 ||
    expiry.getUTCDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  return Math.round((expiry.getTime() - todayUtc) / (1000 * 60 * 60 * 24));
}

// Get birthday info (day/month and days until next birthday)
export function getBirthdayInfo(dateOfBirth: string): { dayMonth: string; daysUntilBirthday: number } | null {
  if (!dateOfBirth) return null;
  
  let day, month, year;
  
  // Parse the date based on format
  if (dateOfBirth.match(/^\d{4}-\d{2}-\d{2}$/)) {
    [year, month, day] = dateOfBirth.split("-").map(Number);
  } else if (dateOfBirth.match(/^\d{2}-\d{2}-\d{4}$/)) {
    [day, month, year] = dateOfBirth.split("-").map(Number);
  } else {
    return null;
  }
  
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Create this year's birthday
  let nextBirthday = new Date(currentYear, month - 1, day);
  
  // If birthday has passed this year, use next year
  if (nextBirthday < today) {
    nextBirthday = new Date(currentYear + 1, month - 1, day);
  }
  
  // Calculate days until birthday
  const timeDiff = nextBirthday.getTime() - today.getTime();
  const daysUntilBirthday = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  // Format day/month with month name
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const dayMonth = `${day.toString().padStart(2, '0')} ${monthNames[month - 1]}`;
  
  return { dayMonth, daysUntilBirthday };
}
