/*
 * ESP32 GPS Tracker with Firebase Integration
 * Displays rickshaw location and customer pickup location
 * 
 * Components:
 * - GPS Module (NEO-6M): RX-16, TX-17 (optional - currently using hardcoded location)
 * - OLED Display (SSD1306): I2C (SDA-21, SCL-22)
 * 
 * Libraries Required:
 * - TinyGPSPlus
 * - Adafruit_SSD1306
 * - Adafruit_GFX
 * - Firebase ESP Client
 */

 #include <TinyGPSPlus.h>
 #include <WiFi.h>
 #include <Wire.h>
 #include <Adafruit_SSD1306.h>
 #include <Firebase_ESP_Client.h>
 #include "addons/TokenHelper.h"
 #include "addons/RTDBHelper.h"
 
 // Firebase Configuration
 #define API_KEY "AIzaSyCyPJA1r5HQKGPKT_xRPio1Yzafgu1pxAI" 
 #define DATABASE_URL "https://rickshaw-ride-c5683-default-rtdb.asia-southeast1.firebasedatabase.app"
 
 // WiFi Credentials
 const char* ssid = "realme 8";
 const char* password = "11223344";
 
 // OLED Display Settings
 #define SCREEN_WIDTH 128
 #define SCREEN_HEIGHT 64
 #define OLED_RESET -1
 Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
 
 // GPS Settings
 #define GPS_RX 16  // Connect to GPS TX
 #define GPS_TX 17  // Connect to GPS RX
 #define GPS_BAUD 9600
 HardwareSerial gpsSerial(2);
 TinyGPSPlus gps;
 
 // Firebase objects
 FirebaseData fbdo;
 FirebaseAuth auth;
 FirebaseConfig config;
 
// SSL Buffer size (reduce to prevent memory issues)
#define SSL_BUFFER_SIZE 2048
#define MAX_RESPONSE_SIZE 2048

// Rickshaw puller's current location (hardcoded for now)
 double currentLat = 22.4580;
 double currentLon = 91.9714;
 String currentLocationName = "CUET Campus";
 
 // Customer's pickup location (destination for rickshaw)
 double customerLat = 0.0;
 double customerLon = 0.0;
 String customerLocationName = "";
 String pickupBlock = "";
 String dropoffBlock = "";
 
 // Ride details
 double distance = 0.0;
 int estimatedFare = 0;
 int estimatedPoints = 0;
 
 // Firebase tracking
 String activeRequestId = "";
 String assignedRickshawId = "rickshaw_001"; // Unique ID for this rickshaw
 unsigned long lastFirebaseCheck = 0;
 const unsigned long FIREBASE_CHECK_INTERVAL = 5000; // Check every 5 seconds (increased from 3)
 
 // Function to calculate distance between two GPS coordinates (Haversine formula)
 double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
   double R = 6371000; // Earth radius in meters
   double phi1 = lat1 * PI / 180.0;
   double phi2 = lat2 * PI / 180.0;
   double deltaPhi = (lat2 - lat1) * PI / 180.0;
   double deltaLambda = (lon2 - lon1) * PI / 180.0;
 
   double a = sin(deltaPhi / 2) * sin(deltaPhi / 2) +
              cos(phi1) * cos(phi2) *
              sin(deltaLambda / 2) * sin(deltaLambda / 2);
   double c = 2 * atan2(sqrt(a), sqrt(1 - a));
 
   return R * c; // Distance in meters
 }
 
 // Convert block name to readable location name
 String blockToLocationName(String block) {
   if (block == "cuet_campus") return "CUET Campus";
   else if (block == "pahartali") return "Pahartali";
   else if (block == "agrabad") return "Agrabad";
   else if (block == "new_market") return "New Market";
   else if (block == "oxygen") return "Oxygen";
   else if (block == "station_road") return "Station Road";
   else return block;
 }
 
 // Function to update OLED display
 void updateDisplay() {
   // Page 1: Rickshaw's Current Location
   display.clearDisplay();
   display.setTextSize(1);
   display.setTextColor(SSD1306_WHITE);
   
   display.setCursor(0, 0);
   display.println("MY LOCATION:");
   display.setTextSize(2);
   display.println(currentLocationName);
   
   display.setTextSize(1);
   display.println("");
   display.print("Lat: ");
   display.println(currentLat, 4);
   display.print("Lon: ");
   display.println(currentLon, 4);
   
   display.display();
   delay(2000);
   
   // Page 2: Customer's Pickup Location
   display.clearDisplay();
   display.setCursor(0, 0);
   display.setTextSize(1);
   
   if (customerLat != 0.0 && customerLon != 0.0) {
     display.println("CUSTOMER PICKUP:");
     display.setTextSize(2);
     display.println(customerLocationName);
     
     display.setTextSize(1);
     display.println("");
     display.print("Lat: ");
     display.println(customerLat, 4);
     display.print("Lon: ");
     display.println(customerLon, 4);
   } else {
     display.setTextSize(2);
     display.println("No Active");
     display.println("Ride");
     display.setTextSize(1);
     display.println("");
     display.println("Waiting for ride");
     display.println("requests...");
   }
   
   display.display();
   delay(2000);
   
   // Page 3: Distance and Fare (only if there's an active ride)
   if (customerLat != 0.0 && customerLon != 0.0) {
     display.clearDisplay();
     display.setCursor(0, 0);
     display.setTextSize(1);
     
     display.println("RIDE DETAILS:");
     display.println("");
     
     display.print("Distance: ");
     if (distance < 1000) {
       display.print((int)distance);
       display.println(" m");
     } else {
       display.print(distance / 1000, 2);
       display.println(" km");
     }
     
     display.println("");
     display.print("Fare: ");
     display.print(estimatedFare);
     display.println(" Tk");
     
     display.println("");
     display.print("Points: ");
     display.println(estimatedPoints);
     
     display.display();
     delay(2000);
   }
 }
 
// Check Firebase for accepted ride requests assigned to this rickshaw
void checkFirebaseForRides() {
  unsigned long currentTime = millis();
   
  if (currentTime - lastFirebaseCheck >= FIREBASE_CHECK_INTERVAL) {
    lastFirebaseCheck = currentTime;
    
    // Check if Firebase is ready before making requests
    if (!Firebase.ready()) {
      Serial.println("\n[Firebase not ready yet, skipping check...]");
      return;
    }
    
    Serial.println("\n[Checking Firebase for rides...]");
    
    // Get all ride requests
    if (Firebase.RTDB.getJSON(&fbdo, "/ride_requests")) {
       String jsonStr = fbdo.stringData();
       
       // Check if response is empty or null
       if (jsonStr == "" || jsonStr == "null" || jsonStr.length() < 5) {
         Serial.println("No ride requests in database yet.");
         return;
       }
       
       FirebaseJson json;
       json.setJsonData(jsonStr);
       
       size_t len = json.iteratorBegin();
       String key, value;
       int type = 0;
       bool foundActiveRide = false;
       
       if (len == 0) {
         Serial.println("No ride requests found.");
         json.iteratorEnd();
         return;
       }
       
       // Iterate through all requests
       for (size_t i = 0; i < len; i++) {
         json.iteratorGet(i, type, key, value);
         
         // Check status
         String statusPath = "/ride_requests/" + key + "/status";
         
         if (Firebase.RTDB.getString(&fbdo, statusPath.c_str())) {
           String status = fbdo.stringData();
           
          // Look for accepted rides assigned to this rickshaw
          if (status == "accepted") {
            String assignedPath = "/ride_requests/" + key + "/assigned_rickshaw";
            
            if (Firebase.RTDB.getString(&fbdo, assignedPath.c_str())) {
              String assignedTo = fbdo.stringData();
              
              // Check if this ride is assigned to THIS rickshaw
              if (assignedTo == assignedRickshawId) {
                // Mark that we found an active ride
                foundActiveRide = true;
                activeRequestId = key;
                
                // Get pickup block (where customer is waiting)
                String pickupPath = "/ride_requests/" + key + "/pickup_block";
                if (Firebase.RTDB.getString(&fbdo, pickupPath.c_str())) {
                  pickupBlock = fbdo.stringData();
                  customerLocationName = blockToLocationName(pickupBlock);
                }
                
                // Get dropoff block
                String dropoffPath = "/ride_requests/" + key + "/dropoff_block";
                if (Firebase.RTDB.getString(&fbdo, dropoffPath.c_str())) {
                  dropoffBlock = fbdo.stringData();
                }
                
                // Get customer's coordinates from /blocks
                String coordPath = "/blocks/" + pickupBlock + "/coordinates";
                if (Firebase.RTDB.getJSON(&fbdo, coordPath.c_str())) {
                  FirebaseJson coordJson;
                  coordJson.setJsonData(fbdo.stringData());
                  FirebaseJsonData latData, lonData;
                  
                  coordJson.get(latData, "lat");
                  coordJson.get(lonData, "lon");
                  
                  if (latData.success && lonData.success) {
                    customerLat = latData.doubleValue;
                    customerLon = lonData.doubleValue;
                  }
                }
                
                // Get fare and points
                String farePath = "/ride_requests/" + key + "/estimated_fare";
                if (Firebase.RTDB.getInt(&fbdo, farePath.c_str())) {
                  estimatedFare = fbdo.intData();
                }
                
                String pointsPath = "/ride_requests/" + key + "/estimated_points";
                if (Firebase.RTDB.getInt(&fbdo, pointsPath.c_str())) {
                  estimatedPoints = fbdo.intData();
                }
                
                Serial.println("========================================");
                Serial.println("ACTIVE RIDE FOUND!");
                Serial.println("Request ID: " + key);
                Serial.println("Assigned to: " + assignedTo);
                Serial.println("Customer Location: " + customerLocationName);
                Serial.print("Coordinates: ");
                Serial.print(customerLat, 6);
                Serial.print(", ");
                Serial.println(customerLon, 6);
                Serial.println("Dropoff: " + blockToLocationName(dropoffBlock));
                Serial.print("Fare: ");
                Serial.print(estimatedFare);
                Serial.println(" Tk");
                Serial.print("Points: ");
                Serial.println(estimatedPoints);
                Serial.println("========================================");
                
                break; // Only handle one ride at a time
              }
            }
          }
           // Clear data if ride is picked up or completed
           else if (status == "picked_up" || status == "completed") {
             if (activeRequestId == key) {
               Serial.println("Ride " + status + ". Clearing data...");
               activeRequestId = "";
               customerLat = 0.0;
               customerLon = 0.0;
               customerLocationName = "";
               pickupBlock = "";
               dropoffBlock = "";
               estimatedFare = 0;
               estimatedPoints = 0;
               foundActiveRide = false;
             }
           }
         }
         
         delay(50); // Small delay between operations
       }
       
       json.iteratorEnd();
       
       // Clear data if no active ride found
       if (!foundActiveRide && activeRequestId != "") {
         Serial.println("No active rides. Clearing data...");
         activeRequestId = "";
         customerLat = 0.0;
         customerLon = 0.0;
         customerLocationName = "";
         pickupBlock = "";
         dropoffBlock = "";
         estimatedFare = 0;
         estimatedPoints = 0;
       }
       
     } else {
       String errorMsg = fbdo.errorReason();
       
       // Only print error if it's not a "path not found" error (which is normal when no requests exist)
       if (errorMsg.indexOf("path not exist") < 0 && errorMsg.indexOf("not found") < 0) {
         Serial.println("Failed to fetch ride requests");
         Serial.println("Error: " + errorMsg);
         
         // Handle SSL errors
         if (errorMsg.indexOf("SSL") >= 0 || errorMsg.indexOf("buffer") >= 0) {
           Serial.println("SSL/Buffer Error. Reconnecting WiFi...");
           WiFi.disconnect();
           delay(1000);
           WiFi.reconnect();
           delay(2000);
           
           if (WiFi.status() == WL_CONNECTED) {
             Serial.println("WiFi reconnected successfully");
             Firebase.reconnectWiFi(true);
           }
         }
       } else {
         Serial.println("No ride requests in database (waiting for first request)");
       }
     }
   }
 }
 
 void setup() {
   Serial.begin(115200);
   delay(1000);
   
   Serial.println("\n========================================");
   Serial.println("ESP32 Rickshaw GPS Tracker");
   Serial.println("Rickshaw ID: " + assignedRickshawId);
   Serial.println("========================================\n");
   
   // Initialize GPS (commented out - no GPS sensor connected)
   // gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX, GPS_TX);
   // Serial.println("GPS Initialized");
   
   // Initialize OLED
   if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
     Serial.println(F("SSD1306 allocation failed"));
     for (;;);
   }
   
   display.clearDisplay();
   display.setTextSize(1);
   display.setTextColor(SSD1306_WHITE);
   display.setCursor(0, 0);
   display.println("Rickshaw Tracker");
   display.println("Initializing...");
   display.display();
   delay(2000);
   
   // Connect to WiFi
   WiFi.begin(ssid, password);
   Serial.print("Connecting to WiFi");
   
   display.clearDisplay();
   display.setCursor(0, 0);
   display.println("Connecting WiFi...");
   display.display();
   
   int attempts = 0;
   while (WiFi.status() != WL_CONNECTED && attempts < 20) {
     delay(500);
     Serial.print(".");
     attempts++;
   }
   
   if (WiFi.status() == WL_CONNECTED) {
     Serial.println("\nWiFi Connected!");
     Serial.print("IP Address: ");
     Serial.println(WiFi.localIP());
     
     display.clearDisplay();
     display.setCursor(0, 0);
     display.println("WiFi Connected!");
     display.print("IP: ");
     display.println(WiFi.localIP());
     display.display();
     delay(2000);
   } else {
     Serial.println("\nWiFi Failed!");
     display.clearDisplay();
     display.setCursor(0, 0);
     display.println("WiFi Failed!");
     display.display();
     delay(5000);
     ESP.restart();
   }
   
  // Configure Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  // Set SSL buffer size
  fbdo.setBSSLBufferSize(SSL_BUFFER_SIZE, SSL_BUFFER_SIZE);
  fbdo.setResponseSize(MAX_RESPONSE_SIZE);
  
  // Initialize Firebase
  Serial.println("Initializing Firebase...");
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Sign in anonymously
  Serial.println("Signing in anonymously...");
  
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Connecting Firebase...");
  display.display();
  
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Anonymous sign-in successful");
    Serial.print("User UID: ");
    Serial.println(auth.token.uid.c_str());
    
    // Wait for token to be generated
    Serial.println("Waiting for auth token...");
    int tokenWait = 0;
    while ((auth.token.uid == "" || !Firebase.ready()) && tokenWait < 30) {
      delay(1000);
      Serial.print(".");
      tokenWait++;
    }
    
    if (Firebase.ready()) {
      Serial.println("\nFirebase is ready!");
    } else {
      Serial.println("\nWarning: Firebase may not be fully ready");
    }
    
  } else {
    Serial.println("Anonymous sign-in failed");
    Serial.println("Error: " + String(config.signer.signupError.message.c_str()));
    
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Firebase Auth");
    display.println("Failed!");
    display.println("");
    display.println("Check Firebase");
    display.println("settings");
    display.display();
    delay(5000);
  }
  
  Serial.println("Firebase initialized successfully");
   
   display.clearDisplay();
   display.setCursor(0, 0);
   display.setTextSize(1);
   display.println("System Ready!");
   display.println("");
   display.println("Waiting for");
   display.println("ride requests...");
   display.display();
   delay(2000);
   
   Serial.println("System ready. Listening for rides...\n");
 }
 
 void loop() {
   // Read GPS data (commented out - no GPS sensor connected)
   
   while (gpsSerial.available() > 0) {
     if (gps.encode(gpsSerial.read())) {
       if (gps.location.isValid()) {
         currentLat = gps.location.lat();
         currentLon = gps.location.lng();
         currentLocationName = "GPS Location";
         
         static unsigned long lastGPSPrint = 0;
         if (millis() - lastGPSPrint > 5000) {
           Serial.print("GPS: ");
           Serial.print(currentLat, 6);
           Serial.print(", ");
           Serial.println(currentLon, 6);
           lastGPSPrint = millis();
         }
       }
     }
   }
 
   
   // Check Firebase for ride assignments
   checkFirebaseForRides();
   
   // Calculate distance if both locations are valid
   if (currentLat != 0.0 && currentLon != 0.0 && customerLat != 0.0 && customerLon != 0.0) {
     distance = calculateDistance(currentLat, currentLon, customerLat, customerLon);
   } else {
     distance = 0.0;
   }
   
   // Update display
   updateDisplay();
   
   delay(100);
 }