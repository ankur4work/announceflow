# AnnounceFlow Theme Compatibility Guide

This document outlines theme compatibility testing results and known issues with various Shopify themes.

## Tested Themes

### 1. Dawn (Shopify Default Theme) - REFERENCE

**Status:** Fully Compatible

**Test Results:**
| Feature | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Visibility | Pass | Pass | Bar appears correctly |
| Position (Top) | Pass | Pass | No overlap with header |
| Position (Bottom) | Pass | Pass | No overlap with footer |
| Sticky Mode | Pass | Pass | Works with sticky header |
| Colors | Pass | Pass | CSS variables apply correctly |
| Fonts | Pass | Pass | System font stack renders properly |
| Dismiss Button | Pass | Pass | Smooth animation |
| CTA Links/Buttons | Pass | Pass | All states work |
| Countdown Timer | Pass | Pass | Updates in real-time |
| Email Form | Pass | Pass | Submit works correctly |
| Cookie Consent | Pass | Pass | Accept/Decline functional |
| Free Shipping | Pass | Pass | Cart integration works |
| Mobile Layout | Pass | N/A | Responsive breakpoints work |
| Touch Targets | N/A | Pass | 44px minimum met |
| Horizontal Scroll | N/A | Pass | No overflow issues |

**Known Considerations:**
- Dawn's sticky header uses `position: sticky` with high z-index
- Our bar uses `z-index: 9999` which stacks above Dawn's header
- Announcement bar at top position works well with Dawn's header structure

---

### 2. Refresh Theme

**Status:** Compatible with Minor Considerations

**Test Results:**
| Feature | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Visibility | Pass | Pass | |
| Position (Top) | Pass | Pass | May need z-index check |
| Position (Bottom) | Pass | Pass | |
| Sticky Mode | Pass* | Pass* | See notes |
| Colors | Pass | Pass | |
| Fonts | Pass | Pass | |
| All Bar Types | Pass | Pass | |

**Known Issues:**
1. **Sticky Header Interaction**: Refresh uses a different header structure with drawer navigation
   - Fix: Our z-index of 9999 handles this correctly

2. **Modal Overlays**: Theme modals may appear behind our bar
   - Fix: Theme modals should have z-index > 9999 (handled by theme)

**Theme-Specific CSS Applied:**
```css
/* Refresh theme - Ensure bar stays above header */
.shopify-section--header ~ .announceflow-bar--sticky.announceflow-bar--top {
  z-index: 10000;
}
```

---

### 3. Craft Theme

**Status:** Compatible

**Test Results:**
| Feature | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Visibility | Pass | Pass | |
| Position (Top) | Pass | Pass | |
| Position (Bottom) | Pass | Pass | |
| Colors | Pass | Pass | Good contrast needed |
| Fonts | Pass | Pass | |
| All Bar Types | Pass | Pass | |

**Known Considerations:**
1. **Minimal Design**: Craft has a very clean, minimal aesthetic
   - Recommendation: Use subtle colors that complement the theme
   - Avoid overly bright or clashing colors

2. **Typography**: Craft uses elegant typography
   - Our system font stack blends well
   - Consider using similar font weights to match

**No theme-specific CSS fixes needed.**

---

### 4. Ride Theme

**Status:** Compatible

**Test Results:**
| Feature | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Visibility | Pass | Pass | |
| Position (Top) | Pass | Pass | |
| Position (Bottom) | Pass | Pass | |
| Sticky Mode | Pass | Pass | |
| All Bar Types | Pass | Pass | |

**Known Considerations:**
1. **Bold Design**: Ride has a more bold, impactful design
   - Announcement bars complement this style well
   - Bold colors work well with this theme

**No theme-specific CSS fixes needed.**

---

## Common Issues & Solutions

### Issue 1: Bar Hidden Behind Header

**Symptoms:** Bar appears but is hidden behind the theme's header

**Solution:** Increase z-index
```css
.announceflow-bar {
  z-index: 10001 !important;
}
```

### Issue 2: Bar Causes Layout Shift

**Symptoms:** Content jumps when bar appears

**Solution:** Use the sticky positioning which doesn't affect document flow
```css
.announceflow-bar--sticky.announceflow-bar--top {
  position: sticky;
  top: 0;
}
```

### Issue 3: Bar Overlaps Navigation on Mobile

**Symptoms:** Mobile menu is hidden behind the bar

**Solution:** Most theme mobile menus use very high z-index. If needed:
```css
@media (max-width: 768px) {
  .announceflow-bar {
    z-index: 999; /* Lower than mobile nav */
  }
}
```

### Issue 4: Form Inputs Styled Incorrectly

**Symptoms:** Email input looks wrong due to theme CSS

**Solution:** Reset input styles (already applied in our CSS):
```css
.announceflow-email-form__input {
  -webkit-appearance: none;
  appearance: none;
  border-radius: 4px;
  /* ... rest of styles */
}
```

### Issue 5: Colors Not Applying

**Symptoms:** Custom colors don't show

**Solution:** Use `!important` for theme overrides:
```css
.announceflow-bar {
  background-color: var(--af-bg) !important;
  color: var(--af-text) !important;
}
```

---

## Testing Checklist

When testing on a new theme, verify:

### Visibility
- [ ] Bar appears at correct position (top/bottom)
- [ ] Bar doesn't overlap critical header elements
- [ ] Bar doesn't hide primary navigation
- [ ] Bar z-index is sufficient

### Styling
- [ ] Background color displays correctly
- [ ] Text color displays correctly
- [ ] Button colors display correctly
- [ ] Font renders clearly and readable
- [ ] No CSS conflicts causing visual issues

### Functionality
- [ ] Dismiss button closes bar with animation
- [ ] CTA links navigate correctly
- [ ] CTA buttons have correct hover states
- [ ] Countdown timer updates every second
- [ ] Email form validates input
- [ ] Email form submits successfully
- [ ] Cookie consent Accept works
- [ ] Cookie consent Decline works
- [ ] Free shipping updates with cart changes

### Mobile (< 768px)
- [ ] Bar layout adjusts for mobile
- [ ] Text is readable
- [ ] Touch targets are adequate (44px minimum)
- [ ] No horizontal scrolling
- [ ] Forms remain usable

### Accessibility
- [ ] Close button has aria-label
- [ ] Bar has role="banner"
- [ ] Focus states visible
- [ ] Reduced motion preference respected

---

## Adding Theme-Specific Fixes

If you encounter issues with a specific theme, add fixes to `announceflow.css`:

```css
/* Theme-specific overrides */
/* Add theme detection using Shopify's theme name classes or body classes */

/* Example: Theme XYZ fix */
body.theme-xyz .announceflow-bar {
  /* theme-specific styles */
}
```

---

## Browser Compatibility

Tested and supported browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android)

---

## Reporting Theme Issues

If you find compatibility issues with a theme:

1. Document the theme name and version
2. Describe the issue with screenshots
3. Note the browser and device used
4. Submit to: support@codershive.com

---

Last Updated: 2024
