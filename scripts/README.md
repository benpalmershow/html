# Color Analysis and Backup System

This directory contains tools for analyzing and consolidating colors across CSS files.

## Files

- `color-analysis.js` - Main color analysis script
- `README.md` - This documentation file

## Usage

### Run Color Analysis

```bash
# From project root
npm run analyze-colors

# Or directly
node scripts/color-analysis.js
```

### What it does

1. **Creates Backups**: Copies all CSS files to `css-backup/` directory with timestamp
2. **Extracts Colors**: Finds all color values (hex, rgb, rgba, hsl, hsla, named colors)
3. **Generates Reports**: Creates detailed analysis in `color-analysis-reports/`

### Output Files

- `css-backup/` - Backup copies of original CSS files
- `color-analysis-reports/color-analysis-YYYY-MM-DD.md` - Human-readable report
- `color-analysis-reports/color-analysis-YYYY-MM-DD.json` - Machine-readable data

### Report Contents

The generated report includes:

- **Summary**: Total colors found, files analyzed
- **Colors by Frequency**: Most used colors across all files
- **Colors by File**: Breakdown of colors used in each CSS file
- **Consolidation Groups**: Similar colors that can be merged
- **Recommendations**: Suggested CSS custom properties

### Color Detection

The script detects:

- Hex colors: `#fff`, `#ffffff`, `#f7fafc`
- RGB/RGBA: `rgb(255,255,255)`, `rgba(0,0,0,0.5)`
- HSL/HSLA: `hsl(0,0%,100%)`, `hsla(0,0%,0%,0.5)`
- Named colors: `white`, `black`, `transparent`, etc.

### Safety Features

- **Automatic Backups**: Original files are never modified
- **Timestamped Reports**: Each analysis run creates dated files
- **Error Handling**: Graceful failure with helpful error messages

## Next Steps

After running the analysis:

1. Review the generated report
2. Identify high-frequency colors for consolidation
3. Plan CSS custom property structure
4. Implement color consolidation using the recommendations