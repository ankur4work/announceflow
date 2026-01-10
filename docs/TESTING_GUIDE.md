# AnnounceFlow - Manual Testing Guide

## Overview
AnnounceFlow is a Shopify app for creating and managing announcement bars. This document outlines all working features and how to test them.

---

## 1. Admin UI Pages

### Dashboard (`/app`)
**What it does:** Main hub showing all announcement bars with stats and quick actions

**Features to test:**
- View all bars in a table (status toggle, name, type, created date, actions)
- Quick stats sidebar: Total bars, Active bars, Views, Click rate
- Toggle bars on/off with the status button (checkmark/X icon)
- Click any row to navigate to edit page
- Edit bars (pencil icon)
- Delete bars (trash icon with confirmation modal)
- "Create bar" button in header and sidebar
- Free plan banner with upgrade CTA
- Bar limit warning when limit reached
- Empty state with feature cards when no bars exist
- Quick Create shortcuts (Promotional Bar, Countdown Timer)
- Current Plan card showing limit and upgrade option

**New Features (sushil/frontend-day-1):**
- Status toggle column with spinner during toggle
- Clickable rows to edit
- Tooltips on action buttons
- Relative date formatting ("2 hours ago")
- Type badges with color coding (Countdown=orange, Promotional=blue)
- Expired badge for countdown bars past end date
- Error state with retry button
- Skeleton loading state
- Empty state with 6 feature cards

**How to test:**
1. Open the app in Shopify Admin
2. Try toggling a bar on/off - watch spinner appear
3. Click a row to navigate to edit
4. Use quick create buttons in sidebar
5. View stats update after changes
6. Delete a bar and confirm the modal

---

### Create Bar (`/app/bars/new`)
**What it does:** Form to create a new announcement bar with live preview

**Features to test:**
| Field | Description |
|-------|-------------|
| Bar Type | Promotional, Announcement, Countdown Timer |
| Name | Internal name for the bar |
| Message | Text shown to visitors (150 char limit with counter) |
| CTA Button | Optional button (text + link) - hidden for countdown |
| Countdown End | For countdown bars - datetime picker |
| Expired Message | Message when countdown ends |
| Background Color | **NEW:** Visual color picker with presets |
| Text Color | **NEW:** Visual color picker with presets |
| Position | **NEW:** Segmented button (Top/Bottom) |
| Font Size | **NEW:** Dropdown with preview (Small/Medium/Large) |
| Enable bar | Checkbox to activate |
| Dismissible | Shows X close button |
| Hide when expired | For countdown bars |

**New Features (sushil/frontend-day-1):**
- **Live Preview Panel** - Real-time preview as you type
- **Device Toggle** - Switch between desktop/mobile preview
- **ColorPicker Component** - Visual picker + presets + hex input
- **FontSizeSelector** - Dropdown with "Aa" preview
- **Character Counter** - Shows 150 char limit on message
- **Unsaved Changes Warning** - Modal when navigating away
- **Tips Card** - Best practices in sidebar

**How to test:**
1. Go to `/app/bars/new`
2. Select "Promotional" type
3. Enter name and message - watch preview update live
4. Click background color - try color picker, presets, and hex input
5. Toggle position between Top/Bottom - preview updates
6. Change font size - see "Aa" preview change
7. Toggle mobile/desktop preview button
8. Add CTA button - appears in preview
9. Enable dismissible - X button appears in preview
10. Click "Create bar"
11. Try navigating away without saving - see warning modal

---

### Edit Bar (`/app/bars/:id`)
**What it does:** Modify existing bar settings with live preview

**Features to test:**
- All fields from create form pre-filled
- Name field editable
- Live preview shows current state
- Status banners (active, expired, etc.)
- Danger Zone with delete button
- Save changes button
- Unsaved changes detection

**How to test:**
1. Click edit on any bar in dashboard
2. Modify the message - preview updates
3. Change colors with picker
4. Click "Save changes"
5. Try deleting from Danger Zone section
6. Navigate away without saving - see warning

---

### Settings (`/app/settings`)
**Status:** Placeholder - save not yet functional

**What exists:**
- Default position selector
- Close button toggle
- Dismissal duration dropdown (1hr, 24hr, 7 days, 30 days, never)
- Analytics toggle
- Save button (not implemented)

---

### Email Subscribers (`/app/subscribers`)
**Status:** Premium feature - gate shown for free tier

**What exists:**
- Premium feature gate with upgrade CTA
- Empty state explaining email capture features
- Premium features list (Email bars, Subscriber management, CSV export)
- Export button in header (future implementation)

---

## 2. New UI Components

### BarPreview Component
**Location:** Create/Edit bar pages - right sidebar

**Features:**
- Desktop/Mobile toggle buttons
- Browser mockup with address bar
- Real-time countdown timer (updates every second)
- Shows CTA buttons with correct styling
- Position indicator (top/bottom)
- "Powered by AnnounceFlow" badge (free plan)
- Expired state handling

### ColorPicker Component
**Features:**
- Visual color preview square
- Native browser color picker button
- Hex input field with validation
- 7 preset colors (Navy, Red, Green, Orange, Purple, Black, White)
- Auto-formatting of hex codes
- Click preset to select instantly

### FontSizeSelector Component
**Features:**
- Dropdown: Small (14px), Medium (16px), Large (18px)
- Live "Aa" preview showing selected size
- Pixel value display

---

## 3. Bar Types

### Promotional Bar
- Text message + optional CTA button
- Button styles: Primary (solid), Secondary (outline), Link (text)
- Fully customizable colors
- Font size selection

### Announcement Bar
- Same as promotional
- Simple text announcements

### Countdown Timer Bar
- Real-time countdown display (Days:Hours:Mins:Secs)
- Set end date/time (must be future)
- Expired message option
- Auto-hide when expired option
- Pulsing animation in final minute
- **NEW:** Live countdown in preview panel

### Email Signup Bar (Premium)
- Type exists but locked behind premium
- Preview shows disabled form state

### Free Shipping Bar (Planned)
- Type exists in selector
- Not fully implemented

### Cookie Consent Bar (Planned)
- Type exists in selector
- Not fully implemented

---

## 4. Theme Extension (Storefront)

### Setup
1. In Shopify Admin, go to Online Store > Themes
2. Click "Customize" on your active theme
3. Add "Announcement Bar" block from AnnounceFlow
4. Position it in header or body section

### Block Settings (Fallback)
When no app bars configured, these settings are used:
- Bar Type selector (Promotional, Announcement, Countdown)
- Message text
- Background/text colors
- Position (top/bottom)
- Sticky option
- Dismissible toggle
- CTA link and text
- Show CTA checkbox

### Features
- Reads bar config from app automatically (metafields)
- Falls back to block settings if no metafield config
- Shows active bars only
- Countdown timer updates every second
- Dismiss button saves to localStorage (24hr)
- Responsive on mobile
- Supports sticky positioning

---

## 5. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bars` | List all bars |
| POST | `/api/bars` | Create new bar |
| GET | `/api/bars/:id` | Get single bar |
| PUT | `/api/bars/:id` | Update bar |
| PATCH | `/api/bars/:id` | Toggle enabled/disabled |
| DELETE | `/api/bars/:id` | Delete bar |
| GET | `/api/billing` | Check plan status |
| GET | `/api/status` | Get current plan |

**Note:** All APIs require Shopify authentication (401 for unauthenticated requests)

---

## 6. Quick Test Checklist

### Basic Flow
- [ ] Create a promotional bar
- [ ] See live preview update in real-time
- [ ] Toggle desktop/mobile preview
- [ ] See it in dashboard
- [ ] Toggle it on/off with status button
- [ ] Click row to edit
- [ ] Edit the message
- [ ] Delete the bar

### Color Picker
- [ ] Click color square to open picker
- [ ] Select color from native picker
- [ ] Type hex code manually
- [ ] Click preset color button
- [ ] Verify preview updates

### Font Size
- [ ] Change font size dropdown
- [ ] See "Aa" preview change
- [ ] Verify bar preview updates

### Countdown Timer
- [ ] Create countdown bar
- [ ] Set end time 5 minutes from now
- [ ] Watch preview countdown tick in real-time
- [ ] See bar on storefront
- [ ] Wait for expiration - see expired message

### Storefront
- [ ] Add block to theme
- [ ] See active bar display
- [ ] Click dismiss (X) button
- [ ] Refresh page - bar stays hidden
- [ ] Clear localStorage - bar returns

### Styling
- [ ] Change background color with picker
- [ ] Change text color with picker
- [ ] Try different positions (top/bottom)
- [ ] Enable sticky mode
- [ ] Test all font sizes

### CTA Button
- [ ] Add CTA text and link
- [ ] See button appear in preview
- [ ] Click button in storefront - verify link works

### Unsaved Changes
- [ ] Make changes in create/edit form
- [ ] Try to navigate away
- [ ] See warning modal
- [ ] Choose "Keep editing" or "Discard changes"

---

## 7. Known Limitations

| Feature | Status |
|---------|--------|
| Settings save | Not implemented |
| Email subscribers | Premium only (placeholder) |
| Analytics tracking | Reads from metafields, partial |
| Free shipping bar | Type exists, not fully built |
| Email signup bar | Premium feature, placeholder |
| Cookie consent bar | Type exists, not implemented |

---

## 8. Data Storage

- All bar data stored in Shopify metafields
- Namespace: `announceflow`
- Key: `bars_config`
- Format: JSON

---

## 9. JavaScript API (Storefront)

Available globally as `window.AnnounceFlow`:

```javascript
// Dismiss a bar programmatically
AnnounceFlow.dismiss('bar-id')

// Show a dismissed bar
AnnounceFlow.show('bar-id')

// Check if bar is visible
AnnounceFlow.isVisible('bar-id')

// Get countdown remaining (ms)
AnnounceFlow.getTimeRemaining('bar-id')
```

---

## 10. Authentication

- All admin routes use `authenticate.admin(request)`
- Uses Shopify App Bridge session
- API endpoints return 401 for unauthenticated requests

---

## 11. New Component Locations

| Component | File Path |
|-----------|-----------|
| BarPreview | `app/components/BarPreview.tsx` |
| ColorPicker | `app/components/ColorPicker.tsx` |
| FontSizeSelector | `app/components/FontSizeSelector.tsx` |
| Component exports | `app/components/index.ts` |

---

*Generated for AnnounceFlow v1.1 (includes sushil/frontend-day-1 features)*
