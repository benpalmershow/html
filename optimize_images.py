import json
import os
import requests
from PIL import Image
from io import BytesIO

# Configuration
MEDIA_JSON_PATH = 'json/media.json'
IMAGES_DIR = 'images'
MAX_WIDTH = 480  # For 2x density on ~200px card
SIZES = [240, 360, 480]

def optimize_image(image_path, base_name):
    """Resizes an image to multiple sizes and saves them."""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            srcset = []
            
            for size in SIZES:
                if img.width > size:
                    # Calculate height to maintain aspect ratio
                    ratio = size / img.width
                    height = int(img.height * ratio)
                    
                    resized = img.resize((size, height), Image.Resampling.LANCZOS)
                    
                    new_filename = f"{base_name}-{size}.webp"
                    new_path = os.path.join(IMAGES_DIR, new_filename)
                    
                    resized.save(new_path, 'WEBP', quality=85)
                    srcset.append(f"{IMAGES_DIR}/{new_filename} {size}w")
                    print(f"Created {new_filename}")
                else:
                    # If image is smaller than target size, just save it as is or skip?
                    # For simplicity, we'll skip upscaling
                    pass
            
            # Also save a default optimized version
            default_filename = f"{base_name}.webp"
            default_path = os.path.join(IMAGES_DIR, default_filename)
            
            # Resize to max width if larger
            if img.width > MAX_WIDTH:
                ratio = MAX_WIDTH / img.width
                height = int(img.height * ratio)
                img = img.resize((MAX_WIDTH, height), Image.Resampling.LANCZOS)
            
            img.save(default_path, 'WEBP', quality=85)
            print(f"Created default {default_filename}")
            
            return f"{IMAGES_DIR}/{default_filename}", ", ".join(srcset)

    except Exception as e:
        print(f"Error optimizing {image_path}: {e}")
        return None, None

def download_and_optimize(url, base_name):
    """Downloads an image and optimizes it."""
    try:
        print(f"Downloading {url}...")
        response = requests.get(url)
        response.raise_for_status()
        
        image_data = BytesIO(response.content)
        temp_path = os.path.join(IMAGES_DIR, f"temp_{base_name}.png")
        
        with open(temp_path, 'wb') as f:
            f.write(image_data.getbuffer())
            
        path, srcset = optimize_image(temp_path, base_name)
        
        os.remove(temp_path)
        return path, srcset
        
    except Exception as e:
        print(f"Error downloading/optimizing {url}: {e}")
        return None, None

def main():
    print("Starting image optimization...")
    
    with open(MEDIA_JSON_PATH, 'r') as f:
        media_items = json.load(f)
    
    modified = False
    
    for item in media_items:
        # Handle specific heavy images
        
        # 1. Hardly Strictly Bluegrass
        if "hardlystrictlybluegrass.com" in item.get('cover', ''):
            print("Processing HSB image...")
            new_path, srcset = download_and_optimize(item['cover'], 'hsb-2025')
            if new_path:
                item['cover'] = new_path
                if srcset:
                    item['coverSrcset'] = srcset
                    item['coverSizes'] = '240px'
                modified = True

        # 2. Land Power
        if "land-power.webp" in item.get('cover', ''):
            print("Processing Land Power image...")
            # Assume it's in images/land-power.webp
            local_path = os.path.join(IMAGES_DIR, 'land-power.webp')
            if os.path.exists(local_path):
                new_path, srcset = optimize_image(local_path, 'land-power')
                if new_path and srcset:
                    # item['cover'] is already correct, just adding srcset
                    item['coverSrcset'] = srcset
                    item['coverSizes'] = '240px'
                    modified = True

        # 3. Wikimedia Celera 500L
        if "upload.wikimedia.org" in item.get('cover', '') and "Celera_500L" in item['cover']:
            print("Optimizing Wikimedia URL...")
            item['cover'] = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Celera_500L.jpg/400px-Celera_500L.jpg"
            modified = True

        # 4. Replaceable You (WWNorton)
        if "wwnorton.com" in item.get('cover', ''):
            print("Processing Replaceable You image...")
            new_path, srcset = download_and_optimize(item['cover'], 'replaceable-you')
            if new_path:
                item['cover'] = new_path
                if srcset:
                    item['coverSrcset'] = srcset
                    item['coverSizes'] = '240px'
                modified = True

        # 5. TBPS Podcast Cover (Spotify)
        if "i.scdn.co" in item.get('cover', '') and "ab67656300005f1f43cdff5b4695d3c9cd9400c7" in item['cover']:
            print("Processing TBPS Podcast image...")
            # Check if we already optimized it (it appears multiple times)
            local_path = os.path.join(IMAGES_DIR, 'tbps-cover.webp')
            if os.path.exists(local_path):
                item['cover'] = f"{IMAGES_DIR}/tbps-cover.webp"
                # Re-construct srcset string
                srcset_parts = []
                for size in SIZES:
                    if os.path.exists(os.path.join(IMAGES_DIR, f"tbps-cover-{size}.webp")):
                         srcset_parts.append(f"{IMAGES_DIR}/tbps-cover-{size}.webp {size}w")
                if srcset_parts:
                    item['coverSrcset'] = ", ".join(srcset_parts)
                    item['coverSizes'] = '240px'
                modified = True
            else:
                new_path, srcset = download_and_optimize(item['cover'], 'tbps-cover')
                if new_path:
                    item['cover'] = new_path
                    if srcset:
                        item['coverSrcset'] = srcset
                        item['coverSizes'] = '240px'
                    modified = True
            
    if modified:
        with open(MEDIA_JSON_PATH, 'w') as f:
            json.dump(media_items, f, indent=2)
        print("Updated media.json")
    else:
        print("No changes made to media.json")

if __name__ == "__main__":
    main()
