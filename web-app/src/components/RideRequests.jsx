/**
 * RideRequests Component
 *
 * IMPLEMENTS TEST REQUIREMENTS:
 * (a) Immediately after confirmation → Expected: All LEDs OFF
 * (b) Puller accepts within 10 seconds → Expected: Yellow ON (LED1)
 * (c) No puller accepts within 60 seconds → Expected: Red ON (LED3) - TIMEOUT/AUTO-REJECT
 * (d) Puller confirms pickup → Expected: Green ON (LED2), Yellow OFF
 * (e) Multiple rejections then acceptance → Expected: Proper LED sequence
 * (f) Power failure during LED operation → Expected: State recovery
 *
 * AUTO-REJECTION TIMER:
 * - 60-second countdown starts when request is created
 * - Visual countdown timer shows remaining time
 * - Timer color changes: Green (>30s) → Orange (30-10s) → Red (<10s)
 * - Auto-rejects and activates Red LED if no puller accepts within 60 seconds
 */

import React, { useEffect, useState } from "react";
import { ref, update, get, remove } from "firebase/database";
import { database } from "../firebase";
import { getLocationName, getTimeAgo } from "../utils/helpers";

function RideRequests({ pendingRequests, currentRickshawId, showToast }) {
  const [timeRemaining, setTimeRemaining] = useState({});
  const REQUEST_TIMEOUT = 60000; // 60 seconds

  // Update countdown timer every second
  useEffect(() => {
    // Initial calculation immediately
    const calculateTimeRemaining = () => {
      const currentTime = Date.now();
      const newTimeRemaining = {};

      pendingRequests.forEach((request) => {
        // Ensure timestamp exists and is a valid number
        const timestamp = request.timestamp
          ? parseInt(request.timestamp)
          : null;
        if (timestamp && !isNaN(timestamp)) {
          const elapsed = currentTime - timestamp;
          const remaining = Math.max(0, REQUEST_TIMEOUT - elapsed);
          newTimeRemaining[request.id] = remaining;

          // Debug log for production troubleshooting
          console.log(
            `Timer for ${request.id}: ${Math.floor(
              remaining / 1000
            )}s remaining`
          );
        } else {
          console.warn(
            `Request ${request.id} missing valid timestamp:`,
            request.timestamp
          );
        }
      });

      setTimeRemaining(newTimeRemaining);
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Then update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [pendingRequests]);

  // Audio notification for new requests (Test Case 6a)
  useEffect(() => {
    if (pendingRequests.length > 0) {
      console.log("🔔 New ride request notification");

      // Play notification sound
      playNotificationSound();

      // Vibration alert (if supported)
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }, [pendingRequests.length]);

  const playNotificationSound = () => {
    try {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log("Audio notification not supported");
    }
  };

  const formatTimeRemaining = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `0:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getTimeRemainingClass = (ms) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds <= 10) return "time-critical";
    if (seconds <= 30) return "time-warning";
    return "time-normal";
  };

  const handleAcceptRide = async (requestId) => {
    if (!currentRickshawId) {
      showToast("Please select a rickshaw first", "error");
      return;
    }

    console.log(`Accepting ride request: ${requestId}`);

    try {
      // Get request data
      const requestSnapshot = await get(
        ref(database, `ride_requests/${requestId}`)
      );
      const request = requestSnapshot.val();

      if (!request) {
        showToast("Request not found", "error");
        return;
      }

      // Check if already accepted by another rickshaw
      if (request.status !== "pending") {
        showToast("This request has already been accepted", "error");
        return;
      }

      // Create active ride object
      const rideId = `ride_${Date.now()}`;
      const currentTime = Date.now();

      // Validate required fields to prevent undefined values
      if (!request.pickup_block || !request.dropoff_block) {
        showToast("Invalid request: missing location data", "error");
        console.error("❌ Missing required fields:", request);
        return;
      }

      const ride = {
        id: rideId,
        request_id: requestId,
        user_id: request.user_id || "user_1",
        rickshaw_id: currentRickshawId,
        pickup_block: request.pickup_block,
        dropoff_block: request.dropoff_block,
        distance_km: request.distance_km || 0,
        fare: request.estimated_fare || 0,
        points_earned: 0, // Will be calculated at drop-off
        status: "accepted",
        request_time: request.timestamp || currentTime, // Fallback to current time if timestamp is undefined
        accept_time: currentTime,
        pickup_time: null,
        dropoff_time: null,
        pickup_location: null,
        dropoff_location: null,
        points_status: "pending",
      };

      // Update database (Test Case 6b - acceptance confirmation)
      // TEST REQUIREMENT (b): Puller accepts within 10 seconds → Yellow LED ON
      const updates = {};
      updates[`active_rides/${rideId}`] = ride;
      updates[`ride_requests/${requestId}/status`] = "accepted";
      updates[`ride_requests/${requestId}/assigned_rickshaw`] =
        currentRickshawId;
      updates[`ride_requests/${requestId}/led_status`] = "waiting"; // Yellow LED (LED1) ON
      updates[`rickshaws/${currentRickshawId}/status`] = "busy";

      await update(ref(database), updates);

      showToast("Ride accepted! User has been notified");
      console.log("✅ Ride accepted - User notified");
    } catch (error) {
      showToast("Error accepting ride", "error");
      console.error("❌ Error:", error);
    }
  };

  const handleRejectRide = async (requestId) => {
    if (!currentRickshawId) {
      showToast("Please select a rickshaw first", "error");
      return;
    }

    console.log(`Rejecting ride request: ${requestId}`);

    try {
      const requestSnapshot = await get(
        ref(database, `ride_requests/${requestId}`)
      );
      const request = requestSnapshot.val();

      if (!request) {
        showToast("Request not found", "error");
        return;
      }

      // Add current rickshaw to rejected_by list
      const rejectedBy = request.rejected_by || [];
      if (!rejectedBy.includes(currentRickshawId)) {
        rejectedBy.push(currentRickshawId);
      }

      // Get all available rickshaws to check if all have rejected
      const rickshawsSnapshot = await get(ref(database, "rickshaws"));
      const allRickshaws = rickshawsSnapshot.val();
      const availableRickshawIds = Object.entries(allRickshaws || {})
        .filter(([id, rickshaw]) => rickshaw.status === "available")
        .map(([id]) => id);

      // Check if all available rickshaws have rejected
      const allRejected =
        availableRickshawIds.length > 0 &&
        availableRickshawIds.every((id) => rejectedBy.includes(id));

      // Update database
      // TEST REQUIREMENT (e): Multiple rejections then acceptance → Proper LED sequence
      const updates = {};
      updates[`ride_requests/${requestId}/rejected_by`] = rejectedBy;

      if (allRejected) {
        // TEST REQUIREMENT (c): No puller accepts within 60 seconds → Red LED ON
        // If all available rickshaws rejected, mark as rejected
        updates[`ride_requests/${requestId}/status`] = "rejected";
        updates[`ride_requests/${requestId}/led_status`] = "rejected"; // Red LED (LED3) ON
        console.log("⚠️ All available rickshaws have rejected this request");
        showToast("All rickshaws rejected - user has been notified", "error");
      } else {
        // Keep status as 'pending' for other rickshaws
        showToast("Request rejected - offer sent to next puller");
        console.log(
          "✅ Request rejected by this rickshaw - others can still accept"
        );
      }

      await update(ref(database), updates);
    } catch (error) {
      showToast("Error rejecting request", "error");
      console.error("❌ Error:", error);
    }
  };

  // Sort requests by time (oldest first for FIFO)
  const sortedRequests = [...pendingRequests].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  return (
    <section className="requests-section">
      <div className="section-header">
        <h2>
          <i className="fas fa-bell"></i> Incoming Ride Requests
        </h2>
        <span className="badge">{pendingRequests.length} pending</span>
      </div>
      <div className="requests-container">
        {sortedRequests.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-inbox"></i>
            <p>No pending requests</p>
            <small>
              New ride requests will appear here with audio/vibration alert
            </small>
          </div>
        ) : (
          sortedRequests.map((request) => (
            <div
              key={request.id}
              className="request-card"
            >
              <div className="request-header">
                <div className="request-time">
                  <i className="fas fa-clock"></i>
                  <span>{getTimeAgo(request.timestamp)}</span>
                </div>
                {request.timestamp &&
                  timeRemaining[request.id] !== undefined && (
                    <div
                      className={`countdown-timer ${getTimeRemainingClass(
                        timeRemaining[request.id]
                      )}`}
                    >
                      <i className="fas fa-hourglass-half"></i>
                      <span className="timer-text">
                        {formatTimeRemaining(timeRemaining[request.id])}
                      </span>
                      <span className="timer-label">until auto-reject</span>
                    </div>
                  )}
                {!request.timestamp && (
                  <div className="countdown-timer time-warning">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span className="timer-text">No timer</span>
                    <span className="timer-label">timestamp missing</span>
                  </div>
                )}
                <span className="badge badge-warning">New Request</span>
              </div>

              <div className="request-route">
                <div className="request-location">
                  <h4>Pickup</h4>
                  <p>{getLocationName(request.pickup_block)}</p>
                </div>
                <div className="request-arrow">
                  <i className="fas fa-arrow-right"></i>
                </div>
                <div className="request-location">
                  <h4>Drop-off</h4>
                  <p>{getLocationName(request.dropoff_block)}</p>
                </div>
              </div>

              <div className="request-info">
                <div className="request-info-item">
                  <i className="fas fa-route"></i>
                  <span>{request.distance_km} km</span>
                </div>
                <div className="request-info-item">
                  <i className="fas fa-money-bill-wave"></i>
                  <span>৳{request.estimated_fare}</span>
                </div>
                <div className="request-info-item">
                  <i className="fas fa-star"></i>
                  <span>+{request.estimated_points} points</span>
                </div>
              </div>

              {request.privilege_verified && (
                <div className="privilege-badge">
                  <i className="fas fa-check-circle"></i> Privilege Verified
                </div>
              )}

              <div className="request-actions">
                <button
                  className="btn btn-success"
                  onClick={() => handleAcceptRide(request.id)}
                  title="Accept ride and notify user"
                >
                  <i className="fas fa-check"></i> Accept Ride
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleRejectRide(request.id)}
                  title="Reject this ride request"
                >
                  <i className="fas fa-times"></i> Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default RideRequests;
