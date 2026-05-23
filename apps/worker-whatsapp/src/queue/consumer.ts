import { Worker } from "bullmq";
import { redis } from "./redis.js";
import { QUEUE_NAME, type ClassifyJob } from "./enqueue.js";
import { processClassifyJob } from "./classify.js";
import { log } from "../log.js";

export function startConsumer(): Worker<ClassifyJob> {
  const worker = new Worker<ClassifyJob>(
    QUEUE_NAME,
    async (job) => {
      log.debug({ jobId: job.id, family: job.data.familyId }, "Processando job");
      await processClassifyJob(job.data);
    },
    { connection: redis, concurrency: 4 },
  );

  worker.on("completed", (job) => log.debug({ jobId: job.id }, "Job ok"));
  worker.on("failed", (job, err) =>
    log.error({ jobId: job?.id, err }, "Job falhou"),
  );

  return worker;
}
