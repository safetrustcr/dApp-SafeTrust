const { syncUser } = require('./services/webhook/src/services/user.service');

async function test() {
    try {
        const user = await syncUser({
            uid: 'test-uid-12345',
            email: 'test@example.com',
            phone_number: '+234123456789',
            country_code: 'NG',
            location: 'Lagos'
        });
        console.log('✅ Service works:', user);
    } catch (err) {
        console.error('❌ Service error:', err.message);
    }
}

test();