# Dark Mode Text Visibility Issues Report

## Problem Summary
The website has **dark text rendering issues in dark mode** due to undefined CSS variables in the dark mode media query.

## Root Cause
In `/css/body.css`, the dark mode `@media (prefers-color-scheme:dark)` query (line 537-575) references three CSS variables that are **never defined** in the root `:root` selector:

```css
@media (prefers-color-scheme:dark) {
    :root {
        --text-primary: var(--color-dark-text-primary);           /* UNDEFINED */
        --text-secondary: var(--color-dark-text-secondary);       /* DEFINED #e1e5e9 */
        --text-muted: var(--color-dark-text-muted);              /* DEFINED #a0a9b8 */
        --accent-primary: var(--color-dark-accent-primary);       /* UNDEFINED */
        --accent-secondary: var(--color-dark-accent-secondary);   /* UNDEFINED */
        ...
    }
}
```

## Undefined Variables

| Variable | Expected For | Current Status | Solution |
|----------|-------------|----------------|----------|
| `--color-dark-text-primary` | Primary text color in dark mode | NOT DEFINED | Should be light color (e.g., `#e8e6e3`, `#f0f0f0`) |
| `--color-dark-accent-primary` | Primary accent in dark mode | NOT DEFINED | Should be `#87c5be` or similar light teal |
| `--color-dark-accent-secondary` | Secondary accent in dark mode | NOT DEFINED | Should be `#d4822a` or lighter variant |

## Impact
- Text may render as unreadable or invisible in dark mode
- Links and interactive elements using `--accent-primary` won't have proper colors
- Navigation and UI elements may have poor contrast

## Solution
Add the following variable definitions to the `:root` selector in `/css/body.css` (around line 107):

```css
--color-dark-text-primary: #e8e6e3;
/* Light off-white for primary text in dark mode */
--color-dark-accent-primary: #87c5be;
/* Light teal accent for dark mode */
--color-dark-accent-secondary: #d4822a;
/* Orange accent remains consistent */
```

## Files Affected
- `/css/body.css` - Lines 104-110 (add missing dark mode text/accent color variables)

## Related Usage
These variables are also used in:
- `/css/journal-tweets.css` - References `--color-dark-text-secondary` and `--color-dark-text-muted`
