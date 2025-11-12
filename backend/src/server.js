require('./db/setup');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');


const app = express();
const PORT = 5000;

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('📁 Created uploads folder');
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Public student routes
app.use('/api/student', studentRoutes);

// Admin routes (assumes localhost access)
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve admin frontend in production (if bundled)
app.use(express.static('public'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ CBT Server running on http://0.0.0.0:${PORT}`);
    console.log(`   Admin: http://localhost:${PORT}/admin`);
    console.log(` Students: http://[YOUR_IP]:${PORT}`);
});