import { findUserByUsername, updateUserPassword } from '../server/db.js';
import { hashPassword } from '../server/auth.js';

async function main() {
    const username = process.argv[2];
    if (!username) {
        console.error('Usage: node scripts/reset-password.js <username> <new_password>');
        console.error('Username cannot be empty.');
        process.exit(1);
    }

    const user = findUserByUsername(username);
    if (!user) {
        console.error(`User "${username}" not found.`);
        process.exit(1);
    }

    const password = process.argv[3];
    if (!password || password.length < 4) {
        console.error('Password is too short (minimum 4 characters).');
        process.exit(1);
    }

    const passwordHash = await hashPassword(password);
    updateUserPassword(username, passwordHash);

    console.log(`\n✓ Password for user "${username}" has been reset successfully.`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});