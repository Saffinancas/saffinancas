import { Queue } from "bullmq";
import { redis } from "./redis.js";

export const QUEUE_NAME = "wa.classify";

export type ClassifyJob = {
  familyId: string;
  waMessageId: string;
  waChatId: string;
  senderPhone: string;
  senderName: string | null;
  body: string;
  mediaType: string | null;
  receivedAt: string;
};

export const classifyQueue = new Queue<ClassifyJob>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

export async function enqueueMessage(job: ClassifyJob): Promise<void> {
  // jobId = wa message id evita duplicatas se o whatsapp-web.js repetir o evento
  await classifyQueue.add("classify", job, { jobId: `${job.familyId}:${job.waMessageId}` });
}
