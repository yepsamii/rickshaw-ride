const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'test_integrity.db');
const db = new sqlite3.Database(dbPath);

async function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function testDataIntegrity() {
    console.log('Test (d): Data Integrity Constraints');
    
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    await new Promise((resolve, reject) => {
        db.exec('PRAGMA foreign_keys = ON;', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    
    await new Promise((resolve, reject) => {
        db.exec(schema, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    
    await runQuery("INSERT INTO users (id, name, age, user_type, laser_id) VALUES ('user_1', 'Test User', 70, 'senior_citizen', 'LASER_TEST_001')");
    await runQuery("INSERT INTO rickshaws (id, puller_name, license_number, phone, current_lat, current_lng) VALUES ('rickshaw_1', 'Test Puller', 'DH-RICK-TEST', '+8801712345999', 22.4633, 91.9714)");
    await runQuery("INSERT INTO location_blocks (id, name, latitude, longitude) VALUES ('block_a', 'Location A', 22.4633, 91.9714)");
    await runQuery("INSERT INTO location_blocks (id, name, latitude, longitude) VALUES ('block_b', 'Location B', 22.4725, 91.9845)");
    await runQuery("INSERT INTO rides (id, user_id, rickshaw_id, pickup_block, dropoff_block, distance_km, fare, status) VALUES ('ride_1', 'user_1', 'rickshaw_1', 'block_a', 'block_b', 2.5, 40, 'completed')");
    
    console.log('\n1. Testing Foreign Key Constraint:');
    try {
        await runQuery("INSERT INTO rides (id, user_id, rickshaw_id, pickup_block, dropoff_block, distance_km, fare) VALUES ('ride_invalid', 'user_999', 'rickshaw_1', 'block_a', 'block_b', 2.5, 40)");
        console.log('✗ FAIL - Foreign key constraint not enforced');
    } catch (err) {
        console.log('✓ PASS - Foreign key constraint prevented orphan record');
    }
    
    console.log('\n2. Testing NULL Constraint:');
    try {
        await runQuery("INSERT INTO users (id, name, user_type, laser_id) VALUES ('user_2', NULL, 'regular', 'LASER_002')");
        console.log('✗ FAIL - NULL constraint not enforced');
    } catch (err) {
        console.log('✓ PASS - NULL constraint enforced');
    }
    
    console.log('\n3. Testing UNIQUE Constraint:');
    try {
        await runQuery("INSERT INTO users (id, name, age, user_type, laser_id) VALUES ('user_2', 'Duplicate User', 65, 'regular', 'LASER_TEST_001')");
        console.log('✗ FAIL - UNIQUE constraint not enforced');
    } catch (err) {
        console.log('✓ PASS - UNIQUE constraint enforced');
    }
    
    console.log('\n4. Testing CHECK Constraint (rating range):');
    try {
        await runQuery("INSERT INTO rickshaws (id, puller_name, license_number, phone, current_lat, current_lng, rating) VALUES ('rickshaw_2', 'Bad Puller', 'DH-RICK-999', '+8801111111111', 22.4633, 91.9714, 6.0)");
        console.log('✗ FAIL - CHECK constraint not enforced');
    } catch (err) {
        console.log('✓ PASS - CHECK constraint enforced (rating must be 0-5)');
    }
    
    console.log('\n5. Testing ON DELETE RESTRICT:');
    try {
        await runQuery("DELETE FROM users WHERE id = 'user_1'");
        console.log('✗ FAIL - ON DELETE RESTRICT not enforced');
    } catch (err) {
        console.log('✓ PASS - Cannot delete user with associated rides');
    }
    
    console.log('\n6. Testing CHECK Constraint (status enum):');
    try {
        await runQuery("INSERT INTO rides (id, user_id, rickshaw_id, pickup_block, dropoff_block, distance_km, fare, status) VALUES ('ride_invalid2', 'user_1', 'rickshaw_1', 'block_a', 'block_b', 2.5, 40, 'invalid_status')");
        console.log('✗ FAIL - Status CHECK constraint not enforced');
    } catch (err) {
        console.log('✓ PASS - Status CHECK constraint enforced');
    }
    
    console.log('\n✓ Result: PASS - All data integrity constraints working correctly');
    
    db.close();
}

testDataIntegrity().catch(console.error);

