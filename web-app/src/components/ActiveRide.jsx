import React, { useState } from 'react';
import { ref, update, get, remove } from 'firebase/database';
import { database } from '../firebase';
import { getLocationName } from '../utils/helpers';

function ActiveRide({ activeRide, currentRickshawId, currentRickshaw, showToast }) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Calculate distance between two GPS coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  };

  // Calculate points based on GPS accuracy (Test Case 7)
  const calculatePoints = (distanceFromBlock) => {
    const basePoints = 10;
    const distancePenalty = distanceFromBlock / 10.0;
    const finalPoints = Math.max(0, Math.floor(basePoints - distancePenalty));
    
    let pointsStatus;
    if (distanceFromBlock <= 10) {
      pointsStatus = 'rewarded'; // Exact location - Full reward
    } else if (distanceFromBlock <= 50) {
      pointsStatus = 'rewarded'; // Within 50m - Partial reward
    } else if (distanceFromBlock <= 100) {
      pointsStatus = 'reduced'; // 51-100m - Reduced reward
    } else {
      pointsStatus = 'pending'; // >100m - Admin review required
    }
    
    return { finalPoints, pointsStatus, distancePenalty };
  };

  const handleConfirmPickup = async () => {
    if (!activeRide) return;

    console.log('Confirming pickup');

    try {
      // Get current GPS location
      setIsGettingLocation(true);
      const position = await getCurrentPosition();
      setIsGettingLocation(false);

      const pickupLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      // Update database - Set Green LED ON
      const updates = {};
      updates[`active_rides/${activeRide.id}/status`] = 'picked_up';
      updates[`active_rides/${activeRide.id}/pickup_time`] = Date.now();
      updates[`active_rides/${activeRide.id}/pickup_location`] = pickupLocation;
      updates[`ride_requests/${activeRide.request_id}/led_status`] = 'pickup_confirmed'; // Green LED ON

      await update(ref(database), updates);
      
      showToast('Pickup confirmed! User has been notified');
      console.log('✅ Pickup confirmed - User notified');
      
    } catch (error) {
      setIsGettingLocation(false);
      if (error.code === 1) {
        showToast('Location permission denied. Confirming without GPS.', 'warning');
        // Confirm without GPS
        const updates = {};
        updates[`active_rides/${activeRide.id}/status`] = 'picked_up';
        updates[`active_rides/${activeRide.id}/pickup_time`] = Date.now();
        updates[`ride_requests/${activeRide.request_id}/led_status`] = 'pickup_confirmed';
        await update(ref(database), updates);
      } else {
        showToast('Error confirming pickup', 'error');
        console.error('❌ Error:', error);
      }
    }
  };

  const handleConfirmDropoff = async () => {
    if (!activeRide) return;

    console.log('Confirming drop-off with GPS verification');

    try {
      // Get current GPS location
      setIsGettingLocation(true);
      const position = await getCurrentPosition();
      setIsGettingLocation(false);

      const dropoffLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      // Get destination block coordinates
      const blockRef = ref(database, `location_blocks/${activeRide.dropoff_block}/coordinates`);
      const blockSnapshot = await get(blockRef);
      const blockCoords = blockSnapshot.val();

      if (!blockCoords) {
        showToast('Error: Destination block not found', 'error');
        return;
      }

      // Calculate distance from destination block
      const distanceFromBlock = calculateDistance(
        dropoffLocation.lat,
        dropoffLocation.lng,
        blockCoords.lat,
        blockCoords.lng
      );

      // Calculate points based on accuracy
      const { finalPoints, pointsStatus, distancePenalty } = calculatePoints(distanceFromBlock);

      console.log(`📍 Drop-off distance: ${distanceFromBlock.toFixed(2)}m`);
      console.log(`⭐ Points: ${finalPoints} (Status: ${pointsStatus})`);

      // Create points history entry
      const pointsHistoryId = `ph_${Date.now()}`;
      const pointsHistory = {
        id: pointsHistoryId,
        ride_id: activeRide.id,
        rickshaw_id: currentRickshawId,
        base_points: 10,
        distance_penalty: distancePenalty,
        final_points: finalPoints,
        status: pointsStatus,
        gps_accuracy: distanceFromBlock,
        timestamp: Date.now(),
        admin_reviewed: false
      };

      // Prepare updates
      const updates = {};
      
      // Update active ride to completed
      updates[`active_rides/${activeRide.id}/status`] = 'completed';
      updates[`active_rides/${activeRide.id}/dropoff_time`] = Date.now();
      updates[`active_rides/${activeRide.id}/dropoff_location`] = dropoffLocation;
      updates[`active_rides/${activeRide.id}/dropoff_distance_from_block`] = distanceFromBlock;
      updates[`active_rides/${activeRide.id}/points_earned`] = finalPoints;
      updates[`active_rides/${activeRide.id}/points_status`] = pointsStatus;

      // Move to completed rides
      const completedRide = {
        ...activeRide,
        status: 'completed',
        dropoff_time: Date.now(),
        dropoff_location: dropoffLocation,
        dropoff_distance_from_block: distanceFromBlock,
        points_earned: finalPoints,
        points_status: pointsStatus
      };
      updates[`completed_rides/${activeRide.id}`] = completedRide;

      // Add points history
      updates[`points_history/${pointsHistoryId}`] = pointsHistory;

      // Update rickshaw status and points (only if not pending review)
      updates[`rickshaws/${currentRickshawId}/status`] = 'available';
      updates[`rickshaws/${currentRickshawId}/total_rides`] = (currentRickshaw.total_rides || 0) + 1;
      
      if (pointsStatus === 'rewarded' || pointsStatus === 'reduced') {
        updates[`rickshaws/${currentRickshawId}/total_points`] = 
          (currentRickshaw.total_points || 0) + finalPoints;
      }

      // Remove from active rides and requests
      await update(ref(database), updates);
      await remove(ref(database, `active_rides/${activeRide.id}`));
      await remove(ref(database, `ride_requests/${activeRide.request_id}`));

      // Show appropriate message
      if (pointsStatus === 'rewarded') {
        showToast(`✅ Ride completed! +${finalPoints} points earned!`, 'success');
        setTimeout(() => {
          alert(
            `🎉 Ride Completed!\n\n` +
            `Distance from block: ${distanceFromBlock.toFixed(2)}m\n` +
            `Points Earned: +${finalPoints}\n` +
            `Fare: ৳${activeRide.fare}\n` +
            `Distance: ${activeRide.distance_km} km\n\n` +
            `Status: ${pointsStatus.toUpperCase()}\n` +
            `You're now available for new requests!`
          );
        }, 500);
      } else if (pointsStatus === 'reduced') {
        showToast(`⚠️ Ride completed. ${finalPoints} points (reduced due to distance)`, 'warning');
        setTimeout(() => {
          alert(
            `⚠️ Ride Completed with Reduced Points\n\n` +
            `Distance from block: ${distanceFromBlock.toFixed(2)}m\n` +
            `Points Earned: +${finalPoints} (Reduced)\n` +
            `Fare: ৳${activeRide.fare}\n\n` +
            `Note: Drop-off was ${distanceFromBlock.toFixed(0)}m from destination.\n` +
            `Try to drop closer to the block for full points!`
          );
        }, 500);
      } else {
        showToast(`⏳ Ride completed. Points PENDING admin review`, 'warning');
        setTimeout(() => {
          alert(
            `⏳ Ride Completed - PENDING REVIEW\n\n` +
            `Distance from block: ${distanceFromBlock.toFixed(2)}m\n` +
            `Points: PENDING (Admin review required)\n` +
            `Fare: ৳${activeRide.fare}\n\n` +
            `Note: Drop-off was too far (>${distanceFromBlock.toFixed(0)}m).\n` +
            `An admin will review and award points if valid.`
          );
        }, 500);
      }

      console.log('✅ Drop-off confirmed with GPS verification');
      
    } catch (error) {
      setIsGettingLocation(false);
      if (error.code === 1) {
        // GPS permission denied - Manual verification mode
        showToast('GPS unavailable - Manual verification required', 'warning');
        
        const updates = {};
        updates[`active_rides/${activeRide.id}/status`] = 'manual_verification_required';
        updates[`active_rides/${activeRide.id}/gps_available`] = false;
        await update(ref(database), updates);
        
        alert(
          `⚠️ GPS Signal Lost\n\n` +
          `Manual verification required.\n` +
          `An admin will verify drop-off location and award points.`
        );
      } else {
        showToast('Error confirming drop-off', 'error');
        console.error('❌ Error:', error);
      }
    }
  };

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const pickupName = getLocationName(activeRide.pickup_block);
  const dropoffName = getLocationName(activeRide.dropoff_block);
  const isPickedUp = activeRide.status === 'picked_up';

  return (
    <section className="active-ride-section">
      <div className="section-header">
        <h2>
          <i className="fas fa-car"></i> Active Ride
        </h2>
        <span className="badge badge-success">
          {isPickedUp ? 'In Progress' : 'Accepted'}
        </span>
      </div>
      <div className="active-ride-card">
        <div className="ride-route">
          <div className="ride-location">
            <h3>From</h3>
            <p>{pickupName}</p>
          </div>
          <div className="ride-arrow">
            <i className="fas fa-arrow-right"></i>
          </div>
          <div className="ride-location">
            <h3>To</h3>
            <p>{dropoffName}</p>
          </div>
        </div>

        <div className="ride-details">
          <div className="ride-detail-item">
            <i className="fas fa-route"></i>
            <p>Distance</p>
            <strong>{activeRide.distance_km} km</strong>
          </div>
          <div className="ride-detail-item">
            <i className="fas fa-money-bill-wave"></i>
            <p>Fare</p>
            <strong>৳{activeRide.fare}</strong>
          </div>
          <div className="ride-detail-item">
            <i className="fas fa-star"></i>
            <p>Points (Est.)</p>
            <strong>Up to +10</strong>
          </div>
        </div>

        {!isPickedUp && (
          <div className="ride-status-info">
            <i className="fas fa-info-circle"></i>
            <p>Navigate to pickup location and confirm when arrived.</p>
          </div>
        )}

        {isPickedUp && (
          <div className="ride-status-info">
            <i className="fas fa-check-circle"></i>
            <p>User picked up. Drive to destination.</p>
          </div>
        )}

        <div className="ride-actions">
          {!isPickedUp ? (
            <button 
              className="btn btn-success btn-block" 
              onClick={handleConfirmPickup}
              disabled={isGettingLocation}
            >
              <i className="fas fa-user-check"></i> 
              {isGettingLocation ? 'Getting GPS...' : 'Confirm Pickup'}
            </button>
          ) : (
            <button 
              className="btn btn-success btn-block" 
              onClick={handleConfirmDropoff}
              disabled={isGettingLocation}
            >
              <i className="fas fa-flag-checkered"></i> 
              {isGettingLocation ? 'Verifying GPS...' : 'Confirm Drop-off (GPS Verify)'}
            </button>
          )}
        </div>

        <div className="gps-info">
          <small>
            <i className="fas fa-map-marker-alt"></i> GPS verification enabled. 
            Points calculated based on drop-off accuracy (±50m radius).
          </small>
        </div>
      </div>
    </section>
  );
}

export default ActiveRide;

