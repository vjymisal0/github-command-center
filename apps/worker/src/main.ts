import { Worker } from 'bullmq';

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };

new Worker('github-sync', async job => {
  console.log(`sync job ${job.id}: ${job.name}`);
}, { connection });

console.log('worker listening for github-sync jobs');
