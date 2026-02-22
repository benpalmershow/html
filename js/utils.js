// Utility functions for formatting and data manipulation

// Helper: Check if a value contains valid data
function isValidData(value) {
    return value && value !== '' && !value.startsWith('TBD');
}

// Helper: Format Y-axis tick values with K suffix for thousands
function formatYAxisTick(value) {
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toLocaleString();
}

function formatDate(dateString, formatType = 'full') {
    const date = new Date(dateString);
    if (formatType === 'short') {
        return date.toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric'
        });
    } else {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function formatChangeIndicator(percentChange) {
    if (percentChange === null || percentChange === undefined) {
        return { formatted: '—', cssClass: 'change-neutral', direction: 0 };
    }

    const formatted = typeof percentChange === 'number'
        ? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`
        : percentChange;

    const isNeutral = formatted === "—" || formatted === "0" || formatted === "0.00" || formatted === "+0.00%";
    const isPositive = formatted.startsWith('+') && !isNeutral;
    const isNegative = formatted.startsWith('-');

    return {
        formatted,
        cssClass: isNeutral ? 'change-neutral' : isPositive ? 'change-positive' : 'change-negative',
        direction: isNeutral ? 0 : isPositive ? 1 : -1
    };
}

function extractNumericValue(value) {
    if (!value || value === '' || value.startsWith('TBD') || value === '—') return null;

    let cleanValue = value.toString()
        .replace(/[$,%]/g, '')
        .replace(/^\+/g, '')
        .replace(/[A-Za-z]/g, '')
        .trim();

    if (value.includes('M')) cleanValue = cleanValue.replace(/M$/, '');
    if (value.includes('B')) cleanValue = cleanValue.replace(/B$/, '');

    const num = parseFloat(cleanValue);
    return isNaN(num) ? null : num;
}

function formatCompactNumber(num) {
    if (num === null || num === undefined) return '—';

    const absNum = Math.abs(num);

    // For numbers >= 1000, use K suffix
    if (absNum >= 1000) {
        const kValue = num / 1000;
        // Show 1 decimal place for values under 100K, no decimals for 100K+
        if (absNum < 100000) {
            const formatted = kValue.toFixed(1);
            // Remove .0 decimals
            const clean = formatted.replace(/\.0$/, '');
            return (num >= 0 ? '+' : '') + clean + 'K';
        } else {
            return (num >= 0 ? '+' : '') + Math.round(kValue) + 'K';
        }
    }

    // For smaller numbers, show as-is
    const formatted = num.toFixed(2).replace('.00', '');
    return (num >= 0 ? '+' : '') + formatted;
}

function getLatestMonthForIndicator(indicator, MONTHS) {
     // Find year-nested data (keys that are numeric/year-like)
     const yearKeys = Object.keys(indicator)
         .filter(key => /^\d{4}$/.test(key))
         .map(key => parseInt(key))
         .sort((a, b) => b - a); // Sort years descending

     // Check year-nested data first (newest years first)
     for (const year of yearKeys) {
         for (let i = MONTHS.length - 1; i >= 0; i--) {
             const month = MONTHS[i];
             if (isValidData(indicator[year][month])) {
                 // Calculate approximate days since data was released
                 const now = new Date();

                 // Get release day (default to 15th if not specified or 0)
                 const releaseDay = indicator.releaseDay && indicator.releaseDay > 0 ? indicator.releaseDay : 15;

                 // Create the approximate release date for year-nested data
                 const releaseDate = new Date(year, i, releaseDay);

                 // Calculate days old
                 const daysOld = Math.floor((now - releaseDate) / (1000 * 60 * 60 * 24));

                 return {
                     monthIndex: i,
                     monthName: MONTHS[i],
                     daysOld: daysOld >= 0 ? daysOld : 9999 // If negative (future date), treat as very old
                 };
             }
         }
     }

     // Fall back to flat structure
     for (let i = MONTHS.length - 1; i >= 0; i--) {
         const month = MONTHS[i];
         if (isValidData(indicator[month])) {
             // Calculate approximate days since data was released
             const now = new Date();
             const currentYear = now.getFullYear();
             const currentMonth = now.getMonth(); // 0-11

             // Get release day (default to 15th if not specified or 0)
             const releaseDay = indicator.releaseDay && indicator.releaseDay > 0 ? indicator.releaseDay : 15;

             // Determine the year for this data point
             // If the data month is in the future relative to current month, it's from last year
             let dataYear = currentYear;
             if (i > currentMonth) {
                 dataYear = currentYear - 1;
             }

             // Create the approximate release date
             const releaseDate = new Date(dataYear, i, releaseDay);

             // Calculate days old
             const daysOld = Math.floor((now - releaseDate) / (1000 * 60 * 60 * 24));

             return {
                 monthIndex: i,
                 monthName: MONTHS[i],
                 daysOld: daysOld >= 0 ? daysOld : 9999 // If negative (future date), treat as very old
             };
         }
     }

     // No data found
     return {
         monthIndex: -1,
         monthName: 'none',
         daysOld: 99999 // Very high value to sort to bottom
     };
 }

function calculateMoMChange(indicator, MONTHS) {
    let currentValue = null;
    let previousValue = null;
    let currentRawValue = '';

    // Find year-nested data (keys that are numeric/year-like)
    const yearKeys = Object.keys(indicator)
        .filter(key => /^\d{4}$/.test(key))
        .map(key => parseInt(key))
        .sort((a, b) => b - a); // Sort years descending

    // Build chronological list of all available data points
    const allDataPoints = [];
    
    // Add year-nested data first (in reverse chronological order)
    for (const year of yearKeys) {
        for (let i = MONTHS.length - 1; i >= 0; i--) {
            const month = MONTHS[i];
            const value = indicator[year][month];
            if (isValidData(value)) {
                allDataPoints.push({
                    value: value,
                    numeric: extractNumericValue(value),
                    year: year,
                    monthIndex: i
                });
            }
        }
    }
    
    // Add flat structure data (legacy support)
    for (let i = MONTHS.length - 1; i >= 0; i--) {
        const month = MONTHS[i];
        const value = indicator[month];
        if (isValidData(value)) {
            allDataPoints.push({
                value: value,
                numeric: extractNumericValue(value),
                year: null,
                monthIndex: i
            });
        }
    }

    // Get the two most recent data points
    if (allDataPoints.length >= 2) {
        currentValue = allDataPoints[0].numeric;
        currentRawValue = allDataPoints[0].value;
        previousValue = allDataPoints[1].numeric;
    }

    if (currentValue === null || previousValue === null || previousValue === 0) return null;

    const change = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    const numberChange = currentValue - previousValue;

    return {
        percentChange: change,
        numberChange: numberChange,
        currentRawValue: currentRawValue
    };
}

function calculateYoYChange(indicator, MONTHS) {
    const yearKeys = Object.keys(indicator)
        .filter(key => /^\d{4}$/.test(key))
        .map(key => parseInt(key, 10))
        .sort((a, b) => b - a); // Newest year first

    // Require roughly one year of monthly history before showing YoY.
    let totalValidPoints = 0;
    for (const month of MONTHS) {
        if (isValidData(indicator[month]) && extractNumericValue(indicator[month]) !== null) {
            totalValidPoints++;
        }
    }
    for (const year of yearKeys) {
        for (const month of MONTHS) {
            const value = indicator[year] && indicator[year][month];
            if (isValidData(value) && extractNumericValue(value) !== null) {
                totalValidPoints++;
            }
        }
    }
    if (totalValidPoints < 12) return null;

    let latest = null;
    for (const year of yearKeys) {
        for (let i = MONTHS.length - 1; i >= 0; i--) {
            const month = MONTHS[i];
            const value = indicator[year] && indicator[year][month];
            const numeric = extractNumericValue(value);
            if (isValidData(value) && numeric !== null) {
                latest = { value, numeric, year, month, monthIndex: i };
                break;
            }
        }
        if (latest) break;
    }

    if (!latest) return null;

    let yearBackValue = null;
    const previousYearData = indicator[latest.year - 1];
    if (previousYearData && previousYearData[latest.month] !== undefined) {
        yearBackValue = previousYearData[latest.month];
    } else if (indicator[latest.month] !== undefined) {
        // Mixed schema support: flat month values represent the prior-year baseline.
        yearBackValue = indicator[latest.month];
    }

    const yearBackNumeric = extractNumericValue(yearBackValue);
    if (!isValidData(yearBackValue) || yearBackNumeric === null || yearBackNumeric === 0) return null;

    const percentChange = ((latest.numeric - yearBackNumeric) / Math.abs(yearBackNumeric)) * 100;

    return {
        percentChange,
        numberChange: latest.numeric - yearBackNumeric,
        currentRawValue: latest.value
    };
}

function calculateAllMonthlyChanges(indicator, MONTHS) {
     const changes = [];

     // Find year-nested data (keys that are numeric/year-like)
     const yearKeys = Object.keys(indicator)
         .filter(key => /^\d{4}$/.test(key))
         .map(key => parseInt(key))
         .sort((a, b) => a - b); // Sort years ascending (oldest first) for chronological order

     // Build list of all data points in chronological order
     const allValues = [];
     
     // Add flat structure data first (legacy data, chronologically earlier)
     for (let i = 0; i < MONTHS.length; i++) {
         const month = MONTHS[i];
         const value = extractNumericValue(indicator[month]);
         if (value !== null) {
             allValues.push({ value, month, year: null, monthIndex: i });
         }
     }
     
     // Add year-nested data in chronological order (ascending years)
     for (const year of yearKeys) {
         for (let i = 0; i < MONTHS.length; i++) {
             const month = MONTHS[i];
             const value = extractNumericValue(indicator[year][month]);
             if (value !== null && !allValues.some(v => v.month === month && v.year === year)) {
                 allValues.push({ value, month, year, monthIndex: i });
             }
         }
     }

     // Calculate changes between consecutive data points
     for (let i = 1; i < allValues.length; i++) {
         const current = allValues[i];
         const previous = allValues[i - 1];
         
         const change = current.value - previous.value;
         const formattedChange = formatCompactNumber(change);

         changes.push({
             month: current.month,
             change: change,
             formatted: formattedChange
         });
     }

     return changes;
 }
