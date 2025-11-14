# 🧪 Step-by-Step Testing Guide

## Smart Rickshaw Management System

---

## 📋 Overview

This guide will walk you through testing your Smart Rickshaw System from setup to full operation. Follow each step in order and check off items as you complete them.

**Estimated Time**: 60-90 minutes  
**Prerequisites**: Firebase project created, web app running

---

## ✅ Pre-Testing Checklist

Before starting tests, ensure:

- [ ] Node.js installed (v16+)
- [ ] Firebase project created
- [ ] `initial_database.json` imported to Firebase
- [ ] `web-app/src/firebase.js` configured with your Firebase credentials
- [ ] Web app running (`npm run dev` in web-app folder)
- [ ] Browser developer console open (F12)

---

## 📍 PHASE 1: Initial Setup Verification (10 minutes)

### Test 1.1: Firebase Connection

**Purpose**: Verify the web app connects to Firebase successfully

**Steps**:

1. Open your web app in browser (`http://localhost:3000` or `http://localhost:5173`)
2. Look at the footer of the page
3. Check the connection status indicator

**Expected Results**:

- ✅ Footer shows "🟢 Connected" with green dot
- ✅ No errors in browser console (F12)
- ✅ Firebase SDK initialized successfully

**If Failed**:

- Check `web-app/src/firebase.js` has correct credentials
- Verify Firebase Realtime Database is enabled
- Check internet connection

**Status**: [ ] Pass [ ] Fail

---

### Test 1.2: Database Structure

**Purpose**: Verify database has correct initial data

**Steps**:

1. Open Firebase Console → Realtime Database
2. Verify the following nodes exist:
   - `stations` (should have 3 stations)
   - `users` (should have 2 users)
   - `rickshaws` (should have 2 rickshaws)
   - `fare_matrix` (should have route data)
   - `system_config`

**Expected Results**:

- ✅ All 5 nodes present
- ✅ Data matches `initial_database.json` structure
- ✅ No missing fields

**Status**: [ ] Pass [ ] Fail

---

### Test 1.3: Rickshaw Selection

**Purpose**: Verify rickshaw dropdown loads and works

**Steps**:

1. On the dashboard, locate the rickshaw dropdown at the top
2. Click the dropdown
3. Select "Karim Ahmed (DH-RICK-001)"

**Expected Results**:

- ✅ Dropdown shows both rickshaws
- ✅ Selecting a rickshaw displays their statistics
- ✅ Status shows "Available" with green dot
- ✅ Points, rides, earnings displayed correctly

**Actual Values for rickshaw_1**:

- Total Points: 450
- Total Rides: 28
- Total Earnings: ৳2,250 (450 × 5)
- Rating: ⭐ 4.7

**Status**: [ ] Pass [ ] Fail

---

## 🎯 PHASE 2: Ride Request Testing (15 minutes)

### Test 2.1: Create Ride Request Manually

**Purpose**: Simulate hardware by creating a ride request in Firebase

**Steps**:

1. Open Firebase Console → Realtime Database
2. Navigate to `ride_requests` node
3. Click the **"+"** button to add a new child
4. Name it: `test_request_1`
5. Click **"+"** again and paste this JSON:

```json
{
  "id": "test_request_1",
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

6. Go back to your web dashboard

**Expected Results**:

- ✅ Request appears in "Incoming Ride Requests" section within 2 seconds
- ✅ Request shows correct details:
  - Pickup: Station A (or station_1 name)
  - Dropoff: Station B (or station_2 name)
  - Distance: 2.5 km
  - Fare: ৳40
  - Points: +8
- ✅ "Accept Ride" and "Reject" buttons visible
- ✅ Time indicator shows "Just now" or similar

**Status**: [ ] Pass [ ] Fail

---

### Test 2.2: Multiple Simultaneous Requests

**Purpose**: Test handling of multiple ride requests

**Steps**:

1. Create a second request named `test_request_2`:

```json
{
  "id": "test_request_2",
  "user_id": "user_2",
  "pickup_station": "station_2",
  "dropoff_station": "station_3",
  "distance_km": 1.5,
  "estimated_fare": 30,
  "estimated_points": 6,
  "privilege_verified": true,
  "status": "pending",
  "timestamp": "2025-11-14T12:05:00Z"
}
```

2. Create a third request named `test_request_3`:

```json
{
  "id": "test_request_3",
  "user_id": "user_1",
  "pickup_station": "station_1",
  "dropoff_station": "station_3",
  "distance_km": 3.5,
  "estimated_fare": 50,
  "estimated_points": 10,
  "privilege_verified": true,
  "status": "pending",
  "timestamp": "2025-11-14T12:10:00Z"
}
```

**Expected Results**:

- ✅ All 3 requests appear on dashboard
- ✅ Each request shows correct details
- ✅ Requests are distinguishable from each other
- ✅ No performance issues or lag

**Status**: [ ] Pass [ ] Fail

---

## ✅ PHASE 3: Accept & Reject Testing (10 minutes)

### Test 3.1: Accept Ride Request

**Purpose**: Test accepting a ride request

**Steps**:

1. Click **"Accept Ride"** on `test_request_1` (station_1 → station_2)
2. Observe the UI changes
3. Check Firebase Database → `ride_requests` → `test_request_1`

**Expected Results**:

- ✅ Request disappears from "Incoming Requests" section
- ✅ Request appears in "Active Ride" section
- ✅ Active ride shows:
  - Route: Station A → Station B (with arrow)
  - Distance: 2.5 km
  - Fare: ৳40
  - Points: +8
- ✅ "Confirm Pickup" button visible
- ✅ Rickshaw status changes to "On Ride" (yellow dot)
- ✅ In Firebase, `test_request_1`:
  - `status` = "accepted"
  - `rickshaw_id` = "rickshaw_1" (or your selected rickshaw)
  - `accept_time` is set
- ✅ Toast notification: "Ride accepted successfully!"

**Status**: [ ] Pass [ ] Fail

---

### Test 3.2: Reject Ride Request

**Purpose**: Test rejecting a ride request

**Steps**:

1. Click **"Reject"** on `test_request_2` (station_2 → station_3)
2. Observe the changes

**Expected Results**:

- ✅ Request disappears from "Incoming Requests"
- ✅ Toast notification: "Request rejected"
- ✅ In Firebase, `test_request_2`:
  - `status` = "rejected"
- ✅ Rickshaw status remains "Available"
- ✅ Active ride still shows only `test_request_1`

**Status**: [ ] Pass [ ] Fail

---

## 🚗 PHASE 4: Complete Ride Workflow (15 minutes)

### Test 4.1: Confirm Pickup

**Purpose**: Test pickup confirmation

**Steps**:

1. Ensure you have an active ride from Test 3.1
2. Click **"Confirm Pickup"** button
3. Check Firebase and UI

**Expected Results**:

- ✅ Toast notification: "Pickup confirmed"
- ✅ Button changes to **"Confirm Drop-off"**
- ✅ In Firebase, `test_request_1`:
  - `status` = "in_progress"
  - `pickup_time` is set (ISO timestamp)
- ✅ Ride remains in "Active Ride" section
- ✅ Rickshaw status still "On Ride"

**Status**: [ ] Pass [ ] Fail

---

### Test 4.2: Confirm Drop-off & Complete Ride

**Purpose**: Test ride completion and points crediting

**Before Test - Note Current Values**:

- Current Total Points: \***\*\_\_\_\*\***
- Current Total Rides: \***\*\_\_\_\*\***
- Current Total Earnings: \***\*\_\_\_\*\***

**Steps**:

1. Click **"Confirm Drop-off"** button
2. Observe all changes

**Expected Results**:

- ✅ Toast notification: "Ride completed! +8 points earned"
- ✅ Active ride section disappears
- ✅ Rickshaw status returns to "Available" (green dot)
- ✅ Statistics updated:
  - Total Points: Previous + 8
  - Total Rides: Previous + 1
  - Total Earnings: Previous + ৳40
- ✅ In Firebase → `rickshaws` → `rickshaw_1`:
  - `total_points` increased by 8
  - `total_rides` increased by 1
  - `status` = "available"
- ✅ In Firebase → `ride_requests` → `test_request_1`:
  - `status` = "completed"
  - `dropoff_time` is set
- ✅ A new entry created in `rides` node with complete ride data

**Status**: [ ] Pass [ ] Fail

---

### Test 4.3: Complete Second Ride (Full Workflow)

**Purpose**: Test complete ride cycle with remaining request

**Steps**:

1. Accept `test_request_3` (station_1 → station_3, 3.5 km, ৳50, +10 points)
2. Click "Confirm Pickup"
3. Click "Confirm Drop-off"
4. Verify all statistics and database updates

**Expected Results**:

- ✅ Full workflow completes smoothly
- ✅ Points increase by 10 (now Previous + 18 from both rides)
- ✅ Earnings increase by ৳50 (now Previous + ৳90)
- ✅ Total rides increase by 1 (now Previous + 2)
- ✅ Status returns to "Available"

**Status**: [ ] Pass [ ] Fail

---

## 📊 PHASE 5: Ride History Testing (10 minutes)

### Test 5.1: View Ride History

**Purpose**: Verify completed rides appear in history

**Steps**:

1. Scroll to "Ride History" section
2. Click **"Refresh"** button if available
3. Check the displayed rides

**Expected Results**:

- ✅ At least 2 completed rides displayed
- ✅ Each ride shows:
  - Route (Pickup → Dropoff)
  - Distance
  - Fare
  - Points earned
  - Completion timestamp
- ✅ Rides sorted by completion time (newest first)
- ✅ Data matches what was completed in Phase 4

**Ride 1 Details**:

- Route: Station A → Station B
- Distance: 2.5 km
- Fare: ৳40
- Points: +8

**Ride 2 Details**:

- Route: Station A → Station C
- Distance: 3.5 km
- Fare: ৳50
- Points: +10

**Status**: [ ] Pass [ ] Fail

---

### Test 5.2: History Persistence

**Purpose**: Verify history persists after page refresh

**Steps**:

1. Note the number of rides in history
2. Refresh the page (F5 or Ctrl+R)
3. Select the same rickshaw
4. Scroll to Ride History

**Expected Results**:

- ✅ Same number of rides displayed
- ✅ No data loss
- ✅ All details intact

**Status**: [ ] Pass [ ] Fail

---

## 🔄 PHASE 6: Real-time Synchronization (10 minutes)

### Test 6.1: Multi-Tab Sync

**Purpose**: Verify real-time sync across browser tabs

**Steps**:

1. Open your dashboard in a **second browser tab** (Ctrl+T, paste URL)
2. In **both tabs**, select the same rickshaw
3. Create a new ride request in Firebase:

```json
{
  "id": "test_request_sync",
  "user_id": "user_1",
  "pickup_station": "station_2",
  "dropoff_station": "station_1",
  "distance_km": 2.5,
  "estimated_fare": 40,
  "estimated_points": 8,
  "privilege_verified": true,
  "status": "pending",
  "timestamp": "2025-11-14T13:00:00Z"
}
```

4. In **Tab 1**, click "Accept Ride"
5. Immediately check **Tab 2**

**Expected Results**:

- ✅ Request appears in both tabs simultaneously
- ✅ When accepted in Tab 1, it disappears from Tab 2's pending list
- ✅ Active ride appears in both tabs
- ✅ Both tabs show identical data at all times
- ✅ Updates happen within 1-2 seconds

**Status**: [ ] Pass [ ] Fail

---

### Test 6.2: Direct Database Edit

**Purpose**: Test dashboard updates when Firebase edited directly

**Steps**:

1. With an active ride displayed, go to Firebase Console
2. Navigate to `rickshaws` → `rickshaw_1` → `total_points`
3. Edit the value (add 100 to current value)
4. Go back to your dashboard

**Expected Results**:

- ✅ Total Points updates automatically without refresh
- ✅ Total Earnings updates accordingly (points × 5)
- ✅ Update happens within 1-2 seconds
- ✅ No page refresh needed

**Note**: Change the points back to correct value after test

**Status**: [ ] Pass [ ] Fail

---

### Test 6.3: Connection Loss & Recovery

**Purpose**: Test offline behavior

**Steps**:

1. Dashboard connected and showing "Connected"
2. Disconnect internet (turn off WiFi or unplug ethernet)
3. Wait 5 seconds
4. Observe footer status
5. Reconnect internet
6. Wait 5 seconds

**Expected Results**:

- ✅ Status changes to "🔴 Disconnected" when offline
- ✅ Status returns to "🟢 Connected" when online
- ✅ Auto-reconnection without refresh
- ✅ Data re-syncs after reconnection

**Status**: [ ] Pass [ ] Fail

---

## 🎛️ PHASE 7: Rickshaw Switching (5 minutes)

### Test 7.1: Switch Between Rickshaws

**Purpose**: Verify data isolation between rickshaws

**Steps**:

1. Select "Karim Ahmed (DH-RICK-001)" - note statistics
2. Select "Rahim Khan (DH-RICK-002)" - note statistics
3. Switch back to "Karim Ahmed"

**Expected Results**:

- ✅ Each rickshaw shows their own unique statistics
- ✅ Points, rides, earnings different for each
- ✅ No data mixing or leakage
- ✅ Smooth switching without errors
- ✅ Correct data persists when switching back

**Rickshaw 1 (Initial)**:

- Puller: Karim Ahmed
- Points: 450
- Rides: 28
- Status: Available

**Rickshaw 2 (Initial)**:

- Puller: Rahim Khan
- Points: 320
- Rides: 22
- Status: Available

**Status**: [ ] Pass [ ] Fail

---

## 📱 PHASE 8: Responsive Design Testing (10 minutes)

### Test 8.1: Mobile View (375px)

**Purpose**: Test mobile responsiveness

**Steps**:

1. Open Chrome DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select "iPhone SE" or set width to 375px
4. Navigate through all features

**Expected Results**:

- ✅ Layout adapts to mobile screen
- ✅ No horizontal scrolling
- ✅ All buttons are accessible and tappable
- ✅ Text is readable
- ✅ Cards stack vertically
- ✅ Dropdown works on mobile
- ✅ Statistics cards responsive

**Status**: [ ] Pass [ ] Fail

---

### Test 8.2: Tablet View (768px)

**Purpose**: Test tablet responsiveness

**Steps**:

1. In DevTools, select "iPad Mini" or set width to 768px
2. Test all features

**Expected Results**:

- ✅ Layout appropriate for tablet
- ✅ Good use of screen space
- ✅ All features functional

**Status**: [ ] Pass [ ] Fail

---

## 🐛 PHASE 9: Edge Cases & Error Handling (10 minutes)

### Test 9.1: Rapid Button Clicking

**Purpose**: Test against duplicate actions

**Steps**:

1. Create a ride request
2. Rapidly click "Accept Ride" button 5 times quickly
3. Check Firebase

**Expected Results**:

- ✅ Only ONE ride accepted
- ✅ Button disabled after first click
- ✅ No errors in console
- ✅ No duplicate data in Firebase

**Status**: [ ] Pass [ ] Fail

---

### Test 9.2: No Rickshaw Selected

**Purpose**: Test behavior without rickshaw selection

**Steps**:

1. Refresh page
2. Don't select any rickshaw
3. Create a ride request
4. Observe dashboard

**Expected Results**:

- ✅ Dashboard shows empty state or instruction
- ✅ No crashes or errors
- ✅ Request doesn't appear until rickshaw selected

**Status**: [ ] Pass [ ] Fail

---

### Test 9.3: Invalid Request Data

**Purpose**: Test handling of malformed data

**Steps**:

1. Create a ride request with missing fields:

```json
{
  "id": "test_invalid",
  "pickup_station": "station_1",
  "status": "pending"
}
```

2. Observe dashboard behavior

**Expected Results**:

- ✅ Dashboard doesn't crash
- ✅ Either ignores invalid request or shows with defaults
- ✅ Error logged in console (acceptable)
- ✅ Other requests still work

**Status**: [ ] Pass [ ] Fail

---

## 🏁 PHASE 10: Final Integration Test (15 minutes)

### Test 10.1: Complete User Story Simulation

**Purpose**: End-to-end test simulating real-world usage

**Scenario**: A rickshaw puller's typical day

**Steps**:

1. **Morning Start**:

   - [ ] Open dashboard
   - [ ] Select your rickshaw
   - [ ] Check you're at station_1 (available)

2. **First Ride**:

   - [ ] Create request: station_1 → station_2 (2.5km, ৳40, +8 points)
   - [ ] Accept ride
   - [ ] Confirm pickup
   - [ ] Confirm dropoff
   - [ ] Verify +8 points credited

3. **Second Ride**:

   - [ ] Create request: station_2 → station_3 (1.5km, ৳30, +6 points)
   - [ ] Accept ride
   - [ ] Confirm pickup
   - [ ] Confirm dropoff
   - [ ] Verify +6 points credited (total +14)

4. **Third Ride**:

   - [ ] Create request: station_3 → station_1 (3.5km, ৳50, +10 points)
   - [ ] Accept ride
   - [ ] Confirm pickup
   - [ ] Confirm dropoff
   - [ ] Verify +10 points credited (total +24)

5. **End of Day**:
   - [ ] Check ride history shows 3 completed rides
   - [ ] Verify total points increased by 24
   - [ ] Verify total earnings increased by ৳120
   - [ ] Verify total rides increased by 3
   - [ ] Status shows "Available"

**Expected Results**:

- ✅ All rides completed successfully
- ✅ Cumulative statistics accurate
- ✅ Full ride history visible
- ✅ No errors throughout entire flow
- ✅ Smooth, professional experience

**Status**: [ ] Pass [ ] Fail

---

## 📸 PHASE 11: Screenshot Documentation (Optional)

Take screenshots for documentation/submission:

- [ ] Dashboard initial state (rickshaw selected, statistics visible)
- [ ] Incoming ride request
- [ ] Active ride section
- [ ] Completed ride with statistics update
- [ ] Ride history with multiple entries
- [ ] Mobile responsive view
- [ ] Firebase database structure
- [ ] Connection status (connected/disconnected)

---

## ✅ Test Summary

### Overall Results

**Date Tested**: **\*\*\*\***\_\_\_**\*\*\*\***  
**Tester Name**: **\*\*\*\***\_\_\_**\*\*\*\***  
**Environment**: Browser: \***\*\_\_\*\*** , OS: \***\*\_\_\*\***

**Test Results**:

| Phase                  | Tests  | Passed | Failed | Pass Rate |
| ---------------------- | ------ | ------ | ------ | --------- |
| Phase 1: Setup         | 3      | **\_** | **\_** | **\_**%   |
| Phase 2: Requests      | 2      | **\_** | **\_** | **\_**%   |
| Phase 3: Accept/Reject | 2      | **\_** | **\_** | **\_**%   |
| Phase 4: Ride Flow     | 3      | **\_** | **\_** | **\_**%   |
| Phase 5: History       | 2      | **\_** | **\_** | **\_**%   |
| Phase 6: Sync          | 3      | **\_** | **\_** | **\_**%   |
| Phase 7: Switching     | 1      | **\_** | **\_** | **\_**%   |
| Phase 8: Responsive    | 2      | **\_** | **\_** | **\_**%   |
| Phase 9: Edge Cases    | 3      | **\_** | **\_** | **\_**%   |
| Phase 10: Integration  | 1      | **\_** | **\_** | **\_**%   |
| **TOTAL**              | **22** | **\_** | **\_** | **\_**%   |

**Overall Status**: [ ] All Tests Passed [ ] Passed with Minor Issues [ ] Failed

---

## 🐛 Issues Found

Document any issues found during testing:

| Test # | Issue Description | Severity | Status | Notes |
| ------ | ----------------- | -------- | ------ | ----- |
|        |                   |          |        |       |
|        |                   |          |        |       |
|        |                   |          |        |       |

**Severity Levels**:

- **Critical**: System doesn't work
- **High**: Major feature broken
- **Medium**: Feature works but has issues
- **Low**: Minor cosmetic issues

---

## 🎯 Testing Best Practices

1. **Test in Order**: Follow phases sequentially for best results
2. **Clean State**: Consider resetting database between major test phases
3. **Document Everything**: Note any unexpected behavior
4. **Check Console**: Always monitor browser console (F12) for errors
5. **Cross-Browser**: Test on Chrome, Firefox, and Safari if possible
6. **Network Speed**: Test on both fast and slow connections
7. **Screenshots**: Capture evidence of successful tests

---

## 🔧 Troubleshooting

### Common Issues

**Issue**: Requests not appearing  
**Solution**:

- Verify rickshaw is selected
- Check Firebase rules allow read access
- Ensure request status is "pending"

**Issue**: Points not updating  
**Solution**:

- Check Firebase rules allow write access
- Verify atomic update in firebase.js
- Check browser console for errors

**Issue**: Disconnected status  
**Solution**:

- Verify firebase.js credentials
- Check internet connection
- Ensure Firebase project is active

**Issue**: Statistics wrong  
**Solution**:

- Re-import initial_database.json
- Clear browser cache
- Check calculation logic in helpers.js

---

## 🎉 Completion

Congratulations! If you've completed all tests successfully, your Smart Rickshaw System is ready for:

- ✅ Demo video recording
- ✅ Competition submission
- ✅ Production deployment
- ✅ User acceptance testing

**Next Steps**:

1. Fix any failed tests
2. Retest failed scenarios
3. Record demo video
4. Prepare documentation
5. Submit to competition

---

**Document Version**: 1.0  
**Last Updated**: November 14, 2025  
**IOTrix - Televerse 1.0 Competition**

---

**Good luck with your testing! 🚀**
