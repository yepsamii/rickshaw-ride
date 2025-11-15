import { useState, useEffect } from "react";
import { ref, onValue, update, get } from "firebase/database";
import { database } from "./firebase";
import Header from "./components/Header";
import StatisticsCards from "./components/StatisticsCards";
import ActiveRide from "./components/ActiveRide";
import RideRequests from "./components/RideRequests";
import RideHistory from "./components/RideHistory";
import Footer from "./components/Footer";
import Toast from "./components/Toast";
import TestRunner from "./components/TestRunner";

function App() {
  const [currentRickshawId, setCurrentRickshawId] = useState(null);
  const [currentRickshaw, setCurrentRickshaw] = useState(null);
  const [rickshaws, setRickshaws] = useState({});
  const [activeRide, setActiveRide] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [rideHistory, setRideHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [showTesting, setShowTesting] = useState(false);

  // Firebase connection check
  useEffect(() => {
    const connectedRef = ref(database, ".info/connected");
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      setIsConnected(snapshot.val() === true);
      if (snapshot.val() === true) {
        console.log("✅ Firebase connected");
      } else {
        console.log("❌ Firebase disconnected");
      }
    });

    return () => unsubscribe();
  }, []);

  // Load rickshaws
  useEffect(() => {
    const rickshawsRef = ref(database, "rickshaws");
    const unsubscribe = onValue(rickshawsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRickshaws(data);
        console.log(`✅ Loaded ${Object.keys(data).length} rickshaws`);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load current rickshaw data
  useEffect(() => {
    if (!currentRickshawId) {
      setCurrentRickshaw(null);
      return;
    }

    const rickshawRef = ref(database, `rickshaws/${currentRickshawId}`);
    const unsubscribe = onValue(rickshawRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCurrentRickshaw(data);
      }
    });

    return () => unsubscribe();
  }, [currentRickshawId]);

  // Continuous timeout checker - runs every second independently
  useEffect(() => {
    const REQUEST_TIMEOUT = 60000; // 60 seconds in milliseconds

    const checkTimeouts = async () => {
      try {
        const requestsSnapshot = await get(ref(database, "ride_requests"));
        const data = requestsSnapshot.val();

        if (data) {
          const currentTime = Date.now();

          for (const [requestId, request] of Object.entries(data)) {
            if (request.status === "pending" && request.timestamp) {
              const elapsedTime = currentTime - request.timestamp;

              if (elapsedTime >= REQUEST_TIMEOUT) {
                console.log(
                  `⏰ TIMEOUT: Request ${requestId} exceeded 60 seconds (${Math.floor(
                    elapsedTime / 1000
                  )}s)`
                );
                console.log(`🔴 AUTO-REJECTING request ${requestId}`);

                const updates = {};
                updates[`ride_requests/${requestId}/status`] = "rejected";
                updates[`ride_requests/${requestId}/led_status`] = "rejected";
                updates[`ride_requests/${requestId}/rejection_reason`] =
                  "timeout";
                await update(ref(database), updates);

                console.log(
                  `✅ Request ${requestId} auto-rejected after 60 seconds - Red LED activated`
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("Error checking timeouts:", error);
      }
    };

    // Check for timeouts every second
    const interval = setInterval(checkTimeouts, 1000);

    // Run once immediately
    checkTimeouts();

    return () => clearInterval(interval);
  }, []);

  // Listen for ride requests and check for all-rejected requests + 60-second timeout
  // IMPLEMENTS AUTO-REJECTION TIMER:
  // - Monitors all pending requests in real-time
  // - Automatically rejects requests after 60 seconds if no puller accepts
  // - Updates LED status to 'rejected' (Red LED) on timeout
  // - Logs remaining time in console for debugging
  useEffect(() => {
    const requestsRef = ref(database, "ride_requests");
    const unsubscribe = onValue(requestsRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const currentTime = Date.now();
        const rickshawsList = Object.keys(rickshaws);
        const REQUEST_TIMEOUT = 60000; // 60 seconds in milliseconds

        for (const [requestId, request] of Object.entries(data)) {
          // Check each pending request if all rickshaws have rejected it
          if (
            request.status === "pending" &&
            request.rejected_by &&
            request.rejected_by.length > 0
          ) {
            // Count available rickshaws (not busy)
            const availableRickshaws = await Promise.all(
              rickshawsList.map(async (id) => {
                const rickshawSnapshot = await get(
                  ref(database, `rickshaws/${id}`)
                );
                const rickshaw = rickshawSnapshot.val();
                return rickshaw && rickshaw.status === "available" ? id : null;
              })
            );
            const availableRickshawIds = availableRickshaws.filter(
              (id) => id !== null
            );

            // Check if all available rickshaws have rejected
            const allRejected =
              availableRickshawIds.length > 0 &&
              availableRickshawIds.every((id) =>
                request.rejected_by.includes(id)
              );

            if (allRejected) {
              console.log(`⚠️ All rickshaws rejected request: ${requestId}`);
              // Update status to rejected
              const updates = {};
              updates[`ride_requests/${requestId}/status`] = "rejected";
              updates[`ride_requests/${requestId}/led_status`] = "rejected";
              updates[`ride_requests/${requestId}/rejection_reason`] =
                "all_rejected";
              await update(ref(database), updates);
              console.log(
                `✅ Updated request ${requestId} status to rejected (all pullers rejected)`
              );
            }
          }
        }

        const pending = Object.values(data).filter((req) => {
          // Show only pending requests that haven't been rejected by current rickshaw
          if (req.status !== "pending") return false;

          // If current rickshaw is selected, filter out requests they've rejected
          if (currentRickshawId && req.rejected_by) {
            return !req.rejected_by.includes(currentRickshawId);
          }

          return true;
        });

        // Debug: Check if timestamps exist
        pending.forEach((req) => {
          if (!req.timestamp) {
            console.error(`⚠️ Request ${req.id} is missing timestamp!`, req);
          } else {
            console.log(
              `✅ Request ${req.id} has timestamp: ${req.timestamp} (${new Date(
                req.timestamp
              ).toLocaleString()})`
            );
          }
        });

        setPendingRequests(pending);
      } else {
        setPendingRequests([]);
      }
    });

    return () => unsubscribe();
  }, [currentRickshawId, rickshaws]);

  // Listen for active rides (updated for AERAS)
  useEffect(() => {
    if (!currentRickshawId) {
      setActiveRide(null);
      return;
    }

    const activeRidesRef = ref(database, "active_rides");
    const unsubscribe = onValue(activeRidesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const active = Object.values(data).find(
          (ride) =>
            ride.rickshaw_id === currentRickshawId &&
            (ride.status === "accepted" || ride.status === "picked_up")
        );
        setActiveRide(active || null);
      } else {
        setActiveRide(null);
      }
    });

    return () => unsubscribe();
  }, [currentRickshawId]);

  // Load ride history (updated for AERAS)
  useEffect(() => {
    if (!currentRickshawId) {
      setRideHistory([]);
      return;
    }

    const completedRidesRef = ref(database, "completed_rides");
    const unsubscribe = onValue(completedRidesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const history = Object.values(data)
          .filter((ride) => ride.rickshaw_id === currentRickshawId)
          .sort((a, b) => b.dropoff_time - a.dropoff_time)
          .slice(0, 10);
        setRideHistory(history);
        console.log(`✅ Loaded ${history.length} completed rides`);
      } else {
        setRideHistory([]);
      }
    });

    return () => unsubscribe();
  }, [currentRickshawId]);

  // Show welcome toast on mount
  useEffect(() => {
    showToast("Welcome to Smart Rickshaw Dashboard!");
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleRickshawSelection = (rickshawId) => {
    setCurrentRickshawId(rickshawId || null);
    if (rickshawId) {
      console.log(`Selected rickshaw: ${rickshawId}`);
    }
  };

  return (
    <div className="app">
      <Header
        rickshaws={rickshaws}
        currentRickshawId={currentRickshawId}
        currentRickshaw={currentRickshaw}
        onRickshawSelect={handleRickshawSelection}
      />

      <main className="main-content">
        <div className="container">
          {/* Testing Toggle Button */}
          <div className="testing-toggle">
            <button
              className={`btn ${showTesting ? "btn-danger" : "btn-info"}`}
              onClick={() => setShowTesting(!showTesting)}
            >
              <i className={`fas ${showTesting ? "fa-times" : "fa-flask"}`}></i>
              {showTesting ? "Close Testing" : "Run Automated Tests"}
            </button>
          </div>

          {showTesting ? (
            <TestRunner />
          ) : (
            <>
              <StatisticsCards currentRickshaw={currentRickshaw} />

              {activeRide && (
                <ActiveRide
                  activeRide={activeRide}
                  currentRickshawId={currentRickshawId}
                  currentRickshaw={currentRickshaw}
                  showToast={showToast}
                />
              )}

              <RideRequests
                pendingRequests={pendingRequests}
                currentRickshawId={currentRickshawId}
                showToast={showToast}
              />

              <RideHistory rideHistory={rideHistory} />
            </>
          )}
        </div>
      </main>

      <Footer isConnected={isConnected} />

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}

export default App;
