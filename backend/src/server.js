const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set environment variables for services to use
if (process.env.DB_PATH) {
    console.log('🗄️ Using database path:', process.env.DB_PATH);
} else {
    console.log('🗄️ Using default database path');
}

if (process.env.ARCHIVES_PATH) {
    console.log('📁 Using archives path:', process.env.ARCHIVES_PATH);
}

if (process.env.UPLOADS_PATH) {
    console.log('📁 Using uploads path:', process.env.UPLOADS_PATH);
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(process.env.UPLOADS_PATH)) {
        fs.mkdirSync(process.env.UPLOADS_PATH, { recursive: true });
        console.log('✅ Created uploads directory');
    }
}

// Health check endpoint (put this BEFORE importing routes)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        paths: {
            database: process.env.DB_PATH || 'default',
            archives: process.env.ARCHIVES_PATH || 'default',
            uploads: process.env.UPLOADS_PATH || 'default'
        }
    });
});

// Import routes with error handling
let adminRoutes, studentRoutes, archiveRoutes;

try {
    adminRoutes = require('./routes/adminRoutes');
    console.log('✅ Admin routes loaded');
} catch (error) {
    console.error('❌ Failed to load admin routes:', error.message);
}

try {
    studentRoutes = require('./routes/studentRoutes');
    console.log('✅ Student routes loaded');
} catch (error) {
    console.error('❌ Failed to load student routes:', error.message);
}

try {
    archiveRoutes = require('./routes/archiveRoute');
    console.log('✅ Archive routes loaded');
} catch (error) {
    console.error('❌ Failed to load archive routes:', error.message);
}

// API Routes (only if loaded successfully)
if (adminRoutes) {
    app.use('/api/admin', adminRoutes);
}
if (studentRoutes) {
    app.use('/api/students', studentRoutes);
}
if (archiveRoutes) {
    app.use('/api/admin/archive', archiveRoutes);
}

// Serve static files in production (when frontend is built)
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../../frontend/dist');

    if (fs.existsSync(frontendPath)) {
        app.use(express.static(frontendPath));
        console.log('✅ Serving frontend from:', frontendPath);

        // Handle React routing - return index.html for all non-API routes
        app.get('*', (req, res) => {
            if (!req.path.startsWith('/api')) {
                res.sendFile(path.join(frontendPath, 'index.html'));
            }
        });
    } else {
        console.warn('⚠️ Frontend dist folder not found:', frontendPath);
    }
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════');
    console.log('🚀 Molek CBT Backend Server');
    console.log('═══════════════════════════════════════════');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
    console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('═══════════════════════════════════════════');
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.error('   Another instance may be running. Please close it and try again.');
    } else {
        console.error('❌ Server failed to start:', err);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    // Don't exit in production, just log
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit in production, just log
});

module.exports = app;