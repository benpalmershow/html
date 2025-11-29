# Dark Mode CSS Fixes Applied

## Issue 1: Undefined Dark Mode CSS Variables (body.css)
**Problem:** Dark mode media query referenced undefined CSS variables that caused text color fallbacks to fail

**Files Fixed:** `/css/body.css`

**Changes:**
Added three missing CSS variables to `:root` selector (lines 103-117):
- `--color-dark-text-primary: #e8e6e3` - Primary text color for dark mode
- `--color-dark-accent-primary: #87c5be` - Primary accent color for dark mode
- `--color-dark-accent-secondary: #d4822a` - Secondary accent color for dark mode

These variables are referenced in the dark mode media query but were not defined, causing fallback behavior.

---

## Issue 2: Missing Color Fallbacks in Dark Mode (nav.css)
**Problem:** Hint modal and CTA modal text colors in dark mode lacked fallback values, causing black text on dark backgrounds

**Files Fixed:** `/css/nav.css`

**Changes:**
Added fallback color values to all color properties in the dark mode media query (lines 378-445):

### CTA Modal Dark Mode Fixes (lines 407-417)
- `.cta-button`: Added fallback `#e1e5e9`
- `.cta-text-wrapper span:first-child`: Added fallback `#e8e6e3`
- `.cta-subtext`: Added fallback `#e1e5e9`

### Hint Modal Dark Mode Fixes (lines 419-444)
- `.hint-content`: Added fallbacks `#252b2a` (bg), `#495057` (border)
- `.hint-content h3`: Added fallback `#e8e6e3`
- `.hint-step strong`: Added fallback `#e8e6e3`
- `.hint-step div`: Added fallback `#e1e5e9` ← **Main fix for visitor hints**
- `.hint-close`: Added fallbacks `#d4822a` (bg), `#1a1f1e` (color)
- `.hint-close:hover`: Added fallback `#87c5be`

---

## Impact
These fixes ensure:
1. Text in dark mode is properly visible with correct colors
2. First-time visitor hint text is readable (light color on dark background)
3. CTA and hint modals maintain proper contrast in both light and dark modes
4. Fallback colors provide a safety net if CSS variables fail to load

## Testing Checklist
- [ ] Visit site in dark mode - text should be light/readable
- [ ] Click hints button - visitor hint text should be visible
- [ ] Click CTA button - call-to-action text should be visible
- [ ] Test in light mode - ensure no regression
