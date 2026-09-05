/**
 * EROS Autonomous Scheduler
 * Phase 16.3 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class AutonomousScheduler {
  constructor() {
    this.name = "AutonomousScheduler";
    this.scheduledJobs = new Map();
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableAutonomousScheduler", branchId);
    if (!flagEnabled) {
      throw new Error(`Autonomous Scheduler capabilities are disabled for branch ${branchId}`);
    }

    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async scheduleJob(req, branchId, jobKey, intervalMs, taskFn) {
    this.verifyAccess(req, branchId, "services:read");
    const jobId = Math.random().toString(36).substring(7);

    const job = {
      jobId,
      jobKey,
      intervalMs,
      status: "scheduled",
      scheduledAt: Date.now()
    };

    this.scheduledJobs.set(jobId, job);
    erosRuntime.publish("AUTONOMOUS_TASK_SCHEDULED", { jobId, jobKey, branchId });
    return job;
  }

  async triggerJob(req, branchId, jobId) {
    this.verifyAccess(req, branchId, "services:read");
    const job = this.scheduledJobs.get(jobId);
    if (!job) {
      throw new Error(`Scheduled job ${jobId} not found`);
    }

    job.status = "triggered";
    job.lastExecutedAt = Date.now();
    return job;
  }
}

module.exports = new AutonomousScheduler();
