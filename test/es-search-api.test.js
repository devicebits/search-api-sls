const http = require('http');

const TEST_INDEX = 'customer-docomopacificca';

const postData = JSON.stringify({
    index: TEST_INDEX,
    project: 'ca', // 'ca' for agentai, 'acad' for selfservice
    query: 'WhatsApp',
    filters: {
        'phone_type.keyword': 'Android'
    },
    aggs: {
        manufacturer: {
            terms: { field: 'manufacturer.keyword', size: 100, order: { _count: 'desc' } }
        },
        phone_type: {
            terms: { field: 'phone_type.keyword', size: 100, order: { _count: 'desc' } }
        },
        model: {
            terms: { field: 'model.keyword', size: 100, order: { _count: 'desc' } }
        }
    },
    from: 0,
    size: 10
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/esearch',
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
            if (res.statusCode === 200) {
                console.log('Test passed!');
                process.exit(0);
            } else {
                console.error('Test failed with status:', res.statusCode);
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
