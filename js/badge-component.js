// Reusable badge/button component for displaying economic indicators

// CSS class constants
const CHANGE_CLASSES = {
    POSITIVE: 'change-positive',
    NEGATIVE: 'change-negative',
    NEUTRAL: 'change-neutral'
};

const ICON_NAMES = {
    UP: 'arrow-up-right',
    DOWN: 'arrow-down-right',
    NEUTRAL: 'minus'
};

/**
 * Determines direction and CSS class for a percentage change value
 * @param {number} percentChange - The percentage change value
 * @returns {number} 1 for positive, -1 for negative, 0 for neutral
 */
function getChangeDirection(percentChange) {
    if (percentChange > 0) return 1;
    if (percentChange < 0) return -1;
    return 0;
}

/**
 * Gets the appropriate CSS class for a change value
 * @param {number} percentChange - The percentage change value
 * @returns {string} CSS class name
 */
function getChangeCssClass(percentChange) {
    const direction = getChangeDirection(percentChange);
    if (direction > 0) return CHANGE_CLASSES.POSITIVE;
    if (direction < 0) return CHANGE_CLASSES.NEGATIVE;
    return CHANGE_CLASSES.NEUTRAL;
}

/**
 * Formats a percentage change value with sign and fixed decimals
 * @param {number} percentChange - The percentage change value
 * @returns {string} Formatted string like "+1.23%" or "-4.56%"
 */
function formatPercentage(percentChange) {
    const sign = percentChange >= 0 ? '+' : '';
    return `${sign}${percentChange.toFixed(2)}%`;
}

/**
 * Creates a structured change indicator object
 * @param {number} percentChange - The percentage change value
 * @returns {Object} Object with change, direction, cssClass, and formatted properties
 * @throws {TypeError} If percentChange is not a number
 */
function formatChangeIndicator(percentChange) {
    if (typeof percentChange !== 'number' || isNaN(percentChange)) {
        throw new TypeError(`Expected number, got ${typeof percentChange}`);
    }

    return {
        change: percentChange,
        direction: getChangeDirection(percentChange),
        cssClass: getChangeCssClass(percentChange),
        formatted: formatPercentage(percentChange)
    };
}

/**
 * Gets the icon name based on change direction
 * @param {number} direction - Change direction (1, -1, or 0)
 * @returns {string} Icon name
 */
function getIconName(direction) {
    if (direction > 0) return ICON_NAMES.UP;
    if (direction < 0) return ICON_NAMES.DOWN;
    return ICON_NAMES.NEUTRAL;
}

/**
 * Creates an inline badge HTML element
 * @param {Object} changeInfo - Change indicator object with cssClass and formatted properties
 * @returns {string} HTML string for inline badge
 */
function createInlineBadge(changeInfo) {
    return `<span class="mom-badge ${changeInfo.cssClass}">${changeInfo.formatted}</span>`;
}

/**
 * Creates a button-style badge with icon
 * @param {string} value - The metric name/label
 * @param {Object} changeInfo - Change indicator object
 * @returns {string} HTML string for button badge
 */
function createButtonBadge(value, changeInfo) {
    const iconName = getIconName(changeInfo.direction);

    return `
            <div class="change-metric-block">
                <button
                    type="button"
                    class="change-metric-btn ${changeInfo.cssClass}"
                    aria-label="${changeInfo.formatted}"
                >
                    <span class="change-metric-top">
                        <span class="change-metric-title">${value}</span>
                        <span class="change-metric-title-icon ${changeInfo.cssClass}"><i data-lucide="${iconName}"></i></span>
                    </span>
                    <span class="change-metric-main">
                        <span class="change-metric-value">${changeInfo.formatted}</span>
                    </span>
                </button>
            </div>
        `;
}

/**
 * Creates badge HTML for displaying economic indicator changes
 * @param {string} value - The metric name/label
 * @param {number|Object} changePercentage - Percentage change or changeInfo object
 * @param {string} type - Badge type: 'inline' or 'button' (default: 'inline')
 * @returns {string} HTML string
 * @throws {Error} If type is invalid
 */
function createBadgeHtml(value, changePercentage, type = 'inline') {
    const changeInfo = typeof changePercentage === 'number'
        ? formatChangeIndicator(changePercentage)
        : changePercentage;

    if (type === 'inline') {
        return createInlineBadge(changeInfo);
    }

    if (type === 'button') {
        return createButtonBadge(value, changeInfo);
    }

    throw new Error(`Invalid badge type: ${type}. Expected 'inline' or 'button'.`);
}

// Badge CSS that can be injected into any page
const BADGE_STYLES = `
.mom-badge {
  border: 1px solid rgba(0, 0, 0, 0.16);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.03));
  color: var(--text-primary);
  padding: 2px 6px 1px 5px;
  display: inline-block;
  white-space: nowrap;
  font-size: 0.78rem;
  font-weight: 700;
  margin-left: 6px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), inset 0 -1px 0 rgba(0, 0, 0, 0.14), 0 1px 2px rgba(0, 0, 0, 0.16), 0 3px 8px rgba(0, 0, 0, 0.1);
}

.mom-badge.change-positive {
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.24), rgba(16, 185, 129, 0.09));
  border-color: rgba(16, 185, 129, 0.5);
}

.mom-badge.change-negative {
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.24), rgba(239, 68, 68, 0.09));
  border-color: rgba(239, 68, 68, 0.55);
}

.mom-badge.change-neutral {
  background: linear-gradient(180deg, rgba(107, 114, 128, 0.24), rgba(107, 114, 128, 0.09));
  border-color: rgba(107, 114, 128, 0.5);
}
`;

// Template pattern for {{badge:value|percentage}} syntax
const BADGE_TEMPLATE_PATTERN = /\{\{badge:([^|]+)\|([+-]?\d+(?:\.\d+)?%?)\}\}/g;

/**
 * Replaces badge template placeholders with HTML
 * Template format: {{badge:Label|+5.25}} or {{badge:Indicator|-2.1}}
 * @param {string} html - HTML string potentially containing badge templates
 * @returns {string} HTML with templates replaced by badge HTML
 */
function replaceBadgeTemplates(html) {
    if (typeof html !== 'string') {
        console.warn('replaceBadgeTemplates: input must be a string');
        return html;
    }

    return html.replace(BADGE_TEMPLATE_PATTERN, (match, value, change) => {
        const percentage = parseFloat(change);

        if (isNaN(percentage)) {
            console.warn(`replaceBadgeTemplates: unable to parse percentage from "${change}"`);
            return match; // Return original if parsing fails
        }

        try {
            return createBadgeHtml(value.trim(), percentage, 'inline');
        } catch (error) {
            console.error(`replaceBadgeTemplates: error processing badge template: ${error.message}`);
            return match;
        }
    });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatChangeIndicator,
        createBadgeHtml,
        createInlineBadge,
        createButtonBadge,
        getChangeDirection,
        getChangeCssClass,
        getIconName,
        formatPercentage,
        BADGE_STYLES,
        replaceBadgeTemplates,
        CHANGE_CLASSES,
        ICON_NAMES
    };
}
