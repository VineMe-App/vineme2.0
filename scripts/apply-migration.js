#!/usr/bin/env node

/**
 * Simple script to apply database migrations
 * This is a development utility - in production, use proper migration tools
 */

const fs = require('fs');
const path = require('path');

async function applyMigration() {
  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_enhanced_notifications.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Enhanced Notifications Migration SQL:');
    console.log('=====================================');
    console.log(migrationSQL);
    console.log('=====================================');
    console.log('\nTo apply this migration:');
    console.log('1. Copy the SQL above');
    console.log('2. Open your Supabase project dashboard');
    console.log('3. Go to SQL Editor');
    console.log('4. Paste and run the SQL');
    console.log('\nOr use Supabase CLI:');
    console.log('supabase db reset (for local development)');
    console.log('supabase db push (for remote deployment)');
    
  } catch (error) {
    console.error('Error reading migration file:', error);
    process.exit(1);
  }
}

applyMigration();