const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'test_concurrent.db');
const db = new sqlite3.Database(dbPath);

async function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function getCount(table) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
        });
    });
}

async function testConcurrentWrites() {
    console.log('Test (a): Concurrent Writes - 10 rides completing simultaneously');
    
    const fs = require('fs');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
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
    
    for (let i = 0; i < 10; i++) {
        await runQuery(`
            INSERT INTO rides (id, user_id, rickshaw_id, pickup_block, dropoff_block, distance_km, fare, status, request_time) 
            VALUES ('ride_${i+1}', 'user_1', 'rickshaw_1', 'block_a', 'block_b', 2.5, 40, 'active', ${Date.now() - 1800000})
        `);
    }
    
    const promises = [];
    for (let i = 1; i <= 10; i++) {
        promises.push(
            runQuery(`
                UPDATE rides 
                SET status = 'completed', dropoff_time = ?
                WHERE id = ?
            `, [Date.now(), `ride_${i}`])
        );
    }
    
    const startTime = Date.now();
    await Promise.all(promises);
    const endTime = Date.now();
    
    const completedCount = await getCount("rides WHERE status = 'completed'");
    const historyCount = await getCount("rides_history WHERE operation = 'UPDATE'");
    
    console.log(`✓ Concurrent writes completed in ${endTime - startTime}ms`);
    console.log(`✓ Total rides: 10, Completed: ${completedCount}`);
    console.log(`✓ History records created: ${historyCount}`);
    console.log(`✓ Result: ${completedCount === 10 && historyCount === 10 ? 'PASS - No data loss' : 'FAIL - Data loss detected'}`);
    
    db.close();
}

testConcurrentWrites().catch(console.error);

