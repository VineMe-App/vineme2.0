# Manrope Font Setup Guide

This guide explains how to implement the Manrope font family throughout your VineMe app.

## 🎯 What's Been Set Up

The following components have been configured to use the Manrope font:

### 1. **Typography Tokens** (`src/theme/tokens/typography.ts`)
- Updated font family definitions to use Manrope variants
- Regular (400), Medium (500), SemiBold (600), Bold (700)

### 2. **Font Loading System** ✅ **COMPLETED**
- Integrated font loading directly into `src/app/_layout.tsx`
- Uses Expo's built-in `Font.loadAsync()` for clean, standard font loading
- No wrapper components needed!

### 3. **App Configuration** (`app.config.ts`)
- Added font files to asset bundle patterns
- Configured to include `assets/fonts/*.ttf`

### 4. **Font Example Component**
- Created `FontExample` component to demonstrate font usage
- Shows all font weights and sizes

## 📁 Required Font Files

You need to add these Manrope font files to `assets/fonts/`:

```
assets/fonts/
├── Manrope-Regular.ttf    (400 - Regular)
├── Manrope-Medium.ttf     (500 - Medium)
├── Manrope-SemiBold.ttf   (600 - SemiBold)
└── Manrope-Bold.ttf       (700 - Bold)
```

## 🚀 Implementation Steps

### Step 1: Download Font Files ✅ **COMPLETED**
1. Visit [Google Fonts - Manrope](https://fonts.google.com/specimen/Manrope)
2. Download the font family
3. Extract the TTF files

### Step 2: Add Font Files ✅ **COMPLETED**
1. Copy the TTF files to `assets/fonts/`
2. Ensure filenames match exactly (case-sensitive)

### Step 3: Font Loading ✅ **COMPLETED**
Font loading is already integrated into your `_layout.tsx` using Expo's standard approach:

```tsx
// This is already done in your _layout.tsx
useEffect(() => {
  async function loadFonts() {
    try {
      await Font.loadAsync({
        'Manrope-Regular': require('../assets/fonts/Manrope-Regular.ttf'),
        'Manrope-Medium': require('../assets/fonts/Manrope-Medium.ttf'),
        'Manrope-SemiBold': require('../assets/fonts/Manrope-SemiBold.ttf'),
        'Manrope-Bold': require('../assets/fonts/Manrope-Bold.ttf'),
      });
      setFontsLoaded(true);
    } catch (error) {
      console.error('Error loading fonts:', error);
      setFontsLoaded(true);
    }
  }

  loadFonts();
}, []);
```

### Step 4: Test Font Loading
1. Clear Metro cache: `npx expo start --clear`
2. Restart the app
3. Check that fonts are loading correctly

## 🎨 Font Usage

### In Theme System
```tsx
import { useTheme } from '../theme/provider/useTheme';

const { theme } = useTheme();

// Use font families
<Text style={{ fontFamily: theme.typography.fontFamily.regular }}>
  Regular text
</Text>

<Text style={{ fontFamily: theme.typography.fontFamily.bold }}>
  Bold text
</Text>
```

### In StyleSheet
```tsx
const styles = StyleSheet.create({
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 24,
  },
  body: {
    fontFamily: 'Manrope-Regular',
    fontSize: 16,
  },
});
```

### Typography Variants
```tsx
// Use predefined typography variants
<Text style={theme.typography.typographyVariants.h1}>
  Heading 1
</Text>

<Text style={theme.typography.typographyVariants.body}>
  Body text
</Text>
```

## 🔧 Troubleshooting

### Fonts Not Loading
1. Check file paths and names are correct
2. Clear Metro cache: `npx expo start --clear`
3. Verify font files are valid TTF format
4. Check console for font loading errors

### Font Fallbacks
If Manrope fails to load, the app will fall back to system fonts. The font loading is handled gracefully in your `_layout.tsx`.

### Performance
- Fonts are loaded once when the app starts
- Subsequent app launches will use cached fonts
- Font loading is optimized with Expo's font system

## 📱 Platform Considerations

### iOS
- Fonts are automatically included in the app bundle
- No additional configuration needed

### Android
- Fonts are automatically included in the app bundle
- No additional configuration needed

### Web
- Fonts are loaded via CSS @font-face
- Automatic fallback to system fonts

## 🎯 Current Status

✅ **Font files added to assets/fonts/**
✅ **Typography tokens updated**
✅ **Font loading integrated into _layout.tsx**
✅ **App configuration updated**

**Your Manrope font setup is complete!** The fonts will now be used throughout your app automatically.

## 📚 Additional Resources

- [Manrope Font on Google Fonts](https://fonts.google.com/specimen/Manrope)
- [Expo Font Documentation](https://docs.expo.dev/versions/latest/sdk/font/)
- [React Native Typography Best Practices](https://reactnative.dev/docs/text#style)

---

**Note**: The font loading is now handled cleanly in your `_layout.tsx` using Expo's standard approach. No wrapper components needed - this is the recommended way to handle fonts in Expo apps!
