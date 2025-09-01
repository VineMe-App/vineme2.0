# Fonts Directory

This directory contains custom fonts for the VineMe app.

## Manrope Font

The app is configured to use the **Manrope** font family throughout the interface.

### Required Font Files

To complete the font setup, you need to add the following Manrope font files to this directory:

- `Manrope-Regular.ttf` (400 - Regular)
- `Manrope-Medium.ttf` (500 - Medium) 
- `Manrope-SemiBold.ttf` (600 - SemiBold)
- `Manrope-Bold.ttf` (700 - Bold)

### Font Sources

You can download the Manrope font from:
- **Google Fonts**: https://fonts.google.com/specimen/Manrope
- **Official Repository**: https://github.com/microsoft/Manrope

### Installation Steps

1. Download the Manrope font files (TTF format)
2. Place them in this `assets/fonts/` directory
3. Ensure the filenames match exactly as listed above
4. Rebuild the app to include the fonts

### Font Weights Used

The app uses these specific font weights:
- **Regular (400)**: Body text, labels, captions
- **Medium (500)**: Labels, buttons, emphasis
- **SemiBold (600)**: Headings, buttons, strong emphasis
- **Bold (700)**: Main headings, titles

### Note

After adding the font files, you may need to:
- Clear the Metro bundler cache: `npx expo start --clear`
- Rebuild the app for the fonts to take effect
