# Image Optimization

To further optimize the images on your site, specifically the heavy local images and the "Hardly Strictly Bluegrass" header, please run the provided Python script.

## Requirements

- Python 3
- Pillow (Python Imaging Library)

## Installation

You can install the required dependencies using the generated `requirements.txt` file:

```bash
pip install -r requirements.txt
```

## Usage

Run the optimization script:

```bash
python3 optimize_images.py
```

This script will:
1. Download the large "Hardly Strictly Bluegrass" image, resize it, and save it locally as a WebP file.
2. Resize `images/land-power.webp` to create responsive sizes (srcset).
3. Download and optimize the "Replaceable You" book cover (WW Norton).
4. Download and optimize the "The Ben Palmer Show" podcast cover (Spotify), applying it to all instances.
5. Update `json/media.json` to point to these new optimized images.
