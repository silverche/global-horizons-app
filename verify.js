const http = require('http');

const post = (path, data, token) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
};

const get = (path, token) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: {
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        });

        req.on('error', reject);
        req.end();
    });
};

const run = async () => {
    try {
        console.log('1. Submitting Application...');
        const appData = JSON.stringify({
            name: "Test Check",
            email: "check@example.com",
            phone: "999999999",
            destination: "norway",
            position: "pig_farming"
        });
        const appRes = await post('/api/apply', appData);
        if (appRes.status === 201) {
            console.log('✅ Application Submitted');
        } else {
            console.error('❌ Application Failed', appRes.body);
            process.exit(1);
        }

        console.log('2. Logging in as Admin...');
        const loginData = JSON.stringify({
            username: "admin",
            password: "adminpassword123"
        });
        const loginRes = await post('/api/login', loginData);
        if (loginRes.status === 200 && loginRes.body.token) {
            console.log('✅ Login Successful');
        } else {
            console.error('❌ Login Failed', loginRes.body);
            process.exit(1);
        }

        console.log('3. Fetching Applications...');
        const listRes = await get('/api/applications', loginRes.body.token);
        if (listRes.status === 200 && Array.isArray(listRes.body)) {
            const found = listRes.body.find(a => a.email === 'check@example.com');
            if (found) {
                console.log('✅ Application Found in Admin List');
            } else {
                console.error('❌ Application Not Found in List');
                process.exit(1);
            }
        } else {
            console.error('❌ Failed to fetch applications', listRes.body);
            process.exit(1);
        }

        console.log('🎉 ALL TESTS PASSED');

    } catch (err) {
        console.error('Test Script Error:', err);
        process.exit(1);
    }
};

run();
