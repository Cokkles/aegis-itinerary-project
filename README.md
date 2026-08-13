# ⚡ AEGIS Central Control & Tracking Dispatcher (PWA)

A responsive, central command dispatcher and live briefing dashboard built with HTML, CSS, JavaScript, Google Apps Script, and Google Drive JSON feeds.

---

## 📁 Repository Structure

```
├── index.html       # AEGIS Master Dashboard & Dispatcher
├── manifest.json    # Web App Manifest for PWA installation
├── sw.js            # Service Worker for offline asset caching
├── Code.gs          # Google Apps Script Webhook & Feed Engine
├── icon-192.png     # PWA App Icon (192x192)
├── icon-512.png     # PWA App Icon (512x512)
└── favicon.ico      # Favicon
```

---

## 🚀 Quick Setup & Deployment Guide

### Step 1: Deploy Google Apps Script Webhook
1. Go to [script.google.com](https://script.google.com) and create a new project.
2. Copy the code from `Code.gs` into the Apps Script editor.
3. Click **Deploy** -> **New deployment**.
4. Select **Web app**:
   - **Execute as**: *Me*
   - **Who has access**: *Anyone*
5. Copy the deployed Web App URL (`https://script.google.com/macros/s/.../exec`).
6. Update the `WEBHOOK_URL` constant on line ~880 in `index.html` with your deployment URL.

---

### Step 2: Publish to GitHub Pages
1. Create a new public repository on GitHub named `aegis-dashboard`.
2. Commit and push all repository files:
   ```bash
   git init
   git add .
   git commit -m "Deploy AEGIS PWA Control Panel"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/aegis-dashboard.git
   git push -u origin main
   ```
3. In GitHub, navigate to **Settings** -> **Pages**.
4. Set **Source** to `Deploy from a branch`, choose branch `main` and folder `/ (root)`, then click **Save**.
5. Your live PWA dashboard will be active at:
   `https://YOUR_USERNAME.github.io/aegis-dashboard/`

---

### Step 3: Install PWA on Mobile / Desktop
* **iOS (Safari)**: Open `https://YOUR_USERNAME.github.io/aegis-dashboard/`, tap the **Share** icon -> **Add to Home Screen**.
* **Android (Chrome)**: Open the URL, tap the **three dots menu** -> **Install App** or **Add to Home Screen**.
