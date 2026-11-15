import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export const MEDIA_PROCESSING_QUEUE_NAME = 'media-processing';

export interface VideoProcessingJobData {
  userId: string;
  objectKey: string;
  context: string;
  enqueuedAt: string;
}

export const mediaProcessingQueue = new Queue<VideoProcessingJobData>(
  MEDIA_PROCESSING_QUEUE_NAME,
  {
    connection: getRedisClient(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000
      },
      removeOnComplete: true,
      removeOnFail: 500
    }
  }
);

mediaProcessingQueue.on('error', (err: Error) => {
  logger.debug(`[MediaProcessingQueue] Redis offline or reconnecting: ${err.message}`);
});

/**
 * Enqueues a video processing and poster thumbnail extraction job.
 * Offloads all CPU/GPU computation from the main HTTP API server.
 */
export const scheduleVideoProcessing = async (
  userId: string,
  objectKey: string,
  context = 'listing_video'
) => {
  try {
    const job = await mediaProcessingQueue.add(
      'process-video-thumbnail',
      {
        userId,
        objectKey,
        context,
        enqueuedAt: new Date().toISOString()
      },
      {
        jobId: `video_proc:${objectKey.replace(/[^a-zA-Z0-9]/g, '_')}`
      }
    );
    logger.info(`Scheduled background video processing job ${job.id} for ${objectKey}`);
    return job;
  } catch (error: any) {
    logger.error(`Failed to schedule video processing job: ${error.message}`);
    throw error;
  }
};
