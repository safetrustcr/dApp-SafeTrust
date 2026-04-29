const axios = require('axios');

const trustlessWork = axios.create({
  baseURL: process.env.TRUSTLESS_WORK_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.TRUSTLESS_WORK_API_KEY,
  },
});

module.exports = { trustlessWork };
