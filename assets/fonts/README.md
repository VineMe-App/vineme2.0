# Fonts Directory

This directory contains custom fonts for the VineMe app.

## Figtree Font

The app is configured to use the **Figtree** font family throughout the interface.

### Required Font Files

The following Figtree font files are included in this directory:

- `Figtree-VariableFont_wght.ttf` (Variable font for dynamic weights)
- `Figtree-Italic-VariableFont_wght.ttf` (Variable italic font)
- `Figtree-Regular.ttf` (400 - Regular)
- `Figtree-Medium.ttf` (500 - Medium) 
- `Figtree-SemiBold.ttf` (600 - SemiBold)
- `Figtree-Bold.ttf` (700 - Bold)

### Font Sources

You can download the Figtree font from:
- **Google Fonts**: https://fonts.google.com/specimen/Figtree

### Font Weights Used

The app uses these specific font weights:
- **Regular (400)**: Body text, labels, captions
- **Medium (500)**: Labels, buttons, emphasis
- **SemiBold (600)**: Headings, buttons, strong emphasis
- **Bold (700)**: Main headings, titles

### Variable Fonts

The app uses variable font files (`Figtree-VariableFont_wght.ttf`) which support a wide range of font weights dynamically. Individual weight files are also loaded for specific use cases.

### Note

After adding or updating font files, you may need to:
- Clear the Metro bundler cache: `npx expo start --clear`
- Rebuild the app for the fonts to take effect
