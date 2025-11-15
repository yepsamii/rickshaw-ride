const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'test_privacy.db');
const db = new sqlite3.Database(dbPath);

async function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function getRow(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function testPrivacyCompliance() {
    console.log('Test (e): Privacy Compliance - Auto-anonymization after 1 year');
    
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    await new Promise((resolve, reject) => {
        db.exec(schema, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    
    console.log('Creating test users with different ages...');
    await runQuery("INSERT INTO users (id, name, age, user_type, laser_id, created_at) VALUES ('user_old', 'Ahmed Hassan', 70, 'senior_citizen', 'LASER_OLD', datetime('now', '-400 days'))");
    await runQuery("INSERT INTO users (id, name, age, user_type, laser_id, created_at) VALUES ('user_recent', 'Fatima Begum', 68, 'senior_citizen', 'LASER_RECENT', datetime('now', '-100 days'))");
    await runQuery("INSERT INTO users (id, name, age, user_type, laser_id, created_at) VALUES ('user_very_old', 'Rahim Khan', 72, 'senior_citizen', 'LASER_VOLD', datetime('now', '-500 days'))");
    
    const anonymizationQuery = `
        UPDATE users
        SET 
            name = 'Anonymous User',
            laser_id = 'ANON_' || substr(id, -6),
            age = NULL,
            anonymized_at = CURRENT_TIMESTAMP
        WHERE 
            created_at <= datetime('now', '-365 days')
            AND anonymized_at IS NULL
    `;
    
    console.log('\nRunning anonymization for users older than 1 year...');
    await runQuery(anonymizationQuery);
    
    const oldUser = await getRow("SELECT * FROM users WHERE id = 'user_old'");
    const recentUser = await getRow("SELECT * FROM users WHERE id = 'user_recent'");
    const veryOldUser = await getRow("SELECT * FROM users WHERE id = 'user_very_old'");
    
    console.log('\nUser 1 (400 days old):');
    console.log(`  Name: ${oldUser.name}`);
    console.log(`  Laser ID: ${oldUser.laser_id}`);
    console.log(`  Age: ${oldUser.age}`);
    console.log(`  Anonymized: ${oldUser.anonymized_at ? 'Yes' : 'No'}`);
    
    console.log('\nUser 2 (100 days old):');
    console.log(`  Name: ${recentUser.name}`);
    console.log(`  Laser ID: ${recentUser.laser_id}`);
    console.log(`  Age: ${recentUser.age}`);
    console.log(`  Anonymized: ${recentUser.anonymized_at ? 'Yes' : 'No'}`);
    
    console.log('\nUser 3 (500 days old):');
    console.log(`  Name: ${veryOldUser.name}`);
    console.log(`  Laser ID: ${veryOldUser.laser_id}`);
    console.log(`  Age: ${veryOldUser.age}`);
    console.log(`  Anonymized: ${veryOldUser.anonymized_at ? 'Yes' : 'No'}`);
    
    const anonymizedCount = await getRow("SELECT COUNT(*) as count FROM users WHERE anonymized_at IS NOT NULL");
    
    console.log(`\n✓ Total users anonymized: ${anonymizedCount.count}`);
    console.log(`✓ Result: ${anonymizedCount.count === 2 && !recentUser.anonymized_at ? 'PASS - Auto-anonymization working correctly' : 'FAIL - Anonymization logic error'}`);
    
    db.close();
}

testPrivacyCompliance().catch(console.error);

