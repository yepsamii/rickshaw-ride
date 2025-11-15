#!/bin/bash

DB_PATH="./database.db"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.db"

mkdir -p $BACKUP_DIR

echo "Test (b): Database Backup and Recovery"
echo "========================================"

if [ ! -f "$DB_PATH" ]; then
    echo "Creating test database..."
    sqlite3 $DB_PATH < schema.sql
    sqlite3 $DB_PATH "INSERT INTO users (id, name, age, user_type, laser_id) VALUES ('user_1', 'Test User', 70, 'senior_citizen', 'LASER_TEST_001');"
    sqlite3 $DB_PATH "INSERT INTO rickshaws (id, puller_name, license_number, phone, current_lat, current_lng) VALUES ('rickshaw_1', 'Test Puller', 'DH-RICK-TEST', '+8801712345999', 22.4633, 91.9714);"
fi

echo "Original record count:"
ORIGINAL_COUNT=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM users;")
echo "Users: $ORIGINAL_COUNT"

echo ""
echo "Creating backup..."
cp $DB_PATH $BACKUP_FILE
echo "✓ Backup created: $BACKUP_FILE"

echo ""
echo "Simulating data loss..."
sqlite3 $DB_PATH "DELETE FROM users;"
AFTER_DELETE=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM users;")
echo "Users after deletion: $AFTER_DELETE"

echo ""
echo "Restoring from backup..."
cp $BACKUP_FILE $DB_PATH
RESTORED_COUNT=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM users;")
echo "Users after restore: $RESTORED_COUNT"

echo ""
if [ "$ORIGINAL_COUNT" -eq "$RESTORED_COUNT" ]; then
    echo "✓ Result: PASS - Backup and recovery successful"
else
    echo "✗ Result: FAIL - Data not fully restored"
fi

echo ""
echo "Daily automated backup cron job (add to crontab):"
echo "0 2 * * * cd $(pwd) && ./backup_recovery.sh backup"

if [ "$1" = "backup" ]; then
    echo "Running automated daily backup..."
    cp $DB_PATH $BACKUP_FILE
    
    echo "Cleaning old backups (keeping last 30 days)..."
    find $BACKUP_DIR -name "backup_*.db" -mtime +30 -delete
    
    echo "✓ Automated backup completed: $BACKUP_FILE"
fi

