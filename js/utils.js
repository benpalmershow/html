// Utility functions for formatting and data manipulation

const DEFAULT_MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// Helper: Check if a value contains valid data
function isValidData(value) {
    return value && value !== '' && !value.startsWith('TBD');
}

// Helper: Format Y-axis tick values with K/M/B suffix
function formatYAxisTick(value) {
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toLocaleString();
}

function formatDate(dateString, formatType = 'full') {
    let date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [y, m, d] = dateString.split('-').map(Number);
        date = new Date(y, m - 1, d);
    } else {
        date = new Date(dateString);
    }
    if (formatType === 'short') {
        return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    } else {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}

function formatChangeIndicator(percentChange) {
    if (percentChange === null || percentChange === undefined || Math.abs(percentChange) < 0.05) {
        return { formatted: '—', cssClass: 'change-neutral', direction: 0 };
    }
    const formatted = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`;
    const isPositive = percentChange > 0;
    return {
        formatted,
        cssClass: isPositive ? 'change-positive' : 'change-negative',
        direction: isPositive ? 1 : -1
    };
}

function extractNumericValue(value) {
    if (!value || value === '' || value.startsWith('TBD') || value === '—') return null;
    let cleanValue = value.toString().replace(/\$/g, '').replace(/^\+/g, '').replace(/[A-Za-z]/g, '').trim().replace(/,/g, '');
    const num = parseFloat(cleanValue);
    return isNaN(num) ? null : num;
}

function formatCompactNumber(num) {
    if (num === null || num === undefined) return '—';
    const absNum = Math.abs(num);
    if (absNum >= 1000000000) return (num >= 0 ? '+' : '') + (absNum / 1000000000).toFixed(1) + 'B';
    if (absNum >= 1000000) return (num >= 0 ? '+' : '') + (absNum / 1000000).toFixed(1) + 'M';
    if (absNum >= 1000) {
        const kValue = num / 1000;
        if (absNum < 100000) return (num >= 0 ? '+' : '') + kValue.toFixed(1).replace(/\.0$/, '') + 'K';
        return (num >= 0 ? '+' : '') + Math.round(kValue) + 'K';
    }
    return (num >= 0 ? '+' : '') + num.toFixed(2).replace('.00', '');
}

// Returns sorted year keys (newest first) for year-nested indicator data
function getYearKeys(indicator) {
    return Object.keys(indicator)
        .filter(key => /^\d{4}$/.test(key))
        .map(key => parseInt(key, 10))
        .sort((a, b) => b - a);
}

// Calculate days since approximate release date
function calcDaysOld(year, monthIndex, releaseDay) {
    const releaseDate = new Date(year, monthIndex, releaseDay);
    const daysOld = Math.floor((Date.now() - releaseDate) / (1000 * 60 * 60 * 24));
    return daysOld >= 0 ? daysOld : 9999;
}

// Get latest data point from indicator (handles year-nested and flat)
function getLatestDataPoint(indicator, MONTHS = DEFAULT_MONTHS) {
    const yearKeys = getYearKeys(indicator);
    const releaseDay = indicator.releaseDay && indicator.releaseDay > 0 ? indicator.releaseDay : 15;

    for (const year of yearKeys) {
        for (let i = MONTHS.length - 1; i >= 0; i--) {
            const month = MONTHS[i];
            const value = indicator[year]?.[month];
            if (isValidData(value)) {
                return { value, numeric: extractNumericValue(value), year, month, monthIndex: i, daysOld: calcDaysOld(year, i, releaseDay) };
            }
        }
    }
    // Flat fallback
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    for (let i = MONTHS.length - 1; i >= 0; i--) {
        const month = MONTHS[i];
        const value = indicator[month];
        if (isValidData(value)) {
            const dataYear = i > currentMonth ? currentYear - 1 : currentYear;
            return { value, numeric: extractNumericValue(value), year: dataYear, month, monthIndex: i, daysOld: calcDaysOld(dataYear, i, releaseDay) };
        }
    }
    return null;
}

function calculatePercentChange(currentValue, previousValue) {
    if (previousValue === 0) return null;
    const numberChange = currentValue - previousValue;
    const denominator = previousValue < 0 ? Math.abs(previousValue) : previousValue;
    return { percentChange: (numberChange / denominator) * 100, numberChange };
}

function calculateMoMChange(indicator, MONTHS = DEFAULT_MONTHS) {
    const yearKeys = getYearKeys(indicator);
    const allDataPoints = [];
    const coveredFlatMonths = new Set();

    for (const year of yearKeys) {
        for (let i = MONTHS.length - 1; i >= 0; i--) {
            const month = MONTHS[i];
            const value = indicator[year]?.[month];
            if (isValidData(value)) coveredFlatMonths.add(month);
        }
    }

    for (const year of yearKeys) {
        for (let i = MONTHS.length - 1; i >= 0; i--) {
            const month = MONTHS[i];
            const value = indicator[year]?.[month];
            if (isValidData(value)) allDataPoints.push({ value, numeric: extractNumericValue(value), year, monthIndex: i });
        }
    }

    for (let i = MONTHS.length - 1; i >= 0; i--) {
        const month = MONTHS[i];
        if (coveredFlatMonths.has(month)) continue;
        const value = indicator[month];
        if (isValidData(value)) allDataPoints.push({ value, numeric: extractNumericValue(value), year: null, monthIndex: i });
    }

    if (allDataPoints.length < 2) return null;
    const currentValue = allDataPoints[0].numeric;
    const previousValue = allDataPoints[1].numeric;
    if (currentValue === null || previousValue === null || previousValue === 0) return null;

    const { percentChange, numberChange } = calculatePercentChange(currentValue, previousValue);
    return { percentChange, numberChange, currentRawValue: allDataPoints[0].value };
}

function calculateYoYChange(indicator, MONTHS = DEFAULT_MONTHS) {
    const yearKeys = getYearKeys(indicator);
    let totalValidPoints = 0;
    for (const month of MONTHS) if (isValidData(indicator[month]) && extractNumericValue(indicator[month]) !== null) totalValidPoints++;
    for (const year of yearKeys) for (const month of MONTHS) { const value = indicator[year]?.[month]; if (isValidData(value) && extractNumericValue(value) !== null) totalValidPoints++; }
    if (totalValidPoints < 12) return null;

    const latest = getLatestDataPoint(indicator, MONTHS);
    if (!latest) return null;

    const previousYearData = indicator[latest.year - 1];
    const yearBackValue = (previousYearData && previousYearData[latest.month] !== undefined) ? previousYearData[latest.month] : indicator[latest.month];
    const yearBackNumeric = extractNumericValue(yearBackValue);
    if (!isValidData(yearBackValue) || yearBackNumeric === null || yearBackNumeric === 0) return null;

    const changeResult = calculatePercentChange(latest.numeric, yearBackNumeric);
    return changeResult ? { percentChange: changeResult.percentChange, numberChange: changeResult.numberChange, currentRawValue: latest.value } : null;
}

function calculateAllMonthlyChanges(indicator, MONTHS = DEFAULT_MONTHS) {
    const changes = [];
    const seen = new Set();
    const yearKeys = getYearKeys(indicator).sort((a, b) => a - b);

    const nestedMonths = new Set();
    for (const year of yearKeys) for (let i = 0; i < MONTHS.length; i++) {
        const month = MONTHS[i];
        const value = indicator[year]?.[month];
        if (isValidData(value) && extractNumericValue(value) !== null) nestedMonths.add(`${year}-${month}`);
    }
    const nestedMonthNames = new Set([...nestedMonths].map(k => k.split('-')[1]));

    const allValues = [];
    for (let i = 0; i < MONTHS.length; i++) {
        const month = MONTHS[i];
        if (nestedMonthNames.has(month)) continue;
        const value = extractNumericValue(indicator[month]);
        if (value !== null && !seen.has(`flat-${month}`)) { seen.add(`flat-${month}`); allValues.push({ value, month, year: null, monthIndex: i }); }
    }
    for (const year of yearKeys) for (let i = 0; i < MONTHS.length; i++) {
        const month = MONTHS[i], key = `${year}-${month}`;
        if (!nestedMonths.has(key)) continue;
        const value = extractNumericValue(indicator[year]?.[month]);
        if (value !== null && !seen.has(key)) { seen.add(key); allValues.push({ value, month, year, monthIndex: i }); }
    }

    for (let i = 1; i < allValues.length; i++) {
        const change = allValues[i].value - allValues[i - 1].value;
        changes.push({ month: allValues[i].month, change, formatted: formatCompactNumber(change) });
    }
    return changes;
}

// Export to global scope for use in other modules
window.DataUtils = {
    getLatestMonthForIndicator: (indicator, MONTHS) => {
        const dp = getLatestDataPoint(indicator, MONTHS);
        return dp ? { monthIndex: dp.monthIndex, monthName: dp.month, daysOld: dp.daysOld } : { monthIndex: -1, monthName: 'none', daysOld: 99999 };
    },
    calculateMoMChange,
    calculateYoYChange,
    calculateAllMonthlyChanges,
    DEFAULT_MONTHS,
    TEAM_COLORS: {
        'ARI': '#97233F', 'ATL': '#A71930', 'BAL': '#241773', 'BUF': '#00338D',
        'CAR': '#0085CA', 'CHI': '#0B162A', 'CIN': '#FB4F14', 'CLE': '#311D00',
        'DAL': '#003594', 'DEN': '#FB4F14', 'DET': '#0076B6', 'GB': '#203731',
        'HOU': '#03202F', 'IND': '#002C5F', 'JAX': '#006778', 'KC': '#E31837',
        'LAC': '#0080C6', 'LAR': '#003594', 'LA': '#003594', 'LV': '#000000', 'MIA': '#008E97',
        'MIN': '#4F2683', 'NE': '#002244', 'NO': '#D3BC8D', 'NYG': '#0B2265',
        'NYJ': '#125740', 'PHI': '#004C54', 'PIT': '#FFB612', 'SEA': '#002244',
        'SF': '#AA0000', 'TB': '#D50A0A', 'TEN': '#4B925E', 'WAS': '#5A1414'
    }
};