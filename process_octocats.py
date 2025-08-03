#!/usr/bin/env python3
"""
Octocat Background Removal Script

This script processes all images in the img/Octocats folder to remove white backgrounds
while intelligently preserving white details like eyes and other character features.

Features:
- Smart background removal using edge detection and flood fill
- Preserves white character details (eyes, teeth, etc.)
- Handles color tolerance for anti-aliasing
- Batch processing with progress indication
- Error handling and logging
- Multiple format support (PNG, JPG, JPEG, GIF)
- Configurable parameters

Author: AI Assistant
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from typing import List, Tuple, Optional, Set
import time

import numpy as np
from PIL import Image, ImageFilter
import cv2


class OctocatProcessor:
    """Main class for processing Octocat images to remove backgrounds."""
    
    def __init__(self, 
                 tolerance: int = 30,
                 edge_threshold_low: int = 50,
                 edge_threshold_high: int = 150,
                 morph_kernel_size: int = 3,
                 preview_mode: bool = False):
        """
        Initialize the processor with configurable parameters.
        
        Args:
            tolerance: Color tolerance for background detection (0-255)
            edge_threshold_low: Lower threshold for Canny edge detection
            edge_threshold_high: Upper threshold for Canny edge detection
            morph_kernel_size: Kernel size for morphological operations
            preview_mode: If True, save preview images for inspection
        """
        self.tolerance = tolerance
        self.edge_threshold_low = edge_threshold_low
        self.edge_threshold_high = edge_threshold_high
        self.morph_kernel_size = morph_kernel_size
        self.preview_mode = preview_mode
        
        # Statistics
        self.processed_count = 0
        self.skipped_count = 0
        self.error_count = 0
        
        # Setup logging
        self.setup_logging()
        
    def setup_logging(self):
        """Setup logging configuration."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('octocat_processing.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def is_background_color(self, color: Tuple[int, int, int], 
                           reference_color: Tuple[int, int, int]) -> bool:
        """
        Check if a color is considered background based on tolerance.
        
        Args:
            color: RGB color tuple to check
            reference_color: Reference background color
            
        Returns:
            True if color is within tolerance of reference color
        """
        if len(color) >= 3 and len(reference_color) >= 3:
            # Calculate Euclidean distance in RGB space using numpy for better handling
            c1 = np.array(color[:3], dtype=np.float64)
            c2 = np.array(reference_color[:3], dtype=np.float64)
            distance = np.linalg.norm(c1 - c2)
            return distance <= self.tolerance
        return False
        
    def detect_background_color(self, image: Image.Image) -> Tuple[int, int, int]:
        """
        Detect the background color by sampling edge pixels.
        
        Args:
            image: PIL Image to analyze
            
        Returns:
            RGB tuple of detected background color
        """
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
            
        width, height = image.size
        edge_pixels = []
        
        # Sample pixels from edges
        sample_size = min(20, width // 10)  # Sample up to 20 pixels per edge
        
        # Top and bottom edges
        for i in range(0, width, width // sample_size):
            edge_pixels.append(image.getpixel((i, 0)))  # Top edge
            edge_pixels.append(image.getpixel((i, height - 1)))  # Bottom edge
            
        # Left and right edges
        for i in range(0, height, height // sample_size):
            edge_pixels.append(image.getpixel((0, i)))  # Left edge
            edge_pixels.append(image.getpixel((width - 1, i)))  # Right edge
            
        # Find most common color (mode)
        from collections import Counter
        color_counts = Counter(edge_pixels)
        background_color = color_counts.most_common(1)[0][0]
        
        self.logger.debug(f"Detected background color: {background_color}")
        return background_color
        
    def create_edge_mask(self, image: Image.Image) -> np.ndarray:
        """
        Create an edge mask using Canny edge detection.
        
        Args:
            image: PIL Image to process
            
        Returns:
            Binary mask with edges marked as 255
        """
        # Convert PIL image to numpy array
        img_array = np.array(image.convert('RGB'))
        
        # Convert to grayscale for edge detection
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Detect edges using Canny
        edges = cv2.Canny(blurred, self.edge_threshold_low, self.edge_threshold_high)
        
        # Dilate edges to make them thicker (helps preserve character details)
        kernel = np.ones((3, 3), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=1)
        
        return edges
        
    def flood_fill_background(self, image: Image.Image, 
                            background_color: Tuple[int, int, int]) -> np.ndarray:
        """
        Use flood fill from edges to identify background regions.
        
        Args:
            image: PIL Image to process
            background_color: RGB tuple of background color
            
        Returns:
            Binary mask where background is 255, foreground is 0
        """
        # Convert to numpy array
        img_array = np.array(image.convert('RGB'))
        height, width = img_array.shape[:2]
        
        # Create mask for flood fill
        background_mask = np.zeros((height, width), dtype=np.uint8)
        
        # Flood fill from all edges
        mask = np.zeros((height + 2, width + 2), np.uint8)  # Mask for floodFill
        
        # Define flood fill parameters
        lo_diff = (self.tolerance, self.tolerance, self.tolerance)
        up_diff = (self.tolerance, self.tolerance, self.tolerance)
        flags = cv2.FLOODFILL_MASK_ONLY | (255 << 8)
        
        # Flood fill from corners and edges
        seed_points = []
        
        # Corners
        seed_points.extend([(0, 0), (0, height-1), (width-1, 0), (width-1, height-1)])
        
        # Edge points (every 10 pixels)
        step = max(10, min(width, height) // 20)
        for i in range(0, width, step):
            seed_points.extend([(i, 0), (i, height-1)])
        for i in range(0, height, step):
            seed_points.extend([(0, i), (width-1, i)])
            
        # Perform flood fill from each seed point
        for x, y in seed_points:
            if 0 <= x < width and 0 <= y < height:
                pixel_color = tuple(img_array[y, x])
                if self.is_background_color(pixel_color, background_color):
                    cv2.floodFill(img_array, mask, (x, y), 0, lo_diff, up_diff, flags)
                    
        # Extract the background mask
        background_mask = mask[1:-1, 1:-1]
        
        return background_mask
        
    def refine_mask_with_morphology(self, mask: np.ndarray) -> np.ndarray:
        """
        Clean up the mask using morphological operations.
        
        Args:
            mask: Binary mask to clean up
            
        Returns:
            Cleaned binary mask
        """
        # Create morphological kernel
        kernel = np.ones((self.morph_kernel_size, self.morph_kernel_size), np.uint8)
        
        # Close small holes in the mask
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        # Remove small noise
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        
        # Apply median filter to smooth edges
        mask = cv2.medianBlur(mask, 5)
        
        return mask
        
    def create_transparency_mask(self, image: Image.Image) -> np.ndarray:
        """
        Create a transparency mask for the image.
        
        Args:
            image: PIL Image to process
            
        Returns:
            Alpha channel mask (0 = transparent, 255 = opaque)
        """
        self.logger.debug(f"Processing image: {image.size}, mode: {image.mode}")
        
        # Detect background color
        background_color = self.detect_background_color(image)
        
        # Create edge mask to preserve character boundaries
        edge_mask = self.create_edge_mask(image)
        
        # Create background mask using flood fill
        background_mask = self.flood_fill_background(image, background_color)
        
        # Combine with edge mask to preserve character details
        # Areas near edges should be preserved (made opaque)
        protected_mask = cv2.dilate(edge_mask, np.ones((5, 5), np.uint8), iterations=2)
        
        # Remove background regions that are not near edges
        final_background_mask = background_mask.copy()
        final_background_mask[protected_mask > 0] = 0  # Protect edge areas
        
        # Clean up the mask
        final_background_mask = self.refine_mask_with_morphology(final_background_mask)
        
        # Create alpha mask (invert background mask)
        alpha_mask = 255 - final_background_mask
        
        self.logger.debug(f"Background pixels detected: {np.sum(final_background_mask > 0)}")
        self.logger.debug(f"Foreground pixels preserved: {np.sum(alpha_mask > 0)}")
        
        return alpha_mask
        
    def process_image(self, input_path: Path, output_path: Path) -> bool:
        """
        Process a single image to remove background.
        
        Args:
            input_path: Path to input image
            output_path: Path to save processed image
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.logger.info(f"Processing: {input_path.name}")
            
            # Open and validate image
            with Image.open(input_path) as image:
                # Skip if already has transparency and is PNG
                if (image.mode in ('RGBA', 'LA') or 'transparency' in image.info) and input_path.suffix.lower() == '.png':
                    self.logger.info(f"Skipping {input_path.name} - already has transparency")
                    self.skipped_count += 1
                    return True
                    
                # Convert to RGB for processing
                if image.mode in ('P', 'L'):
                    image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
                elif image.mode not in ('RGB', 'RGBA'):
                    image = image.convert('RGB')
                    
                # Create transparency mask
                alpha_mask = self.create_transparency_mask(image)
                
                # Convert image to RGBA and apply alpha mask
                if image.mode != 'RGBA':
                    image = image.convert('RGBA')
                    
                # Apply the alpha mask
                img_array = np.array(image)
                img_array[:, :, 3] = alpha_mask  # Set alpha channel
                
                # Create final image
                result_image = Image.fromarray(img_array)
                
                # Save as PNG with transparency
                result_image.save(output_path, 'PNG', optimize=True)
                
                # Save preview images if requested
                if self.preview_mode:
                    preview_dir = output_path.parent / 'preview'
                    preview_dir.mkdir(exist_ok=True)
                    
                    # Save alpha mask for inspection
                    mask_preview = Image.fromarray(alpha_mask)
                    mask_preview.save(preview_dir / f"{input_path.stem}_mask.png")
                    
                self.processed_count += 1
                self.logger.info(f"Successfully processed: {input_path.name}")
                return True
                
        except Exception as e:
            self.logger.error(f"Error processing {input_path.name}: {str(e)}")
            self.error_count += 1
            return False
            
    def get_supported_files(self, directory: Path) -> List[Path]:
        """
        Get list of supported image files in directory.
        
        Args:
            directory: Directory to scan
            
        Returns:
            List of supported image file paths
        """
        supported_extensions = {'.png', '.jpg', '.jpeg', '.gif'}
        files = []
        
        for file_path in directory.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
                files.append(file_path)
                
        return sorted(files)
        
    def process_directory(self, input_dir: Path, output_suffix: str = '_transparent') -> None:
        """
        Process all supported images in a directory.
        
        Args:
            input_dir: Directory containing images to process
            output_suffix: Suffix to add to output filenames
        """
        self.logger.info(f"Starting batch processing in: {input_dir}")
        
        # Get all supported files
        image_files = self.get_supported_files(input_dir)
        
        if not image_files:
            self.logger.warning("No supported image files found")
            return
            
        self.logger.info(f"Found {len(image_files)} image files to process")
        
        # Process each file
        start_time = time.time()
        
        for i, input_path in enumerate(image_files, 1):
            # Create output filename
            output_filename = f"{input_path.stem}{output_suffix}.png"
            output_path = input_path.parent / output_filename
            
            # Skip if output already exists
            if output_path.exists():
                self.logger.info(f"Skipping {input_path.name} - output already exists")
                self.skipped_count += 1
                continue
                
            # Show progress
            progress = (i / len(image_files)) * 100
            self.logger.info(f"Progress: {i}/{len(image_files)} ({progress:.1f}%)")
            
            # Process the image
            self.process_image(input_path, output_path)
            
        # Print summary
        elapsed_time = time.time() - start_time
        self.logger.info(f"\nProcessing complete!")
        self.logger.info(f"Total files: {len(image_files)}")
        self.logger.info(f"Processed: {self.processed_count}")
        self.logger.info(f"Skipped: {self.skipped_count}")
        self.logger.info(f"Errors: {self.error_count}")
        self.logger.info(f"Time elapsed: {elapsed_time:.2f} seconds")


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="Process Octocat images to remove white backgrounds while preserving character details",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python process_octocats.py                    # Process with default settings
  python process_octocats.py --tolerance 40     # Use higher color tolerance
  python process_octocats.py --preview          # Enable preview mode
  python process_octocats.py --input custom_dir # Process custom directory
        """
    )
    
    parser.add_argument(
        '--input', '-i',
        type=str,
        default='img/Octocats',
        help='Input directory containing images (default: img/Octocats)'
    )
    
    parser.add_argument(
        '--tolerance', '-t',
        type=int,
        default=30,
        help='Color tolerance for background detection (0-255, default: 30)'
    )
    
    parser.add_argument(
        '--edge-low',
        type=int,
        default=50,
        help='Lower threshold for Canny edge detection (default: 50)'
    )
    
    parser.add_argument(
        '--edge-high',
        type=int,
        default=150,
        help='Upper threshold for Canny edge detection (default: 150)'
    )
    
    parser.add_argument(
        '--morph-kernel',
        type=int,
        default=3,
        help='Kernel size for morphological operations (default: 3)'
    )
    
    parser.add_argument(
        '--output-suffix',
        type=str,
        default='_transparent',
        help='Suffix for output filenames (default: _transparent)'
    )
    
    parser.add_argument(
        '--preview',
        action='store_true',
        help='Enable preview mode (saves intermediate masks for inspection)'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        
    # Validate input directory
    input_dir = Path(args.input)
    if not input_dir.exists():
        print(f"Error: Input directory '{input_dir}' does not exist")
        sys.exit(1)
        
    if not input_dir.is_dir():
        print(f"Error: '{input_dir}' is not a directory")
        sys.exit(1)
        
    # Create processor
    processor = OctocatProcessor(
        tolerance=args.tolerance,
        edge_threshold_low=args.edge_low,
        edge_threshold_high=args.edge_high,
        morph_kernel_size=args.morph_kernel,
        preview_mode=args.preview
    )
    
    # Process directory
    try:
        processor.process_directory(input_dir, args.output_suffix)
    except KeyboardInterrupt:
        print("\nProcessing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()