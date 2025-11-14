# 🚖 Smart Rickshaw Management System

> **IOTrix - Televerse 1.0 Competition Project**  
> A complete IoT-based rickshaw management system with real-time web dashboard

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Features](#system-features)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Manual Setup Steps](#manual-setup-steps)
7. [Testing the System](#testing-the-system)
8. [Hardware Integration](#hardware-integration)
9. [Competition Requirements](#competition-requirements)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The Smart Rickshaw Management System is an innovative IoT solution that connects passengers with rickshaw pullers through an automated station-based network. The system uses:

- **Hardware**: Ultrasonic sensors, LDR (laser detection), ESP32 microcontroller
- **Cloud**: Firebase Realtime Database
- **Web App**: Real-time dashboard for rickshaw pullers
- **Features**: Laser privilege system, points-based gamification, automated ride matching

### Key Innovation

- **Laser Privilege System**: Users verify their identity using personal laser devices detected by LDR sensors
- **Points-Based Gamification**: Rickshaw pullers earn points for completed rides, encouraging participation
- **Real-time Synchronization**: All data syncs instantly between hardware and web application

---

## ✨ System Features

### For Passengers (Hardware Station)

- ✅ Ultrasonic sensor detects user presence
- ✅ LDR verifies user privilege via laser
- ✅ Button interface for destination selection
- ✅ Buzzer/LED feedback for confirmation
- ✅ Automated ride request creation

### For Rickshaw Pullers (Web Dashboard)

- ✅ Real-time ride request notifications
- ✅ Accept/Reject rides with one click
- ✅ Active ride tracking
- ✅ Confirm pickup and drop-off
- ✅ Points and earnings tracking
- ✅ Ride history with statistics
- ✅ Responsive mobile-friendly interface
- ✅ Live connection status indicator

### System Management

- ✅ Firebase Realtime Database (NoSQL)
- ✅ Multi-station support
- ✅ Distance-based fare calculation
- ✅ Automated point allocation
- ✅ Real-time data synchronization

---

## 🛠️ Technology Stack

### Frontend

- **React 18** - Modern UI library with hooks
- **Vite** - Fast build tool and dev server
- **JavaScript (ES6+)** - Application logic
- **Firebase SDK (v12)** - Real-time database integration
- **CSS3** - Modern styling with CSS Grid & Flexbox
- **Font Awesome** - Icons

### Backend

- **Firebase Realtime Database** - NoSQL cloud database
- **Firebase Hosting** - (Optional) Web app deployment

### Hardware

- **ESP32/ESP8266** - Microcontroller with Wi-Fi
- **Ultrasonic Sensor (HC-SR04)** - User detection
- **LDR (Light Dependent Resistor)** - Laser verification
- **Push Buttons** - User input
- **OLED Display (0.96")** - Rickshaw-side information
- **Buzzer/LEDs** - Feedback indicators

---

## 📁 Project Structure

```
rickshaw-project/
├── README.md                      # This file - complete project overview
├── TESTING_GUIDE.md               # Step-by-step testing instructions
├── SYSTEM_ARCHITECTURE.md         # Detailed technical architecture
├── initial_database.json          # Database initial data (import to Firebase)
├── Rulebook_IOTrix.pdf           # Competition rulebook
│
├── web-app/                       # React Web Application
│   ├── index.html                 # HTML entry point
│   ├── styles.css                 # Global styles
│   ├── package.json               # Dependencies
│   ├── vite.config.js             # Vite configuration
│   └── src/                       # React source files
│       ├── main.jsx               # React entry point
│       ├── App.jsx                # Main app component
│       ├── firebase.js            # Firebase configuration (UPDATE THIS)
│       ├── components/            # React components
│       │   ├── Header.jsx
│       │   ├── StatisticsCards.jsx
│       │   ├── ActiveRide.jsx
│       │   ├── RideRequests.jsx
│       │   ├── RideHistory.jsx
│       │   ├── Footer.jsx
│       │   └── Toast.jsx
│       └── utils/                 # Helper functions
│           └── helpers.js
│
└── hardware/                      # Hardware code
    └── station_module_esp32.ino   # ESP32 station module code
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Firebase account (free tier is sufficient)
- Text editor (VS Code recommended)
- Arduino IDE (for hardware programming)
- Basic understanding of React and JavaScript

### Quick Start (10 Minutes)

1. **Clone/Download Project**

   ```bash
   cd ~/Desktop/Projects/rickshaw-project
   ```

2. **Install Dependencies**

   ```bash
   cd web-app
   npm install
   ```

3. **Set Up Firebase** (See detailed steps below)

   - Create Firebase project
   - Enable Realtime Database
   - Get configuration credentials

4. **Configure Web App**

   - Open `web-app/src/firebase.js`
   - Replace with your Firebase credentials

5. **Import Database**

   - Import `initial_database.json` to Firebase

6. **Start Development Server**
   ```bash
   npm run dev
   ```
   - Opens at `http://localhost:3000`
   - Select a rickshaw from dropdown
   - Start testing!

---

## 📝 Manual Setup Steps

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `smart-rickshaw-system`
4. Enable Google Analytics (recommended)
5. Click **"Create project"**

### Step 2: Enable Realtime Database

1. In Firebase Console, click **"Realtime Database"** from left menu
2. Click **"Create Database"**
3. Choose location: **Asia Southeast (Singapore)** or closest to you
4. Start in **"Test mode"** (we'll secure it later)
5. Click **"Enable"**

### Step 3: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"**
3. Click **Web icon** (</>)
4. Register app with nickname: `rickshaw-dashboard`
5. **Copy the configuration object** - it looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123",
};
```

### Step 4: Install Dependencies

1. Open terminal and navigate to web-app folder:

```bash
cd web-app
npm install
```

2. Wait for installation to complete (2-3 minutes)

### Step 5: Update Web App Configuration

1. Open `web-app/src/firebase.js` in your text editor
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-messaging-id",
  appId: "your-app-id",
};
```

3. Save the file

### Step 6: Import Initial Database

1. In Firebase Console, go to **Realtime Database**
2. Click the **⋮** (three dots) menu at the database root
3. Select **"Import JSON"**
4. Choose `initial_database.json` from project folder
5. Click **"Import"**

✅ Your database now has:

- 3 stations
- 2 users
- 2 rickshaws
- Fare matrix
- System configuration

### Step 7: Run the React App

1. In terminal (inside web-app folder), run:
   ```bash
   npm run dev
   ```
2. App automatically opens at `http://localhost:3000`
3. Check connection status in footer (should show "Connected")
4. Select "Karim Ahmed (DH-RICK-001)" from dropdown
5. You should see the dashboard with statistics!

### Production Build

To create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

## 🧪 Testing the System

For comprehensive step-by-step testing instructions, see **[TESTING_GUIDE.md](TESTING_GUIDE.md)**.

### Quick Test (5 minutes)

1. **Create a Ride Request** in Firebase Console:

```json
{
  "id": "test_1",
  "user_id": "user_1",
  "pickup_station": "station_1",
  "dropoff_station": "station_2",
  "distance_km": 2.5,
  "estimated_fare": 40,
  "estimated_points": 8,
  "privilege_verified": true,
  "status": "pending",
  "timestamp": "2025-11-14T12:00:00Z"
}
```

2. **Accept the Ride** on your dashboard
3. **Confirm Pickup** 
4. **Confirm Drop-off**
5. **Verify** points increased by 8

✅ **For full testing**: Follow the comprehensive **[TESTING_GUIDE.md](TESTING_GUIDE.md)** with 22 detailed test cases covering all features.

---

## 🔌 Hardware Integration

### ESP32 Station Module

**Purpose**: Detect users, verify privilege, send ride requests

**Components**:

- ESP32 board
- HC-SR04 Ultrasonic sensor
- LDR sensor
- Push buttons (for destination selection)
- LEDs/Buzzer

**Code Overview** (Arduino):

```cpp
#include <WiFi.h>
#include <FirebaseESP32.h>

// WiFi & Firebase config
#define WIFI_SSID "YourWiFi"
#define WIFI_PASSWORD "YourPassword"
#define FIREBASE_HOST "your-project-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "your-database-secret"

void createRideRequest() {
    FirebaseJson json;
    json.set("pickup_station", "station_1");
    json.set("dropoff_station", "station_2");
    json.set("status", "pending");
    json.set("timestamp", getTimestamp());

    Firebase.push(firebaseData, "/ride_requests", json);
}
```

### ESP32 Rickshaw Module

**Purpose**: Display ride information on OLED

**Components**:

- ESP32 board
- 0.96" OLED Display (I2C)

**Features**:

- Shows incoming ride requests
- Displays pickup/dropoff locations
- Shows fare and points
- Updates in real-time from Firebase

---

## 📊 Competition Requirements Met

### Hardware Simulation (30%)

- ✅ ESP32 with sensors
- ✅ Circuit simulation ready (Tinkercad/Proteus/Wokwi)
- ✅ Wi-Fi communication to Firebase
- ✅ Real-time data exchange

### Database Design (20%)

- ✅ Well-structured Firebase schema
- ✅ Normalized data relationships
- ✅ Efficient queries with indexing
- ✅ Real-time synchronization

### Web Dashboard & Visualization (20%)

- ✅ Modern, responsive UI
- ✅ Real-time updates
- ✅ Data visualization (statistics)
- ✅ User-friendly interface

### Documentation (15%)

- ✅ Comprehensive README
- ✅ System architecture document
- ✅ Setup guide
- ✅ Code comments

### Innovation (15%)

- ✅ Laser privilege verification system
- ✅ Points-based gamification
- ✅ Real-time ride matching
- ✅ Scalable cloud architecture

---

## 🐛 Troubleshooting

### Issue: "Permission Denied" in Firebase

**Solution**:

1. Go to Firebase Console → Realtime Database → Rules
2. Set rules to:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

3. Click **"Publish"**

### Issue: Web App Shows "Disconnected"

**Solution**:

1. Check `src/firebase.js` has correct credentials
2. Verify Firebase project is active
3. Check browser console for errors (F12)
4. Ensure Realtime Database is enabled
5. Make sure development server is running (`npm run dev`)

### Issue: No Rickshaws in Dropdown

**Solution**:

1. Check Firebase Database has `rickshaws` node
2. Import `initial_database.json` again
3. Refresh the page

### Issue: Requests Not Appearing

**Solution**:

1. Select a rickshaw from dropdown first
2. Check Firebase rules allow read access
3. Verify `ride_requests` node exists in database

---

## 📺 Video Demo Guidelines

For Phase 1 submission, record a 5-minute video showing:

1. **Firebase Database** (30 sec)

   - Show database structure
   - Explain data relationships

2. **Web Dashboard** (2 min)

   - Demonstrate rickshaw selection
   - Show statistics
   - Accept/reject requests
   - Confirm pickup/dropoff

3. **Hardware Simulation** (1.5 min)

   - Show circuit diagram
   - Demonstrate sensors
   - Show OLED display
   - Wi-Fi connection to Firebase

4. **System Integration** (1 min)
   - Create request from hardware
   - Show real-time sync to web
   - Complete full ride cycle

---

## 🎯 Test Cases Overview

The system includes 22 comprehensive test cases across 10 phases:

- ✅ **Setup Verification** - Firebase connection, database structure
- ✅ **Ride Requests** - Creating and displaying requests
- ✅ **Accept/Reject** - Request handling
- ✅ **Ride Workflow** - Complete pickup to drop-off cycle
- ✅ **History** - Viewing completed rides
- ✅ **Real-time Sync** - Multi-tab and live updates
- ✅ **Switching** - Multiple rickshaws management
- ✅ **Responsive Design** - Mobile and tablet views
- ✅ **Edge Cases** - Error handling and validation
- ✅ **Integration** - End-to-end user scenarios

📖 **See [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed testing instructions**

---

## 📞 Support & Resources

### Documentation

- **[README.md](README.md)** (This file) - Complete project overview and setup
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive step-by-step testing instructions
- **[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)** - Detailed technical architecture

### External Resources

- [Firebase Documentation](https://firebase.google.com/docs/database)
- [ESP32 Firebase Library](https://github.com/mobizt/Firebase-ESP32)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)

### Contact

- **Competition**: IOTrix - Televerse 1.0
- **Email**: eteteleverse@gmail.com
- **Website**: https://eteteleverse.com

---

## 🏆 Competition Timeline

- **Phase 1 Submission**: November 15, 2025 (11:59 PM)
- **Results**: November 16, 2025 (8:30 PM)
- **Phase 2 (Onsite)**: November 21, 2025

---

## 📜 License

This project is created for educational purposes as part of the IOTrix competition.

---

## 🙏 Acknowledgments

- **Department of ETE, CUET** - For organizing IOTrix
- **Firebase** - Real-time database platform
- **ESP32 Community** - Hardware support and libraries

---

**Built with ❤️ for IOTrix - Televerse 1.0**

_"Decode the Matrix, Recode the World"_

---

## 🚀 Next Steps

1. ✅ Complete Firebase setup (follow manual steps above)
2. ✅ Test web dashboard with sample data
3. ⏳ Build hardware circuit (breadboard)
4. ⏳ Program ESP32 modules
5. ⏳ Test end-to-end integration
6. ⏳ Record demo video
7. ⏳ Prepare documentation PDF
8. ⏳ Submit to competition portal

**Good luck with your submission! 🎉**
