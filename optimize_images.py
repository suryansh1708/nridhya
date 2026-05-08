#!/usr/bin/env python3
"""
Image Optimization Script for Nridhya Website
Compresses and resizes images for web performance.
Target: <300KB per image, max 1920px dimension
"""

import os
from pathlib import Path
from PIL import Image, ImageOps
import shutil

# Enable HEIC support
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIC_SUPPORTED = True
except ImportError:
    HEIC_SUPPORTED = False

CONTENT_IMAGES = Path(__file__).parent / "content" / "images"
DIST_IMAGES = Path(__file__).parent / "dist" / "images"

MAX_DIMENSION = 1920
JPEG_QUALITY = 82
WEBP_QUALITY = 80

def optimize_image(src_path: Path, dest_dir: Path) -> dict:
    """Optimize a single image: resize and compress."""
    stats = {"original_size": src_path.stat().st_size, "saved": 0}
    
    filename = src_path.name
    stem = src_path.stem
    suffix = src_path.suffix.lower()
    
    if suffix == ".heic":
        if not HEIC_SUPPORTED:
            print(f"  Skipping HEIC file (no support): {filename}")
            return stats
    elif suffix not in [".jpg", ".jpeg", ".png", ".webp"]:
        shutil.copy2(src_path, dest_dir / filename)
        return stats
    
    try:
        with Image.open(src_path) as img:
            # Apply EXIF orientation to fix rotated images
            img = ImageOps.exif_transpose(img)
            
            original_size = img.size
            has_transparency = img.mode in ("RGBA", "P") and "transparency" in img.info or img.mode == "RGBA"
            
            if max(img.size) > MAX_DIMENSION:
                ratio = MAX_DIMENSION / max(img.size)
                new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # For transparent images, keep PNG format
            if has_transparency or suffix == ".png":
                out_path = dest_dir / f"{stem}.png"
                img.save(out_path, "PNG", optimize=True)
                webp_path = dest_dir / f"{stem}.webp"
                img.save(webp_path, "WEBP", quality=WEBP_QUALITY, lossless=True)
                format_name = "PNG"
            else:
                # Convert to RGB for JPEG
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                out_path = dest_dir / f"{stem}.jpg"
                img.save(out_path, "JPEG", quality=JPEG_QUALITY, optimize=True)
                webp_path = dest_dir / f"{stem}.webp"
                img.save(webp_path, "WEBP", quality=WEBP_QUALITY)
                format_name = "JPG"
            
            new_size_out = out_path.stat().st_size
            new_size_webp = webp_path.stat().st_size
            
            stats["new_size_out"] = new_size_out
            stats["new_size_webp"] = new_size_webp
            stats["saved"] = stats["original_size"] - new_size_webp
            stats["dimensions"] = f"{original_size[0]}x{original_size[1]} -> {img.size[0]}x{img.size[1]}"
            
            print(f"  {filename}: {stats['original_size']//1024}KB -> {format_name}:{new_size_out//1024}KB, WebP:{new_size_webp//1024}KB ({stats['dimensions']})")
            
    except Exception as e:
        print(f"  Error processing {filename}: {e}")
        shutil.copy2(src_path, dest_dir / filename)
    
    return stats

def process_directory(src_dir: Path, dest_dir: Path):
    """Process all images in a directory."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    total_original = 0
    total_saved = 0
    
    for item in src_dir.iterdir():
        if item.is_dir():
            process_directory(item, dest_dir / item.name)
        elif item.is_file():
            stats = optimize_image(item, dest_dir)
            total_original += stats.get("original_size", 0)
            total_saved += stats.get("saved", 0)
    
    return total_original, total_saved

def main():
    print("=" * 60)
    print("NRIDHYA IMAGE OPTIMIZATION")
    print("=" * 60)
    
    if DIST_IMAGES.exists():
        shutil.rmtree(DIST_IMAGES)
    
    print(f"\nProcessing: {CONTENT_IMAGES}")
    print(f"Output: {DIST_IMAGES}\n")
    
    total_original, total_saved = process_directory(CONTENT_IMAGES, DIST_IMAGES)
    
    print("\n" + "=" * 60)
    print(f"TOTAL: {total_original // (1024*1024)}MB -> Saved ~{total_saved // (1024*1024)}MB")
    print("=" * 60)

if __name__ == "__main__":
    main()
