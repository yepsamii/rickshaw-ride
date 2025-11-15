-- Main Tables
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    user_type TEXT NOT NULL CHECK (user_type IN ('senior_citizen', 'special_needs', 'regular')),
    laser_id TEXT UNIQUE NOT NULL,
    privilege_verified INTEGER DEFAULT 0,
    total_rides INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    anonymized_at TIMESTAMP,
    CHECK (age > 0 AND age < 150)
);

CREATE TABLE location_blocks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    busy INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    CHECK (latitude BETWEEN -90 AND 90),
    CHECK (longitude BETWEEN -180 AND 180)
);

CREATE TABLE rickshaws (
    id TEXT PRIMARY KEY,
    puller_name TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    current_lat REAL NOT NULL,
    current_lng REAL NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'offline')),
    total_points INTEGER DEFAULT 0,
    total_rides INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (rating >= 0 AND rating <= 5),
    CHECK (phone IS NOT NULL AND length(phone) >= 10)
);

CREATE TABLE ride_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    pickup_block TEXT NOT NULL,
    dropoff_block TEXT NOT NULL,
    distance_km REAL NOT NULL,
    estimated_fare REAL NOT NULL,
    estimated_points INTEGER NOT NULL,
    privilege_verified INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    timestamp BIGINT NOT NULL,
    rejected_by TEXT DEFAULT '[]',
    assigned_rickshaw TEXT,
    led_status TEXT DEFAULT 'waiting' CHECK (led_status IN ('waiting', 'assigned', 'cancelled')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (pickup_block) REFERENCES location_blocks(id) ON DELETE RESTRICT,
    FOREIGN KEY (dropoff_block) REFERENCES location_blocks(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_rickshaw) REFERENCES rickshaws(id) ON DELETE SET NULL
);

CREATE TABLE rides (
    id TEXT PRIMARY KEY,
    request_id TEXT,
    user_id TEXT NOT NULL,
    rickshaw_id TEXT NOT NULL,
    pickup_block TEXT NOT NULL,
    dropoff_block TEXT NOT NULL,
    distance_km REAL NOT NULL,
    fare REAL NOT NULL,
    points_earned INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    request_time BIGINT,
    accept_time BIGINT,
    pickup_time BIGINT,
    dropoff_time BIGINT,
    pickup_lat REAL,
    pickup_lng REAL,
    pickup_accuracy REAL,
    dropoff_lat REAL,
    dropoff_lng REAL,
    dropoff_accuracy REAL,
    dropoff_distance_from_block REAL,
    points_status TEXT DEFAULT 'pending' CHECK (points_status IN ('pending', 'rewarded', 'reduced', 'denied')),
    FOREIGN KEY (request_id) REFERENCES ride_requests(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (rickshaw_id) REFERENCES rickshaws(id) ON DELETE RESTRICT,
    FOREIGN KEY (pickup_block) REFERENCES location_blocks(id) ON DELETE RESTRICT,
    FOREIGN KEY (dropoff_block) REFERENCES location_blocks(id) ON DELETE RESTRICT,
    CHECK (fare >= 0),
    CHECK (distance_km >= 0)
);

CREATE TABLE points_history (
    id TEXT PRIMARY KEY,
    ride_id TEXT NOT NULL,
    rickshaw_id TEXT NOT NULL,
    base_points INTEGER NOT NULL,
    distance_penalty REAL DEFAULT 0,
    final_points INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'rewarded', 'reduced', 'denied')),
    gps_accuracy REAL,
    timestamp BIGINT NOT NULL,
    admin_reviewed INTEGER DEFAULT 0,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (rickshaw_id) REFERENCES rickshaws(id) ON DELETE RESTRICT
);

CREATE TABLE fare_matrix (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_block TEXT NOT NULL,
    to_block TEXT NOT NULL,
    distance_km REAL NOT NULL,
    base_fare REAL NOT NULL,
    points INTEGER NOT NULL,
    FOREIGN KEY (from_block) REFERENCES location_blocks(id) ON DELETE CASCADE,
    FOREIGN KEY (to_block) REFERENCES location_blocks(id) ON DELETE CASCADE,
    UNIQUE (from_block, to_block)
);

-- History Tables
CREATE TABLE users_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL,
    name TEXT,
    age INTEGER,
    user_type TEXT,
    laser_id TEXT,
    privilege_verified INTEGER,
    total_rides INTEGER,
    created_at TIMESTAMP,
    anonymized_at TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operation TEXT NOT NULL
);

CREATE TABLE rickshaws_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL,
    puller_name TEXT,
    license_number TEXT,
    phone TEXT,
    current_lat REAL,
    current_lng REAL,
    status TEXT,
    total_points INTEGER,
    total_rides INTEGER,
    rating REAL,
    created_at TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operation TEXT NOT NULL
);

CREATE TABLE rides_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL,
    request_id TEXT,
    user_id TEXT,
    rickshaw_id TEXT,
    pickup_block TEXT,
    dropoff_block TEXT,
    distance_km REAL,
    fare REAL,
    points_earned INTEGER,
    status TEXT,
    request_time BIGINT,
    accept_time BIGINT,
    pickup_time BIGINT,
    dropoff_time BIGINT,
    points_status TEXT,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operation TEXT NOT NULL
);

-- Indexes for Query Optimization
CREATE INDEX idx_rides_user_dropoff ON rides(user_id, dropoff_time DESC);
CREATE INDEX idx_rides_rickshaw_dropoff ON rides(rickshaw_id, dropoff_time DESC);
CREATE INDEX idx_rides_dropoff_time ON rides(dropoff_time DESC);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_ride_requests_status ON ride_requests(status);
CREATE INDEX idx_ride_requests_user ON ride_requests(user_id);
CREATE INDEX idx_points_history_rickshaw ON points_history(rickshaw_id);
CREATE INDEX idx_points_history_ride ON points_history(ride_id);
CREATE INDEX idx_users_laser ON users(laser_id);
CREATE INDEX idx_users_anonymized ON users(anonymized_at);
CREATE INDEX idx_rickshaws_status ON rickshaws(status);

-- Triggers for History Tables
CREATE TRIGGER users_after_update
AFTER UPDATE ON users
BEGIN
    INSERT INTO users_history (id, name, age, user_type, laser_id, privilege_verified, total_rides, created_at, anonymized_at, operation)
    VALUES (OLD.id, OLD.name, OLD.age, OLD.user_type, OLD.laser_id, OLD.privilege_verified, OLD.total_rides, OLD.created_at, OLD.anonymized_at, 'UPDATE');
END;

CREATE TRIGGER users_after_delete
AFTER DELETE ON users
BEGIN
    INSERT INTO users_history (id, name, age, user_type, laser_id, privilege_verified, total_rides, created_at, anonymized_at, operation)
    VALUES (OLD.id, OLD.name, OLD.age, OLD.user_type, OLD.laser_id, OLD.privilege_verified, OLD.total_rides, OLD.created_at, OLD.anonymized_at, 'DELETE');
END;

CREATE TRIGGER rickshaws_after_update
AFTER UPDATE ON rickshaws
BEGIN
    INSERT INTO rickshaws_history (id, puller_name, license_number, phone, current_lat, current_lng, status, total_points, total_rides, rating, created_at, operation)
    VALUES (OLD.id, OLD.puller_name, OLD.license_number, OLD.phone, OLD.current_lat, OLD.current_lng, OLD.status, OLD.total_points, OLD.total_rides, OLD.rating, OLD.created_at, 'UPDATE');
END;

CREATE TRIGGER rickshaws_after_delete
AFTER DELETE ON rickshaws
BEGIN
    INSERT INTO rickshaws_history (id, puller_name, license_number, phone, current_lat, current_lng, status, total_points, total_rides, rating, created_at, operation)
    VALUES (OLD.id, OLD.puller_name, OLD.license_number, OLD.phone, OLD.current_lat, OLD.current_lng, OLD.status, OLD.total_points, OLD.total_rides, OLD.rating, OLD.created_at, 'UPDATE');
END;

CREATE TRIGGER rides_after_update
AFTER UPDATE ON rides
BEGIN
    INSERT INTO rides_history (id, request_id, user_id, rickshaw_id, pickup_block, dropoff_block, distance_km, fare, points_earned, status, request_time, accept_time, pickup_time, dropoff_time, points_status, operation)
    VALUES (OLD.id, OLD.request_id, OLD.user_id, OLD.rickshaw_id, OLD.pickup_block, OLD.dropoff_block, OLD.distance_km, OLD.fare, OLD.points_earned, OLD.status, OLD.request_time, OLD.accept_time, OLD.pickup_time, OLD.dropoff_time, OLD.points_status, 'UPDATE');
END;

CREATE TRIGGER rides_after_delete
AFTER DELETE ON rides
BEGIN
    INSERT INTO rides_history (id, request_id, user_id, rickshaw_id, pickup_block, dropoff_block, distance_km, fare, points_earned, status, request_time, accept_time, pickup_time, dropoff_time, points_status, operation)
    VALUES (OLD.id, OLD.request_id, OLD.user_id, OLD.rickshaw_id, OLD.pickup_block, OLD.dropoff_block, OLD.distance_km, OLD.fare, OLD.points_earned, OLD.status, OLD.request_time, OLD.accept_time, OLD.pickup_time, OLD.dropoff_time, OLD.points_status, 'DELETE');
END;

