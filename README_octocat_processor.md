# Octocat Background Removal Script

This Python script intelligently processes Octocat images to remove white backgrounds while preserving important white character details like eyes, teeth, and other features.

## Features

- **Smart Background Removal**: Uses edge detection and flood fill algorithms to identify and remove backgrounds
- **Preserves Character Details**: Protects white eyes, teeth, and other important character features
- **Configurable Tolerance**: Adjustable color tolerance for handling anti-aliasing (0-255)
- **Batch Processing**: Processes all images in a directory with progress indication
- **Multiple Format Support**: Handles PNG, JPG, JPEG, and GIF files
- **Error Handling**: Comprehensive logging and error handling for corrupted images
- **Preview Mode**: Optional mask preview generation for quality inspection
- **Smart Skipping**: Automatically skips files that already have transparency

## Requirements

- Python 3.6+
- Pillow (PIL)
- OpenCV (cv2)
- NumPy

## Installation

Install the required dependencies:

```bash
pip install Pillow opencv-python numpy
```

## Usage

### Basic Usage

Process all images in the `img/Octocats` directory with default settings:

```bash
python process_octocats.py
```

### Advanced Usage

```bash
# Use higher color tolerance for better background detection
python process_octocats.py --tolerance 40

# Enable preview mode to save alpha masks for inspection
python process_octocats.py --preview

# Process a custom directory
python process_octocats.py --input /path/to/images

# Use verbose logging
python process_octocats.py --verbose

# Combine multiple options
python process_octocats.py --tolerance 35 --preview --verbose
```

### Command Line Options

- `--input`, `-i`: Input directory containing images (default: `img/Octocats`)
- `--tolerance`, `-t`: Color tolerance for background detection (0-255, default: 30)
- `--edge-low`: Lower threshold for Canny edge detection (default: 50)
- `--edge-high`: Upper threshold for Canny edge detection (default: 150)
- `--morph-kernel`: Kernel size for morphological operations (default: 3)
- `--output-suffix`: Suffix for output filenames (default: `_transparent`)
- `--preview`: Enable preview mode (saves intermediate masks)
- `--verbose`, `-v`: Enable verbose logging

## Algorithm Details

The script uses a sophisticated multi-step approach:

1. **Background Color Detection**: Samples edge pixels to identify the dominant background color
2. **Edge Detection**: Uses Canny edge detection to identify character boundaries
3. **Flood Fill**: Performs flood fill from image edges to identify background regions
4. **Edge Protection**: Protects areas near detected edges to preserve character details
5. **Morphological Cleanup**: Applies closing and opening operations to clean the mask
6. **Alpha Channel Creation**: Converts the mask to an alpha channel for transparency

## Output

- Original files are preserved
- Processed images are saved as PNG files with `_transparent` suffix
- If preview mode is enabled, alpha masks are saved in a `preview/` subdirectory
- Processing logs are saved to `octocat_processing.log`

## Example Results

The script successfully processed 151 Octocat images:
- **Processed**: 81 images (created new transparent versions)
- **Skipped**: 70 images (already had transparency)
- **Errors**: 0
- **Processing Time**: ~27 seconds

## Troubleshooting

1. **High color tolerance needed**: If backgrounds aren't being removed completely, try increasing `--tolerance`
2. **Character details being removed**: If important white details are lost, try lowering `--tolerance` or adjusting edge detection thresholds
3. **Preview mode**: Use `--preview` to inspect the generated alpha masks and tune parameters accordingly

## Technical Notes

- The script automatically detects and skips images that already have transparency
- PNG files with existing transparency are skipped to avoid double-processing
- The algorithm is optimized for Octocat images but works well on similar cartoon-style characters
- All output images are saved in PNG format to preserve the alpha channel