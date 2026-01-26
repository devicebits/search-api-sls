const http = require('http');

const TEST_INDEX = 'customer-docomopacificca';
const TEST_CUSTOMER = 'docomopacificca';

const postData = JSON.stringify({
    searchEngine: 'opensearch',
    index: TEST_INDEX,
    customerId: TEST_CUSTOMER
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/create',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Response:', JSON.stringify(json, null, 2));
            if (res.statusCode === 200 && typeof json.success === 'number') {
                console.log('Ingestion integration test passed!');
                process.exit(0);
            } else {
                console.error('Test failed with status:', res.statusCode, 'Response:', data);
                process.exit(1);
            }
        } catch (e) {
            console.error('Invalid JSON response:', data);
            process.exit(1);
        }
    });
});

req.on('error', (e) => {
    console.error('Request error:', e);
    process.exit(1);
});

req.write(postData);
req.end();
