# Implementation Plan

- [ ] 1. Create color analysis and backup system
  - Write a script to extract all color values from CSS files
  - Create backup copies of all CSS files before modification
  - Generate a color usage report showing all unique colors and their frequencies
  - _Requirements: 1.1, 1.2_

- [ ] 2. Extend CSS custom properties system
  - [ ] 2.1 Add comprehensive color variables to body.css :root selector
    - Add standardized grayscale variables (--color-gray-100 through --color-gray-800)
    - Add semantic color variables (--color-success, --color-warning, --color-error, --color-info)
    - Add platform-specific color variables (--color-youtube, --color-spotify, etc.)
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 2.2 Organize existing color variables for better consistency
    - Group related colors together in logical sections
    - Add comments to document color usage and purpose
    - Ensure proper fallback values are provided
    - _Requirements: 3.1, 3.3_

- [ ] 3. Consolidate colors in body.css
  - [ ] 3.1 Replace hardcoded white variants with standardized variables
    - Replace #fff and #ffffff with var(--color-white)
    - Replace light gray variants (#f7fafc, #f8fafc) with appropriate gray scale variables
    - Update all white color references to use consistent variables
    - _Requirements: 1.3, 2.1, 3.4_

  - [ ] 3.2 Consolidate gray color variants
    - Replace #666 and similar grays with var(--color-gray-500)
    - Replace #6b7280 and similar muted colors with standardized gray variables
    - Update all gray color references throughout the file
    - _Requirements: 1.3, 2.1, 3.4_

  - [ ]* 3.3 Write validation tests for body.css color consolidation
    - Create tests to verify all color references are valid
    - Test contrast ratios are maintained after consolidation
    - Validate dark mode compatibility
    - _Requirements: 2.1, 2.3_

- [ ] 4. Consolidate colors in news.css
  - [ ] 4.1 Update tooltip and UI element colors
    - Replace hardcoded tooltip colors (#2d3748, #f7fafc) with standardized variables
    - Consolidate border colors (#4a90e2, #2b6cb0) with semantic color variables
    - Update category badge colors while preserving distinct visual identity
    - _Requirements: 1.3, 2.2, 2.4_

  - [ ] 4.2 Preserve platform-specific and category colors
    - Maintain distinct colors for IPO (#1e88e5), earnings (#43a047), policy (#fbc02d) badges
    - Ensure healthcare (#10b981), legal (#2c5f5a), corrections (#e53935) colors remain distinct
    - Convert to CSS variables while preserving visual distinction
    - _Requirements: 2.2, 2.4_

  - [ ]* 4.3 Create visual regression tests for news.css
    - Test category badge color distinctiveness
    - Verify tooltip readability and contrast
    - Validate filter button styling consistency
    - _Requirements: 2.1, 2.2_

- [ ] 5. Consolidate colors in financials.css
  - [ ] 5.1 Update chart and overlay colors
    - Replace hardcoded overlay backgrounds with standardized variables
    - Consolidate border colors (#e5e7eb, #d0d0d0) with consistent gray variables
    - Update chart modal colors for consistency
    - _Requirements: 1.3, 2.1, 3.4_

  - [ ] 5.2 Standardize indicator and change colors
    - Consolidate positive/negative change indicator backgrounds (rgba values)
    - Update filter button colors to use standardized variables
    - Maintain semantic meaning of green/red for positive/negative changes
    - _Requirements: 1.3, 2.1, 2.3_

- [ ] 6. Consolidate colors in media.css
  - [ ] 6.1 Update media card and overlay colors
    - Replace hardcoded shadow colors with standardized rgba variables
    - Consolidate overlay gradient colors for consistency
    - Update rating logo and platform link colors
    - _Requirements: 1.3, 2.4, 3.4_

  - [ ] 6.2 Preserve platform branding while consolidating
    - Maintain YouTube red (#FF0000), Spotify green colors for platform links
    - Convert platform colors to CSS variables for easier maintenance
    - Ensure hover and focus states use consistent color patterns
    - _Requirements: 2.4, 3.4_

- [ ] 7. Consolidate colors in remaining CSS files
  - [ ] 7.1 Update dark-mode.css color references
    - Replace hardcoded rgba values with standardized variables
    - Ensure dark theme colors work with consolidated color system
    - Update theme toggle styling for consistency
    - _Requirements: 2.1, 3.4_

  - [ ] 7.2 Update read.css and chart-modal.css
    - Consolidate post item shadow and background colors
    - Update modal overlay and background colors
    - Replace hardcoded rgba values with standardized variables
    - _Requirements: 1.3, 3.4_

- [ ] 8. Cleanup and optimization
  - [ ] 8.1 Remove duplicate and unused color definitions
    - Identify and remove color values that are no longer referenced
    - Consolidate duplicate CSS custom property definitions
    - Clean up redundant color declarations
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 8.2 Validate final color system
    - Verify all color references point to valid CSS variables
    - Ensure no hardcoded colors remain except for platform-specific branding
    - Test accessibility compliance with consolidated colors
    - _Requirements: 2.3, 4.4_

  - [ ]* 8.3 Generate final color usage report
    - Create documentation of the new color system
    - Generate before/after comparison of color usage
    - Document any preserved platform-specific colors and their usage
    - _Requirements: 3.2, 4.4_