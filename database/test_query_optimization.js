const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'test_query_opt.db');
const db = new sqlite3.Database(dbPath);

async function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function getAllRows(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function testQueryOptimization() {
    console.log('Test (c): Query Optimization - Retrieve ride history for last 30 days');
    
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
    
    console.log('Inserting 1000 ride records...');
    const now = Date.now();
    for (let i = 0; i < 1000; i++) {
        const daysAgo = Math.floor(Math.random() * 60);
        const timestamp = now - (daysAgo * 24 * 60 * 60 * 1000);
        await runQuery(`
            INSERT INTO rides (id, user_id, rickshaw_id, pickup_block, dropoff_block, distance_km, fare, status, dropoff_time) 
            VALUES ('ride_${i+1}', 'user_1', 'rickshaw_1', 'block_a', 'block_b', ${Math.random() * 10}, ${50 + Math.random() * 200}, 'completed', ${timestamp})
        `);
    }
    
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const query = `
        SELECT r.id, r.fare, r.distance_km, r.status, r.dropoff_time,
               u.name as user_name, u.user_type,
               rk.puller_name, rk.rating,
               lb1.name as pickup_block, lb2.name as dropoff_block
        FROM rides r
        JOIN users u ON r.user_id = u.id
        JOIN rickshaws rk ON r.rickshaw_id = rk.id
        JOIN location_blocks lb1 ON r.pickup_block = lb1.id
        JOIN location_blocks lb2 ON r.dropoff_block = lb2.id
        WHERE r.dropoff_time >= ${thirtyDaysAgo}
        ORDER BY r.dropoff_time DESC
    `;
    
    const startTime = Date.now();
    const results = await getAllRows(query);
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log(`✓ Query executed in ${executionTime}ms`);
    console.log(`✓ Records retrieved: ${results.length}`);
    console.log(`✓ Result: ${executionTime < 2000 ? 'PASS - Query under 2 seconds' : 'FAIL - Query too slow'}`);
    
    const explainQuery = await getAllRows(`EXPLAIN QUERY PLAN ${query}`);
    console.log('✓ Query plan uses indexes:', explainQuery.some(row => row.detail.includes('idx_rides')));
    
    db.close();
}

testQueryOptimization().catch(console.error);

