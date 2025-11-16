# Molek CBT System - Developer Setup

## Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Git

## First Time Setup

### Quick Setup (Recommended)

```bash
# 1. Clone the repository
git clone <repository-url>
cd molek-cbt

# 2. Install all dependencies
npm run install-all

# 3. Build the application
npm run package
```

The `.exe` installer will be in `dist-electron/`

### Manual Setup (if needed)

```bash
# Root dependencies
npm install

# Frontend dependencies
npm install --workspace frontend

# Backend dependencies
npm install --workspace backend
```

## Development

### Available Scripts

```bash
npm run install-all     # Install all dependencies (root + workspaces)
npm run dev            # Run backend + frontend concurrently
npm run dev:backend    # Run backend only
npm run dev:frontend   # Run frontend only
npm run dev:electron   # Run Electron in development mode
npm run build          # Build frontend + backend
npm run build:frontend # Build frontend only
npm run build:backend  # Prepare backend for packaging
npm run package        # Build and create .exe installer
npm run package:dir    # Build without creating installer
npm run test:electron  # Test Electron app
npm run clean          # Clean build artifacts
```

### Run in Development Mode

**Option 1 - All at once:**
```bash
npm run dev
```
This runs both frontend and backend concurrently.

**Option 2 - Separate terminals (for debugging):**

**Terminal 1 - Frontend:**
```bash
npm run dev:frontend
```
Runs on: http://localhost:3000

**Terminal 2 - Backend:**
```bash
npm run dev:backend
```
Runs on: http://localhost:5000

**Terminal 3 - Electron:**
```bash
npm run dev:electron
```

### Build for Production

```bash
npm run package
```

This creates:
- `dist-electron/win-unpacked/` - Unpacked application
- `dist-electron/Molek CBT System Setup 1.0.0.exe` - Installer

## Project Structure

```
molek-cbt/
├── backend/              # Express.js backend
│   ├── src/
│   │   ├── server.js     # Main server file
│   │   ├── routes/       # API routes
│   │   └── db/           # Database files
│   └── package.json
├── frontend/             # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   └── package.json
├── electron/             # Electron main process
│   ├── main.js           # Main process entry
│   └── preload.js        # Preload script
├── afterPack.js          # Custom packaging script
├── electron-builder.json # Electron builder config
└── package.json          # Root package.json (workspaces)
```

## Architecture

### Master System (Admin)
- Installs the `.exe` file
- Opens to `/admin` route automatically
- Hosts the backend and database
- Backend serves on `0.0.0.0:5000` (accessible over LAN)

### Student Systems
- **No installation required**
- Students open browser to `http://MASTER_IP:5000`
- Access student login and exam interface
- All data saved to master system's database

## Common Issues

### 1. "Cannot find module" errors
```bash
# Clean and reinstall
rm -rf node_modules frontend/node_modules backend/node_modules
rm package-lock.json frontend/package-lock.json backend/package-lock.json
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

### 2. Build fails
```bash
# Clean build artifacts
rm -rf dist-electron
npm run build:frontend
npm run package
```

### 3. Backend not accessible over LAN
- Check Windows Firewall allows port 5000
- Ensure backend is listening on `0.0.0.0` (not `localhost`)
- Verify all systems are on the same network

## Testing

### Test Backend Separately
```bash
cd backend
npm start
```
Visit: http://localhost:5000/api/health

### Test Frontend Separately
```bash
cd frontend
npm run dev
```
Visit: http://localhost:3000

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[ 09014465194 ]