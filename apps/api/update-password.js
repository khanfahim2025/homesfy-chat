import bcrypt from 'bcryptjs';
import { query, connectMySQL, closeMySQL } from './src/db/mysql.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from multiple possible locations (same as config.js)
// Try current directory (apps/api) first, then parent directory (root)
const envPaths = [
  path.join(__dirname, '.env'), // apps/api/.env
  path.join(__dirname, '..', '..', '.env'), // root/.env
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`📄 Loaded .env from: ${envPath}`);
    break; // Successfully loaded .env file
  }
}

// Also try default location (current working directory)
dotenv.config();

/**
 * Update user password in MySQL database
 * Usage: node update-password.js <username> <newPassword>
 */
async function updatePassword(username, newPassword) {
  try {
    // Validate inputs first (before connecting to database)
    if (!username || !newPassword) {
      console.error('❌ Error: Username and password are required');
      console.log('\nUsage: node update-password.js <username> <newPassword>');
      process.exit(1);
    }

    if (newPassword.length < 6) {
      console.error('❌ Error: Password must be at least 6 characters long');
      process.exit(1);
    }

    console.log(`\n🔐 Updating password...`);
    
    // Initialize MySQL connection
    await connectMySQL();

    // Check if user exists
    const userResult = await query(
      'SELECT id, username FROM users WHERE username = ?',
      [username]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      console.error(`❌ Error: User not found in database`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`   Found user (ID: ${user.id})`);

    // Hash the new password
    console.log('   Hashing password...');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update in database
    console.log('   Updating database...');
    await query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE username = ?',
      [passwordHash, username]
    );
    
    console.log(`\n✅ Password updated successfully`);
    console.log('   You can now login with the new password.\n');
    
    // Close MySQL connection
    await closeMySQL();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error updating password:', error.message);
    console.error(error);
    // Close MySQL connection on error
    try {
      await closeMySQL();
    } catch (closeError) {
      // Ignore close errors
    }
    process.exit(1);
  }
}

// Get command line arguments
const [,, username, newPassword] = process.argv;

// Run the update
updatePassword(username, newPassword);


