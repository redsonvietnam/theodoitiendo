import { listUsers } from '../server/db.js';

const users = listUsers();
if (users.length === 0) {
    console.log('No users found in the database.');
} else {
    console.log('Existing users:');
    users.forEach(u => console.log(`  - Username: ${u.username}, Role: ${u.role}`));
}