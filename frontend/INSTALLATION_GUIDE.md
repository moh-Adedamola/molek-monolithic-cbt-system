# 🎓 Molek CBT System - Installation Guide for ICT Staff

## System Requirements

### Minimum Requirements:
- **Operating System:** Windows 10 or Windows 11 (64-bit)
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 2GB free disk space (+ space for archives)
- **Network:** Wi-Fi router or switch (for connecting student PCs)
- **Internet:** Only needed for initial download and updates

### Software Requirements:
- Modern web browser (Chrome, Edge, or Firefox) installed on student computers
- Windows Defender Firewall configured to allow the application

---

## Installation Steps

### Step 1: Download the Installer

1. Download **MolekCBT Setup 1.0.0.exe** from the provided link or USB drive
2. File size is approximately 150MB
3. Save to Downloads folder or Desktop

### Step 2: Install the Application

1. **Double-click** `MolekCBT Setup 1.0.0.exe`
2. If Windows SmartScreen appears:
    - Click "More info"
    - Click "Run anyway"
3. Follow the installation wizard:
    - Click **Next**
    - Choose installation location (default: `C:\Program Files\Molek CBT System`)
    - Click **Install**
    - Wait for installation to complete (may take 2-3 minutes)
4. Click **Finish**

### Step 3: First Launch

1. The application will launch automatically after installation
2. **First-time setup will run:**
    - Installing required components (1-2 minutes)
    - Initializing database
    - Creating necessary folders
3. Wait for message: **"Setup complete! Starting CBT System..."**
4. The application window will open automatically

### Step 4: Verify Installation

1. You should see the **Admin Dashboard**
2. Check that these folders exist:
    - Archives: `Documents\MolekCBT_Archives`
    - Data: `C:\Users\[YourName]\AppData\Roaming\molek-cbt\data`

---

## Network Setup for Student Access

### Configure Server Computer:

1. **Open Molek CBT System** on the server/admin computer
2. Go to **Network Setup** in the admin panel
3. Note the **Server Address** (e.g., `http://192.168.1.100:5000`)

### Configure Windows Firewall:

1. Open **Windows Defender Firewall**
2. Click **"Allow an app or feature through Windows Defender Firewall"**
3. Click **"Change settings"** (requires admin rights)
4. Scroll down and find **"Molek CBT System"** or **"Node.js"**
5. Check BOTH boxes: ☑ Private ☑ Public
6. Click **OK**

**Alternative Method (Manual Port Allow):**
1. Open **Windows Defender Firewall**
2. Click **"Advanced settings"**
3. Click **"Inbound Rules"** → **"New Rule"**
4. Select **Port** → Next
5. Select **TCP**, Specific local ports: **5000** → Next
6. Select **Allow the connection** → Next
7. Check all profiles → Next
8. Name: **Molek CBT Port** → Finish

### Connect Student Computers:

1. Ensure all student PCs are on the **same Wi-Fi network** as the server
2. Open a web browser (Chrome/Edge/Firefox) on student PC
3. Type the server address: `http://192.168.1.100:5000` (use your actual address)
4. Students will see the exam login page
5. Students login with their exam codes and passwords

**Test Connection:**
- From server computer, open browser and go to: `http://localhost:5000`
- Should see the exam login page

---

## Daily Usage

### Starting the System:

1. Double-click **Molek CBT System** icon on desktop
2. Wait for application to load (10-20 seconds)
3. Admin panel opens automatically
4. Students can now connect from their computers

### Stopping the System:

1. Close the application window
2. Or right-click system tray icon → Exit

---

## Managing Terms (End of Term Process)

### End of Term:

1. Go to **Archive Management** in admin panel
2. Enter term name (e.g., "Term 1 2024")
3. Click **"Archive Term"**
4. Wait for confirmation message
5. Verify archive created in: `Documents\MolekCBT_Archives\term_1_2024\`

### Start New Term:

1. After archiving, click **"Reset Database for New Term"**
2. Confirm the action (WARNING: This deletes all current data!)
3. Upload new student list:
    - Go to **Student Management**
    - Click **"Bulk Upload"**
    - Select CSV file with new students
    - New exam codes will be generated automatically
4. Upload new questions:
    - Go to **Question Bank**
    - Upload question CSV files
5. Configure and activate exams

---

## Updating the Application

### When Internet is Available:

1. Open Molek CBT System
2. If an update is available, you'll see a notification
3. Click **"Download Update"**
4. Wait for download to complete
5. Click **"Restart and Install"**
6. Application will restart with new version

### Manual Update:

1. Download new installer: `MolekCBT Setup X.X.X.exe`
2. Close running application
3. Run new installer
4. Choose **"Update"** when prompted
5. Your data and archives are preserved

---

## Backup & Data Management

### Automatic Backups:
- Archives are automatically created when you use **Archive Management**
- Location: `Documents\MolekCBT_Archives\`
- Each archive contains:
    - Complete database backup (.db file)
    - Student records (CSV)
    - Exam results (CSV)
    - Questions (CSV)
    - Summary report (TXT)

### Manual Backup (Optional):
1. Close Molek CBT System
2. Copy this folder: `C:\Users\[YourName]\AppData\Roaming\molek-cbt\`
3. Paste to external drive or cloud storage
4. Label with date: `molek-cbt-backup-2024-11-15`

### Restoring from Backup:
1. Close Molek CBT System
2. Navigate to: `C:\Users\[YourName]\AppData\Roaming\molek-cbt\data\`
3. Replace `cbt.db` with backup database file
4. Restart Molek CBT System

---

## Troubleshooting

### Application Won't Start:

**Solution 1:** Check if port 5000 is in use
- Open Command Prompt (cmd)
- Type: `netstat -ano | findstr :5000`
- If a program is using port 5000, close it or restart computer

**Solution 2:** Reinstall application
- Uninstall from Control Panel → Programs
- Delete folder: `C:\Program Files\Molek CBT System`
- Reinstall using setup file

### Students Can't Connect:

**Check 1:** Same network?
- Server and students must be on same Wi-Fi

**Check 2:** Firewall blocking?
- Follow firewall configuration steps above

**Check 3:** Correct address?
- Verify IP address in Network Setup page
- Try different network adapter if available

**Check 4:** Server running?
- Make sure Molek CBT System is open on server computer

### Database Error:

**Solution:** Reset database
1. Close application
2. Delete: `C:\Users\[YourName]\AppData\Roaming\molek-cbt\data\cbt.db`
3. Restart application
4. Database will be recreated

### Archives Not Saving:

**Check:** Folder permissions
1. Navigate to: `Documents\MolekCBT_Archives\`
2. Right-click folder → Properties → Security
3. Ensure you have "Full control"

---

## Important Notes

### Security:
- ✅ Admin panel access is open on server computer only
- ✅ Students can only access exam login page from network
- ✅ Exam codes and passwords are required for students
- ⚠️ Keep server computer secure and supervised

### Performance:
- ✅ Supports 100+ concurrent students (tested)
- ✅ No internet lag (fully offline after setup)
- ⚠️ Ensure server computer remains on during exams

### Data Protection:
- ✅ Always archive before resetting
- ✅ Keep external backup of archives folder
- ✅ Test archive restoration periodically

---

## Contact Support

For technical issues:
- Email: [belloafeez28@gmail.com || Adedamola13@gmail.com]
- Phone: [09014465194]

For system updates:
- Check the admin panel for update notifications
- Or contact support for manual update files

---

## Quick Reference Card

### Daily Checklist:
- [ ] Start Molek CBT System
- [ ] Verify network address in Network Setup
- [ ] Test student access from one computer
- [ ] Monitor dashboard during exams
- [ ] Keep application running throughout exam period

### End of Term Checklist:
- [ ] Go to Archive Management
- [ ] Enter term name and click Archive
- [ ] Verify archive was created successfully
- [ ] Click Reset Database for New Term
- [ ] Upload new students
- [ ] Upload new questions
- [ ] Test with sample student login

---

**Last Updated:** November 2025  
**Version:** 1.0.0