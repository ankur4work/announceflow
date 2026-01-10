# AnnounceFlow - Manual Testing Guide

## Overview
AnnounceFlow is a Shopify app for creating and managing announcement bars. This document outlines all working features and how to test them.

---

## 1. Admin UI Pages

### Dashboard (`/app`)
**What it does:** Main hub showing all announcement bars

**Features to test:**
- View all bars in a table (name, type, status, last updated)
- Quick stats: Total bars, Active bars, Views, Click rate
- Toggle bars on/off with the switch button
- Edit bars (pencil icon)
- Delete bars (trash icon with confirmation modal)
- "Create announcement bar" button

**How to test:**
1. Open the app in Shopify Admin
2. Create a bar, then return to dashboard
3. Try toggling the bar on/off
4. Click edit icon and modify something
5. Click delete icon and confirm

---

### Create Bar (`/app/bars/new`)
**What it does:** Form to create a new announcement bar

**Features to test:**
| Field | Description |
|-------|-------------|
| Bar Type | Promotional, Announcement, Countdown Timer |
| Name | Internal name for the bar |
| Message | Text shown to visitors |
| CTA Button | Optional button (text + link + style) |
| Countdown End | For countdown bars - set end date/time |
| Expired Message | Message when countdown ends |
| Background Color | Color picker or hex input |
| Text Color | Color picker or hex input |
| Position | Top or Bottom of page |
| Font Size | Small, Medium, Large |
| Sticky | Makes bar fixed on scroll |
| Dismissible | Shows X close button |
| Live Preview | Right panel shows real-time preview |

**How to test:**
1. Go to `/app/bars/new`
2. Select "Promotional" type
3. Enter name and message
4. Add a CTA button
5. Change colors - watch preview update
6. Click "Create bar"
7. Verify bar appears in dashboard

---

### Edit Bar (`/app/bars/:id`)
**What it does:** Modify existing bar settings

**Features to test:**
- All fields from create form pre-filled
- Status banners (active, expired, etc.)
- Danger Zone with delete button
- Save changes button

**How to test:**
1. Click edit on any bar in dashboard
2. Modify the message
3. Change colors
4. Click "Save changes"
5. Return to dashboard and verify changes

---

### Settings (`/app/settings`)
**Status:** Placeholder - save not yet functional

**What exists:**
- Default position selector
- Close button toggle
- Dismissal duration dropdown
- Analytics toggle

---

### Email Subscribers (`/app/subscribers`)
**Status:** Premium feature - gate shown for free tier

---

## 2. Bar Types

### Promotional Bar
- Text message + optional CTA button
- Button styles: Primary (solid), Secondary (outline), Link (text)
- Fully customizable colors

### Announcement Bar
- Same as promotional
- Simple text announcements

### Countdown Timer Bar
- Real-time countdown display (Days:Hours:Mins:Secs)
- Set end date/time (must be future)
- Expired message option
- Auto-hide when expired option
- Pulsing animation in final minute

---

## 3. Theme Extension (Storefront)

### Setup
1. In Shopify Admin, go to Online Store > Themes
2. Click "Customize" on your active theme
3. Add "Announcement Bar" block from AnnounceFlow
4. Position it in header or footer section

### Features
- Reads bar config from app automatically
- Shows active bars only
- Countdown timer updates every second
- Dismiss button saves to localStorage (24hr)
- Responsive on mobile

### Fallback Settings (if no app bars configured)
- Message text
- Background/text colors
- Position
- Sticky option
- CTA link and text

---

## 4. API Endpoints

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

## 5. Quick Test Checklist

### Basic Flow
- [ ] Create a promotional bar
- [ ] See it in dashboard
- [ ] Toggle it on/off
- [ ] Edit the message
- [ ] Delete the bar

### Countdown Timer
- [ ] Create countdown bar
- [ ] Set end time 5 minutes from now
- [ ] Watch preview countdown tick
- [ ] See bar on storefront
- [ ] Wait for expiration - see expired message

### Storefront
- [ ] Add block to theme
- [ ] See active bar display
- [ ] Click dismiss (X) button
- [ ] Refresh page - bar stays hidden
- [ ] Clear localStorage - bar returns

### Styling
- [ ] Change background color
- [ ] Change text color
- [ ] Try different positions (top/bottom)
- [ ] Enable sticky mode
- [ ] Test all font sizes

### CTA Button
- [ ] Add CTA text and link
- [ ] Try Primary style
- [ ] Try Secondary style
- [ ] Try Link style
- [ ] Click button - verify link works

---

## 6. Known Limitations

| Feature | Status |
|---------|--------|
| Settings save | Not implemented |
| Email subscribers | Premium only (placeholder) |
| Analytics tracking | Reads from metafields, partial |
| Free shipping bar | Type exists, not fully built |
| Email signup bar | Premium feature, placeholder |

---

## 7. Data Storage

- All bar data stored in Shopify metafields
- Namespace: `announceflow`
- Key: `bars_config`
- Format: JSON

---

## 8. JavaScript API (Storefront)

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

## 9. Authentication

- All admin routes use `authenticate.admin(request)`
- Uses Shopify App Bridge session
- API endpoints return 401 for unauthenticated requests

---

*Generated for AnnounceFlow v1.0*
