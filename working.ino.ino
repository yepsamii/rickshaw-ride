/*
 * ESP32 Ride Request System - Firebase Version
 * 
 * Components:
 * - Ultrasonic Sensor (HC-SR04): TRIG 5, ECHO 18
 * - LDR: PIN 34
 * - Button: PIN 19
 * - Buzzer: PIN 21
 * - LEDs: LED1-25, LED2-26, LED3-27
 * 
 * Library Required: 
 * - NewPing (Install from Library Manager)
 * - Firebase ESP Client (Install from Library Manager)
 * 
 * Features:
 * - NTP Time Synchronization for accurate timestamps
 * - Auto-rejection prevention (60-second timeout check)
 */

#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <WiFi.h>
#include <NewPing.h>
#include <time.h>
 
 // Firebase Configuration
 #define API_KEY "AIzaSyCyPJA1r5HQKGPKT_xRPio1Yzafgu1pxAI" 
 #define DATABASE_URL "https://rickshaw-ride-c5683-default-rtdb.asia-southeast1.firebasedatabase.app"
 
// WiFi Credentials
const char* ssid = "Nothing";
const char* password = "niloy523099";

// NTP Time Configuration
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 6 * 3600; // GMT+6 for Bangladesh
const int daylightOffset_sec = 0;
 
 // Pin Definitions
 #define TRIG_PIN 5
 #define ECHO_PIN 18
 #define LDR_PIN 34
 #define BUTTON_PIN 19
 #define BUZZER_PIN 21
 #define LED1_PIN 25  // Status LED
 #define LED2_PIN 26  // Privilege LED
 #define LED3_PIN 27  // Request LED
 #define MAX_DISTANCE 400
 
 // Firebase objects
 FirebaseData fbdo;
 FirebaseAuth auth;
 FirebaseConfig config;
 
 // Initialize sensors
 NewPing sonar(TRIG_PIN, ECHO_PIN, MAX_DISTANCE);
 
 // Hardcoded location
 const float LATITUDE = 23.8103;
 const float LONGITUDE = 90.4125;
 
// Get current timestamp in milliseconds (Unix epoch)
unsigned long long getTimestamp() {
  struct timeval tv;
  gettimeofday(&tv, NULL);
  unsigned long long timestamp = (unsigned long long)(tv.tv_sec) * 1000ULL + (tv.tv_usec / 1000ULL);
  
  // Debug output
  Serial.print("Current timestamp: ");
  Serial.println(String(timestamp));
  
  return timestamp;
}
 
 // System States
 enum SystemState {
   IDLE,
   PROXIMITY_DETECTED,
   PRIVILEGE_VERIFIED,
   REQUEST_CONFIRMED
 };
 
 SystemState currentState = IDLE;
 
 // State variables
 unsigned long proximityStartTime = 0;
 unsigned long privilegeStartTime = 0;
 unsigned long buttonPressStartTime = 0;
 bool proximityActive = false;
 bool privilegeActive = false;
 bool privilegeVerified = false;
 bool requestSent = false;
 bool buttonCurrentlyPressed = false;
 
 // Request tracking
 String currentRequestId = "";
 unsigned long lastFirebaseCheck = 0;
 const unsigned long FIREBASE_CHECK_INTERVAL = 1000; // Check every 1 second
 
 // Thresholds
 const float PROXIMITY_MIN_DISTANCE = 5.0;
 const float PROXIMITY_MAX_DISTANCE = 9.0;
 const unsigned long PROXIMITY_MIN_TIME = 3500;
 const int LDR_LASER_THRESHOLD = 4000;
 const unsigned long LASER_MIN_TIME = 500;
 const unsigned long DEBOUNCE_DELAY = 200;
 const unsigned long BUTTON_HOLD_TIMEOUT = 5000;
 
 // Get distance in meters
 float getDistance() {
   unsigned int distanceCm = sonar.ping_cm();
   if (distanceCm == 0 || distanceCm > 400) {
     return 999.0;
   }
   return distanceCm / 6.0;
 }
 
 // Get LDR value
 int getLDRValue() {
   return analogRead(LDR_PIN);
 }
 
 // Check button state (active HIGH)
 bool isButtonPressed() {
   return digitalRead(BUTTON_PIN) == HIGH;
 }
 
 // Activate buzzer
 void activateBuzzer(int duration) {
   digitalWrite(BUZZER_PIN, HIGH);
   delay(duration);
   digitalWrite(BUZZER_PIN, LOW);
 }
 
 // Error buzzer
 void errorBuzzer() {
   activateBuzzer(100);
   delay(100);
   activateBuzzer(100);
 }
 
 // Update LED based on Firebase status
 void updateLEDStatus(String ledStatus) {
   // Turn off all LEDs first
   digitalWrite(LED1_PIN, LOW);
   digitalWrite(LED2_PIN, LOW);
   digitalWrite(LED3_PIN, LOW);
   
   if (ledStatus == "waiting") {
     // Yellow/Orange - LED1 blink
     digitalWrite(LED1_PIN, HIGH);
     Serial.println("LED Status: WAITING (LED1 ON)");
   } 
   else if (ledStatus == "confirmed") {
     // Green - LED2 solid
     digitalWrite(LED2_PIN, HIGH);
     activateBuzzer(500); // Long beep for confirmation
     Serial.println("LED Status: CONFIRMED (LED2 ON)");
   } 
   else if (ledStatus == "rejected") {
     // Red - LED3 solid
     digitalWrite(LED3_PIN, HIGH);
     errorBuzzer(); // Error beep for rejection
     Serial.println("LED Status: REJECTED (LED3 ON)");
   }
   else {
     // All LEDs off or specific pattern
     digitalWrite(LED1_PIN, LOW);
     digitalWrite(LED2_PIN, LOW);
     digitalWrite(LED3_PIN, LOW);
     Serial.println("LED Status: COMPLETED (All LEDs OFF)");
   }
 }
 
 // Send ride request to Firebase
 void sendRideRequestToFirebase() {
   Serial.println("\n========================================");
   Serial.println("[Firebase] Preparing to send request...");
   
   // Check WiFi connection
   if (WiFi.status() != WL_CONNECTED) {
     Serial.println("[Firebase] ✗ WiFi disconnected!");
     Serial.println("[Firebase] Reconnecting...");
     WiFi.reconnect();
     delay(2000);
     if (WiFi.status() != WL_CONNECTED) {
       Serial.println("[Firebase] ✗ WiFi reconnection failed!");
       errorBuzzer();
       return;
     }
   }
   
   // Generate unique request ID
   currentRequestId = "req_" + String(millis());
   
   Serial.println("[Firebase] Request ID: " + currentRequestId);
   Serial.println("[Firebase] Building JSON payload...");
   
   unsigned long long timestamp = getTimestamp();
   FirebaseJson json;
   json.set("id", currentRequestId);
   json.set("user_id", "user_esp32");
   json.set("pickup_block", "cuet_campus");
   json.set("dropoff_block", "pahartali");
   json.set("distance_km", 2.5);
   json.set("estimated_fare", 40);
   json.set("estimated_points", 10);
   json.set("privilege_verified", true);
   json.set("status", "pending");
   json.set("timestamp", String(timestamp));
   // json.set("timestamp", (unsigned long)millis());
   
   // Create empty array for rejected_by
   FirebaseJsonArray rejectedArray;
   json.set("rejected_by", rejectedArray);
   
   // Set assigned_rickshaw as null by using empty string (Firebase will handle)
   json.set("assigned_rickshaw", "");
   json.set("led_status", "waiting");
   
   String path = "/ride_requests/" + currentRequestId;  // Changed from /requests/ to /ride_requests/
   Serial.println("[Firebase] Path: " + path);
   Serial.println("[Firebase] Sending data...");
   
   if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
     Serial.println("[Firebase] ✓✓✓ REQUEST SENT SUCCESSFULLY ✓✓✓");
     Serial.println("[Firebase] Request ID: " + currentRequestId);
     Serial.print("[Firebase] Location: ");
     Serial.print(LATITUDE, 6);
     Serial.print(", ");
     Serial.println(LONGITUDE, 6);
     Serial.println("[Firebase] View at: " + String(DATABASE_URL) + path + ".json");
     Serial.println("========================================\n");
     
     // Set initial LED status to waiting
     updateLEDStatus("waiting");
   } else {
     Serial.println("[Firebase] ✗✗✗ SEND FAILED ✗✗✗");
     Serial.println("[Firebase] Error Code: " + String(fbdo.errorCode()));
     Serial.println("[Firebase] Error Reason: " + fbdo.errorReason());
     Serial.println("========================================\n");
     errorBuzzer();
     
     // Try to diagnose the issue
     if (fbdo.errorCode() == -1) {
       Serial.println("[Debug] Network error - Check WiFi");
     } else if (fbdo.errorCode() == 401) {
       Serial.println("[Debug] Authentication error - Check API key");
     } else if (fbdo.errorCode() == 404) {
       Serial.println("[Debug] Database not found - Check DATABASE_URL");
     }
   }
 }
 
 // Check Firebase for status updates
 // Check Firebase for status updates
 // Check Firebase for status updates
 void checkFirebaseStatus() {
   if (currentRequestId == "" || currentState != REQUEST_CONFIRMED) {
     return;
   }
   
   unsigned long currentTime = millis();
   
   // Check Firebase at intervals
   if (currentTime - lastFirebaseCheck >= FIREBASE_CHECK_INTERVAL) {
     lastFirebaseCheck = currentTime;
     
     String statusPath = "/ride_requests/" + currentRequestId + "/status";
     String ledStatusPath = "/ride_requests/" + currentRequestId + "/led_status";
     
     // Check ride status
     if (Firebase.RTDB.getString(&fbdo, statusPath.c_str())) {
       String status = fbdo.stringData();
       Serial.print("Status: ");
       Serial.println(status);
       
       // If status is "accepted", update LED status to "confirmed"
       if (status == "accepted") {
         updateLEDStatus("confirmed");
         
         // Optionally update the led_status in Firebase to keep it in sync
         Firebase.RTDB.setString(&fbdo, ledStatusPath.c_str(), "confirmed");
         delay(5000);
         resetSystem();
       }
       // If status is "picked_up", turn off green LED and reset system
       else if (status == "picked_up") {
         Serial.println("Passenger picked up. Turning off green LED and resetting...");
         digitalWrite(LED2_PIN, LOW); // Turn off green LED
         delay(2000); // Wait 2 seconds
         resetSystem();
       }
       // Otherwise, check the existing LED status
       else if (Firebase.RTDB.getString(&fbdo, ledStatusPath.c_str())) {
         String ledStatus = fbdo.stringData();
         updateLEDStatus(ledStatus);
         
         // Auto-reset after completion
         if (ledStatus == "completed") {
           Serial.println("Request completed. Resetting in 5 seconds...");
           delay(5000);
           resetSystem();
         } else if (ledStatus == "rejected") {
           Serial.println("Request rejected. Resetting in 5 seconds...");
           delay(5000);
           resetSystem();
         }
       }
     }
   }
 }
 
 // Reset system
 void resetSystem() {
   currentState = IDLE;
   proximityActive = false;
   privilegeActive = false;
   privilegeVerified = false;
   requestSent = false;
   buttonCurrentlyPressed = false;
   proximityStartTime = 0;
   privilegeStartTime = 0;
   buttonPressStartTime = 0;
   currentRequestId = "";
   
   digitalWrite(LED1_PIN, LOW);
   digitalWrite(LED2_PIN, LOW);
   digitalWrite(LED3_PIN, LOW);
   
   Serial.println("System reset - Ready for new request");
 }
 
 void setup() {
   Serial.begin(115200);
   
   // Initialize pins
   pinMode(LDR_PIN, INPUT);
   pinMode(BUTTON_PIN, INPUT_PULLDOWN);  // Use internal pull-down
   pinMode(BUZZER_PIN, OUTPUT);
   pinMode(LED1_PIN, OUTPUT);
   pinMode(LED2_PIN, OUTPUT);
   pinMode(LED3_PIN, OUTPUT);
   
   digitalWrite(BUZZER_PIN, LOW);
   digitalWrite(LED1_PIN, LOW);
   digitalWrite(LED2_PIN, LOW);
   digitalWrite(LED3_PIN, LOW);
   
   // Connect to WiFi
   Serial.print("Connecting to WiFi");
   WiFi.begin(ssid, password);
   while (WiFi.status() != WL_CONNECTED) {
     delay(300);
     Serial.print(".");
   }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  
  // Initialize NTP for accurate timestamps
  Serial.println("Initializing NTP time synchronization...");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  // Wait for time synchronization (max 10 seconds)
  int ntpRetries = 0;
  while (time(nullptr) < 100000 && ntpRetries < 20) {
    Serial.print(".");
    delay(500);
    ntpRetries++;
  }
  
  if (time(nullptr) < 100000) {
    Serial.println("\n⚠ Warning: NTP sync failed! Timestamps may be incorrect.");
  } else {
    Serial.println("\n✓ NTP time synchronized!");
    time_t now = time(nullptr);
    Serial.print("Current time: ");
    Serial.println(ctime(&now));
  }
  
  // Configure Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
   
   // Enable anonymous authentication
   Serial.println("Signing up to Firebase...");
   if (Firebase.signUp(&config, &auth, "", "")) {
     Serial.println("Firebase sign-up successful!");
   } else {
     Serial.printf("Sign-up error: %s\n", config.signer.signupError.message.c_str());
   }
   
   // Assign token callback
   config.token_status_callback = tokenStatusCallback;
   
   // Initialize Firebase
   Firebase.begin(&config, &auth);
   Firebase.reconnectWiFi(true);
   
   Serial.println("Firebase initialized");
   Serial.println("System ready - Waiting for proximity detection...");
 }
 
 void loop() {
   // Read all sensors
   float distance = getDistance();
   int ldrValue = getLDRValue();
   bool buttonPressed = isButtonPressed();
   unsigned long currentTime = millis();
   
   // Debug output
   static unsigned long lastDebug = 0;
   if (currentTime - lastDebug > 500) {
     Serial.print("State: ");
     Serial.print(currentState);
     Serial.print(" | Distance: ");
     Serial.print(distance, 1);
     Serial.print("m | LDR: ");
     Serial.print(ldrValue);
     Serial.print(" | Button: ");
     Serial.println(buttonPressed ? "PRESSED" : "RELEASED");
     lastDebug = currentTime;
   }
   
   // ===== MODULE 1: PROXIMITY DETECTION =====
   if (currentState == IDLE) {
     if (distance >= PROXIMITY_MIN_DISTANCE && distance <= PROXIMITY_MAX_DISTANCE) {
       if (!proximityActive) {
         proximityActive = true;
         proximityStartTime = currentTime;
         Serial.println("Proximity detected, measuring time...");
       } else {
         unsigned long elapsed = currentTime - proximityStartTime;
         if (elapsed >= PROXIMITY_MIN_TIME) {
           currentState = PROXIMITY_DETECTED;
           digitalWrite(LED1_PIN, HIGH);
           activateBuzzer(200);
           Serial.println("✓ STEP 1: Proximity verified");
         }
       }
     } else {
       if (proximityActive) {
         Serial.println("Person moved away - proximity reset");
         proximityActive = false;
         proximityStartTime = 0;
       }
     }
   }
   
   // ===== MODULE 2: PRIVILEGE VERIFICATION =====
   if (currentState == PROXIMITY_DETECTED && !privilegeVerified) {
     // Check proximity still valid
     if (distance < PROXIMITY_MIN_DISTANCE || distance > PROXIMITY_MAX_DISTANCE) {
       Serial.println("Person moved out of range - resetting");
       resetSystem();
       return;
     }
     
     // Check laser
     if (ldrValue > LDR_LASER_THRESHOLD) {
       if (!privilegeActive) {
         privilegeActive = true;
         privilegeStartTime = currentTime;
         Serial.print("Laser detected (ADC: ");
         Serial.print(ldrValue);
         Serial.println("), verifying...");
       } else {
         unsigned long elapsed = currentTime - privilegeStartTime;
         if (elapsed >= LASER_MIN_TIME) {
           privilegeVerified = true;
           currentState = PRIVILEGE_VERIFIED;
           digitalWrite(LED2_PIN, HIGH);
           activateBuzzer(200);
           Serial.println("✓ STEP 2: Privilege verified");
         }
       }
     } else {
       if (privilegeActive) {
         Serial.println("Laser signal lost - privilege reset");
         privilegeActive = false;
         privilegeStartTime = 0;
       }
     }
   }
   
   // Check proximity during privilege verified state
   if (currentState == PRIVILEGE_VERIFIED && !requestSent) {
     if (distance < PROXIMITY_MIN_DISTANCE || distance > PROXIMITY_MAX_DISTANCE) {
       Serial.println("Person moved out of range - resetting");
       resetSystem();
       return;
     }
   }
   
   // ===== MODULE 3: BUTTON HANDLING =====
   static bool lastButtonState = false;
   static unsigned long lastValidPress = 0;
   
   if (buttonPressed && !lastButtonState) {
     buttonCurrentlyPressed = true;
     buttonPressStartTime = currentTime;
     lastButtonState = true;
     
     if (currentState != PRIVILEGE_VERIFIED) {
       Serial.println("✗ STEP 3: Button pressed but privilege NOT verified - NO ACTION");
       errorBuzzer();
       buttonCurrentlyPressed = false;
       return;
     }
     
     Serial.println("Button pressed and held...");
     
   } else if (!buttonPressed && lastButtonState) {
     lastButtonState = false;
     
     if (!buttonCurrentlyPressed) {
       return;
     }
     
     unsigned long pressDuration = currentTime - buttonPressStartTime;
     buttonCurrentlyPressed = false;
     
     Serial.print("Button released after ");
     Serial.print(pressDuration);
     Serial.println("ms");
     
     if (pressDuration > BUTTON_HOLD_TIMEOUT) {
       Serial.println("✗ ERROR: Button held too long (>5 seconds) - TIMEOUT");
       errorBuzzer();
       delay(1000);
       resetSystem();
       return;
     }
     
     if (pressDuration < DEBOUNCE_DELAY) {
       Serial.println("✗ Button press too short (<200ms) - IGNORED");
       return;
     }
     
     if (currentTime - lastValidPress < 2000 && lastValidPress > 0) {
       Serial.println("✗ DUPLICATE PRESS within 2 seconds - IGNORED");
       return;
     }
     
     if (currentState == PRIVILEGE_VERIFIED && !requestSent) {
       lastValidPress = currentTime;
       requestSent = true;
       currentState = REQUEST_CONFIRMED;
       digitalWrite(LED3_PIN, HIGH);
       activateBuzzer(500);
       
       Serial.println("✓ STEP 3: Button press ACCEPTED - Sending ride request");
       sendRideRequestToFirebase();
     }
     
   } else if (buttonPressed && buttonCurrentlyPressed) {
     unsigned long holdDuration = currentTime - buttonPressStartTime;
     
     static unsigned long lastHoldWarning = 0;
     if (holdDuration > 3000 && currentTime - lastHoldWarning > 1000) {
       Serial.print("⚠ Warning: Button held for ");
       Serial.print(holdDuration / 1000.0, 1);
       Serial.println(" seconds...");
       lastHoldWarning = currentTime;
     }
     
     if (holdDuration > BUTTON_HOLD_TIMEOUT) {
       Serial.println("✗ ERROR: Button held too long (>5 seconds) - TIMEOUT");
       errorBuzzer();
       buttonCurrentlyPressed = false;
       lastButtonState = false;
       delay(1000);
       resetSystem();
     }
   }
   
   // ===== FIREBASE STATUS MONITORING =====
   checkFirebaseStatus();
   
   delay(50);
 }