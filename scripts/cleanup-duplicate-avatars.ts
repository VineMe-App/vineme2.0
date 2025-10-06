/**
 * Cleanup script to remove duplicate avatar files from profile-images bucket
 * 
 * This script:
 * 1. Finds all users with avatar_url in the database
 * 2. Lists all files in their profile-images folder
 * 3. Deletes files that don't match their current avatar_url
 * 
 * Run with: npx ts-node scripts/cleanup-duplicate-avatars.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin access

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDuplicateAvatars() {
  console.log('🧹 Starting cleanup of duplicate avatar files...\n');

  try {
    // Get all users with avatars
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .not('avatar_url', 'is', null);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    console.log(`Found ${users.length} users with avatars\n`);

    let totalDeleted = 0;

    for (const user of users) {
      console.log(`Processing user: ${user.name} (${user.id})`);
      
      // Extract the filename from the avatar_url
      const urlParts = user.avatar_url.split('/');
      const currentFileName = urlParts[urlParts.length - 1];
      console.log(`  Current avatar: ${currentFileName}`);

      // List all files in user's folder
      const { data: files, error: listError } = await supabase.storage
        .from('profile-images')
        .list(user.id);

      if (listError) {
        console.error(`  ❌ Error listing files: ${listError.message}`);
        continue;
      }

      if (!files || files.length === 0) {
        console.log(`  ℹ️  No files found in storage`);
        continue;
      }

      console.log(`  Found ${files.length} file(s) in storage`);

      // Find files to delete (all except the current one)
      const filesToDelete = files
        .filter((file) => file.name !== currentFileName)
        .map((file) => `${user.id}/${file.name}`);

      if (filesToDelete.length === 0) {
        console.log(`  ✅ No duplicates to delete`);
        continue;
      }

      console.log(`  🗑️  Deleting ${filesToDelete.length} duplicate(s): ${filesToDelete.join(', ')}`);

      const { error: deleteError } = await supabase.storage
        .from('profile-images')
        .remove(filesToDelete);

      if (deleteError) {
        console.error(`  ❌ Error deleting files: ${deleteError.message}`);
      } else {
        console.log(`  ✅ Successfully deleted ${filesToDelete.length} file(s)`);
        totalDeleted += filesToDelete.length;
      }

      console.log(''); // Empty line for readability
    }

    console.log(`\n✨ Cleanup complete! Deleted ${totalDeleted} duplicate avatar files.`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupDuplicateAvatars();
