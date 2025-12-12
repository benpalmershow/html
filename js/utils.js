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
            return (num >= 0 ? '+' : '') + kValue.toFixed(1) + 'K';
        } else {
            return (num >= 0 ? '+' : '') + Math.round(kValue) + 'K';
        }
    }

    // For smaller numbers, show as-is
    const formatted = num.toFixed(2).replace('.00', '');
    return (num >= 0 ? '+' : '') + formatted;
}

function getLatestMonthForIndicator(indicator, MONTHS) {
    // Find the latest month with data
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

    for (let i = MONTHS.length - 1; i >= 0; i--) {
        const month = MONTHS[i];
        const value = indicator[month];

        if (isValidData(value)) {
            if (currentValue === null) {
                currentValue = extractNumericValue(value);
                currentRawValue = value;
            } else if (previousValue === null) {
                previousValue = extractNumericValue(value);
                break;
            }
        }
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

function calculateAllMonthlyChanges(indicator, MONTHS) {
    const changes = [];

    for (let i = 1; i < MONTHS.length; i++) {
        const currentMonth = MONTHS[i];
        const previousMonth = MONTHS[i - 1];

        const currentValue = extractNumericValue(indicator[currentMonth]);
        const previousValue = extractNumericValue(indicator[previousMonth]);

        if (currentValue !== null && previousValue !== null) {
            const change = currentValue - previousValue;
            const formattedChange = formatCompactNumber(change);

            changes.push({
                month: currentMonth,
                change: change,
                formatted: formattedChange
            });
        }
    }

    return changes;
}
