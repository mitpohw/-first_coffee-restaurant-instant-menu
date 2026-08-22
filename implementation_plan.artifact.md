# Implementation Plan — First Coffee Restaurant Digital Menu Updates

This plan outlines the updates for the admin authentication system, QR code generator fixes, UI/UX improvements, and admin panel management features.

## Proposed Changes

### 🔐 Admin Authentication System
Access to `admin.html` will be strictly protected by the existing authentication flow.

#### [MODIFY] [admin-panel.js](file:///C:/Users/LordMichael/Downloads/-first_coffee-restaurant-instant-menu-main/js/admin-panel.js)
- Ensure `Auth.requireAuth()` is the first call in `init()`.
- Explicitly show the `#admin-app` div only after successful authentication.

#### [MODIFY] [admin-login.js](file:///C:/Users/LordMichael/Downloads/-first_coffee-restaurant-instant-menu-main/js/admin-login.js)
- Ensure login correctly redirects to `admin.html`.

---

### 📱 QR Code Generator Fix
Fix the trigger button and ensure high-quality, branded output.

#### [MODIFY] [admin.html](file:///C:/Users/LordMichael/Downloads/-first_coffee-restaurant-instant-menu-main/admin.html)
- Set default value for Menu URL input to `https://first-coffee-restaurant-instant-men.vercel.app/`.
- Ensure script tags for `qrcode.min.js` and `html2canvas.min.js` are correctly placed.

#### [MODIFY] [admin-panel.js](file:///C:/Users/LordMichael/Downloads/-first_coffee-restaurant-instant-menu-main/js/admin-panel.js)
- Debug and fix the `#qr-generate-btn` event listener.
- Update `generateQRCode` to correctly handle logo overlays and branded styles for printing.

---

### 🎨 Frontend UI/UX Improvements
Enhance the customer experience with a sticky header and reliable search.

#### [MODIFY] [style.css](file:///C:/Users/LordMichael/Downloads/-first_coffee-restaurant-instant-menu-main/css/style.css)
- Implement `position: sticky` for `.site-header` and `.category-nav`.
- Adjust `top` offsets to ensure they stack correctly during scroll.
- Ensure images use `aspect-ratio` and `object-fit: cover` for responsiveness.

#### [MODIFY] [menu.js](file:///C:/Users/LordMichael/Downloads/-first_coffee-restaurant-instant-menu-main/js/menu.js)
- Fix `filteredItems` logic to ensure global search works across all categories.
- Implement a fallback placeholder for missing or broken images.

---

### 🛠️ Admin Panel Management Features
Add interactive toggles for "Featured" and "Availability" statuses.

#### [MODIFY] [admin-panel.js](file:///C:/Users/LordMichael/Downloads/-first_coffee-restaurant-instant-menu-main/js/admin-panel.js)
- Update `renderItems()` to include clickable status badges for "Featured" and "Available".
- Ensure these toggles immediately persist to `localStorage` via `Storage.save()`.

---

### 🖼️ Image Verification & Cleanup
Scan and sanitize the menu data for production readiness.

#### [MODIFY] [data.js](file:///C:/Users/LordMichael/Downloads/-first_coffee-restaurant-instant-menu-main/js/data.js)
- Audit default items. Replace broken Unsplash URLs with descriptive placeholders.
- Ensure every item has a name, price, and description.

## Verification Plan

### Automated Tests
- I will verify the search logic by manually testing search terms in the sub-agent's console log equivalents.
- I will verify the authentication flow by checking redirect logic.

### Manual Verification
- Test the QR code generation in the browser (if possible) or by inspecting the generated data URL.
- Verify sticky header behavior by simulating scroll positions.
- Verify that "Unavailable" items are correctly grayed out and non-clickable in the menu view.
