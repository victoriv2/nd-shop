const axios = require('axios');

async function test() {
    try {
        const res = await axios.post('http://127.0.0.1:5000/api/login', {
            identifier: 'test@nd.shop',
            password: 'password123'
        });
        console.log("STATUS:", res.status);
        console.log("DATA:", res.data);
    } catch (err) {
        console.error("ERROR STATUS:", err.response?.status);
        console.error("ERROR DATA:", err.response?.data);
        console.error("ERROR MESSAGE:", err.message);
    }
}
test();
