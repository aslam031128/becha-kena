import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { MEDIA_PROCESSING_QUEUE_NAME, VideoProcessingJobData } from './mediaProcessing.queue.js';

let mediaProcessingWorker: Worker<VideoProcessingJobData> | null = null;

export const initMediaProcessingWorker = (): Worker<VideoProcessingJobData> => {
  if (mediaProcessingWorker) {
    return mediaProcessingWorker;
  }

  mediaProcessingWorker = new Worker<VideoProcessingJobData>(
    MEDIA_PROCESSING_QUEUE_NAME,
    async (job: Job<VideoProcessingJobData>) => {
      const { userId, objectKey } = job.data;
      logger.info(`[MediaWorker] Processing video file ${objectKey} for user ${userId}...`);

      // Simulated background thumbnail generation & MP4 transcoding
      // In production, invokes ffmpeg or AWS MediaConvert asynchronously
      const thumbnailKey = objectKey.replace(/\.(mp4|webm)$/i, '_thumb.webp');
      logger.info(`[MediaWorker] Successfully generated video poster thumbnail: ${thumbnailKey}`);

      return {
        processed: true,
        thumbnailKey,
        durationSeconds: 15,
        completedAt: new Date().toISOString()
      };
    },
    {
      connection: getRedisClient(),
      concurrency: 2
    }
  );

  mediaProcessingWorker.on('completed', (job) => {
    logger.info(`✅ [MediaWorker] Video processing job ${job.id} completed.`);
  });

  mediaProcessingWorker.on('failed', (job, err) => {
    logger.error(`❌ [MediaWorker] Video processing job ${job?.id} failed: ${err.message}`);
  });

  mediaProcessingWorker.on('error', (err: Error) => {
    logger.debug(`[MediaWorker] Redis offline or reconnecting: ${err.message}`);
  });

  return mediaProcessingWorker;
};
