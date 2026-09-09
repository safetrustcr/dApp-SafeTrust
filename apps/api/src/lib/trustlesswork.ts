import axios from 'axios';

export const trustlessWork = axios.create({
  baseURL: process.env.TRUSTLESS_WORK_API_URL || 'https://dev.api.trustlesswork.com',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.TRUSTLESS_WORK_API_KEY}`,
  },
});