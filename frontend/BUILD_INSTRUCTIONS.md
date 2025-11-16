# 🔨 Molek CBT System - Build Instructions

## Prerequisites

### Required Software:
- **Node.js:** v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm:** v9.0.0 or higher (comes with Node.js)
- **Git:** For version control ([Download](https://git-scm.com/))
- **Windows:** Build must be done on Windows for Windows .exe

### Verify Installation:
```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show v9.x.x or higher
git --version    # Should show git version
```

---

## Initial Setup

### 1. Clone Repository:
```bash
git clone https://github.com/moh-Adedamola/molek-monolithic-cbt-system
cd molek-monolithic-cbt-system
```

### 2. Install All Dependencies:
```bash
# Install root workspace dependencies
npm install

# This will automatically install backend and frontend dependencies
# via workspaces defined in package.json
```

**Alternative (if workspaces don't work):**
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Initialize Database (Development):
```bash
cd backend
node src/db/setup.js
cd ..
```

---

## Development Mode

### Run Full Stack in Development:
```bash
# From root directory
npm run dev
```

This starts:
- Backend server on `http://localhost:5000`
- Frontend dev server on `http://localhost:5173`
- Hot reload enabled for both

### Access Development:
- **Admin Panel:** `http://localhost:5173/admin`
- **Student Login:** `http://localhost:5173`
- **API:** `http://localhost:5000/api`

### Run Backend Only:
```bash
cd backend
npm run dev
```

### Run Frontend Only:
```bash
cd frontend
npm run dev
```

---

## Building for Production

### Step 1: Build Frontend
```bash
npm run build:frontend
```

This creates optimized production build in `frontend/dist/`

### Step 2: Prepare Backend
```bash
npm run build:backend
```

This installs production dependencies only (no devDependencies)

### Step 3: Package as Electron App
```bash
npm run package
```

This will:
1. Build frontend (if not already built)
2. Prepare backend
3. Package everything with Electron
4. Create installer in `dist-electron/`

**Output:**
```
dist-electron/
├── MolekCBT Setup 1.0.0.exe    (~150MB) - Windows Installer
└── win-unpacked/                        - Portable version
    ├── MolekCBT.exe
    ├── resources/
    └── ...
```

### Step 4: Test Packaged Application
```bash
# Test without creating installer (faster for testing)
npm run package:dir
```

This creates portable version in `dist-electron/win-unpacked/`

---

## Creating Distribution Package

### Method 1: Installer (Recommended)
```bash
npm run package
```

**Share:**
- File: `dist-electron/MolekCBT Setup 1.0.0.exe`
- Upload to: Google Drive, Dropbox, or USB drive
- Size: ~150MB
- ICT installs this file

### Method 2: Portable ZIP
```bash
npm run package:dir

# Then manually create ZIP:
# 1. Navigate to dist-electron/win-unpacked/
# 2. Select all files
# 3. Right-click → Send to → Compressed (zipped) folder
# 4. Name: molek-cbt-portable-v1.0.0.zip
```

**Share:**
- File: `molek-cbt-portable-v1.0.0.zip`
- ICT extracts and runs `MolekCBT.exe`
- No installation needed
- Size: ~100MB (compressed)

---

## Version Management

### Update Version Number:

1. Edit `package.json` (root):
```json
{
  "version": "1.0.1" 
}
```

2. Edit `electron-builder.json`:
```json
{
  "productName": "molek-monolithic-cbt-system",
  "version": "1.0.1"  
}
```

3. Rebuild:
```bash
npm run package
```

### Version Naming Convention:
- **Major.Minor.Patch** (e.g., 1.0.0)
- **Major:** Breaking changes (1.0.0 → 2.0.0)
- **Minor:** New features (1.0.0 → 1.1.0)
- **Patch:** Bug fixes (1.0.0 → 1.0.1)

---

## Auto-Update Setup (Optional)

### Prerequisites:
- GitHub repository (public or private)
- GitHub releases enabled

### 1. Create GitHub Release:
```bash
# Tag the release
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will build and create release (if configured)
# Or manually upload installer to GitHub Releases
```

### 2. Update electron-builder.json:
```json
{
  "publish": {
    "provider": "github",
    "owner": "moh-Adedamola",
    "repo": "molek-monolithic-cbt-system",
    "private": false
  }
}
```

### 3. Build with Publish Config:
```bash
npm run package
```

### 4. Upload to GitHub:
- Go to: `https://github.com/moh-Adedamola/molek-monolithic-cbt-system/releases`
- Click "Create new release"
- Tag: v1.0.0
- Upload: `MolekCBT Setup 1.0.0.exe`
- Publish release

### 5. App Will Auto-Check for Updates:
- When school has internet, app checks for updates
- Notifies ICT if update available
- Downloads and installs automatically

---

## Testing Checklist

### Before Building:

- [ ] All features work in development mode
- [ ] Database migrations tested
- [ ] Student login works
- [ ] Admin panel accessible
- [ ] CSV uploads working
- [ ] Results export working
- [ ] Archive system tested
- [ ] No console errors

### After Building:

- [ ] Installer runs without errors
- [ ] Application launches successfully
- [ ] First-time setup completes
- [ ] Database initializes
- [ ] Can upload students
- [ ] Can upload questions
- [ ] Can take exam (test with dummy data)
- [ ] Results save correctly
- [ ] Archive creates files
- [ ] Reset database works
- [ ] Network addresses show correctly

### Network Testing:

- [ ] Server accessible at localhost:5000
- [ ] Server accessible from another PC (same network)
- [ ] Multiple students can login simultaneously
- [ ] Exam submission works from different PCs
- [ ] No connection drops during exam

---

## Troubleshooting Build Issues

### Error: "electron-builder command not found"
```bash
npm install --save-dev electron-builder
```

### Error: "Cannot find module 'electron'"
```bash
npm install --save-dev electron
```

### Error: "ENOENT: no such file or directory"
```bash
# Make sure frontend is built first
npm run build:frontend
```

### Build Stuck or Very Slow:
```bash
# Clear electron-builder cache
rm -rf ~/.electron-builder-cache

# Or on Windows:
# Delete: C:\Users\YourName\AppData\Local\electron-builder\Cache
```

### Installer Size Too Large:
```bash
# Check if node_modules is included (shouldn't be)
# Edit electron-builder.json and verify files array
```

---

## Project Structure for Building
```
molek-cbt/                          # Root (build from here)
│
├── package.json                    # Build scripts here
├── electron-builder.json           # Electron config
│
├── electron/                       # Electron main process
│   ├── main.js                     # Entry point
│   ├── preload.js                  # IPC bridge
│   └── icon.ico                    # App icon
│
├── frontend/                       # React app
│   ├── dist/                       # Built files (npm run build)
│   └── src/                        # Source code
│
├── backend/                        # Node.js server
│   ├── src/                        # Source code
│   └── package.json                # Backend dependencies
│
└── dist-electron/                  # Build output
    └── MolekCBT Setup 1.0.0.exe   # Final installer
```

---

## Environment Variables (Optional)

Create `.env` in root (development only):
```env
# Development
NODE_ENV=development
PORT=5000

# Production (set by electron automatically)
# NODE_ENV=production
# DB_PATH=/path/to/user/data
# ARCHIVES_PATH=/path/to/archives
```

**Note:** Production paths are set automatically by Electron

---

## CI/CD with GitHub Actions (Optional)

Create `.github/workflows/build.yml`:
```yaml
name: Build Electron App

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install Dependencies
      run: npm install
    
    - name: Build
      run: npm run package
    
    - name: Upload Artifact
      uses: actions/upload-artifact@v3
      with:
        name: molek-cbt-installer
        path: dist-electron/*.exe
```

---

## Quick Commands Reference
```bash
# Development
npm run dev                  # Start full stack dev mode
npm run dev:electron        # Test in Electron window

# Building
npm run build               # Build frontend + backend
npm run build:frontend      # Build frontend only
npm run build:backend       # Prepare backend only
npm run package             # Create installer
npm run package:dir         # Create portable version (no installer)

# Maintenance
npm install                 # Install/update dependencies
npm audit fix               # Fix security issues
npm run clean               # Clean build folders (add this script if needed)
```

---

## Support & Resources

- **Electron Docs:** https://www.electronjs.org/docs
- **electron-builder:** https://www.electron.build/
- **React Docs:** https://react.dev/
- **Node.js Docs:** https://nodejs.org/docs

---

**Last Updated:** November 2025
**Build Version:** 1.0.0