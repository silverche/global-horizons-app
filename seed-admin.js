const { query } = require('./database');
const bcrypt = require('bcrypt');

const seedAdmin = async () => {
    const username = 'admin';
    const password = 'adminpassword123'; // Change this!
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        // Check if user exists
        const checkSql = 'SELECT * FROM users WHERE username = $1';
        const existing = await query(checkSql, [username]);

        if (existing.rows.length > 0) {
            console.log('Admin user already exists.');
            return;
        }

        const insertSql = 'INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3)';
        await query(insertSql, [username, hashedPassword, 1]);

        console.log('Admin user created successfully.');
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
        console.log('IMPORTANT: Please change this password or delete this script before production.');
    } catch (error) {
        console.error('Failed to create admin user:', error);
    }
};

// Wait for DB init then seed
setTimeout(seedAdmin, 1000);
