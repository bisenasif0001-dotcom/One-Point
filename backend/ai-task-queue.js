/**
 * EROS AI Task Queue
 * Phase 16.2 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class AITaskQueue {
  constructor() {
    this.name = "AITaskQueue";
    this.activeTasks = [];
    this.deadLetterQueue = [];
  }

  // Enforce flag and RBAC
  verifyAccess(req, branchId, permission = "services:read") {
    // Operations agent and task queue default check enableAISuggestions
    const flagEnabled = erosRuntime.isFeatureEnabled("enableAISuggestions", branchId);
    if (!flagEnabled) {
      throw new Error(`AI Queue capabilities are disabled for branch ${branchId}`);
    }

    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async enqueue(req, branchId, taskData, priority = "normal", options = {}) {
    const user = this.verifyAccess(req, branchId, "services:read");
    const taskId = Math.random().toString(36).substring(7);

    const task = {
      taskId,
      priority,
      data: taskData,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      delayMs: options.delayMs || 0,
      runAt: Date.now() + (options.delayMs || 0),
      status: "queued",
      createdBy: user.id
    };

    this.activeTasks.push(task);
    erosRuntime.publish("AI_TASK_CREATED", { taskId, priority, branchId });
    return task;
  }

  async processNext(req, branchId) {
    this.verifyAccess(req, branchId, "services:read");
    const now = Date.now();

    // Sort by priority (high > normal) and runAt delay
    const executableTasks = this.activeTasks.filter(t => t.status === "queued" && now >= t.runAt);
    if (executableTasks.length === 0) return null;

    executableTasks.sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (b.priority === "high" && a.priority !== "high") return 1;
      return a.runAt - b.runAt;
    });

    const task = executableTasks[0];
    task.attempts += 1;
    task.status = "processing";

    erosRuntime.publish("AI_TASK_ASSIGNED", { taskId: task.taskId, attempts: task.attempts, branchId });
    return task;
  }

  async completeTask(req, branchId, taskId) {
    this.verifyAccess(req, branchId, "services:read");
    const taskIndex = this.activeTasks.findIndex(t => t.taskId === taskId);
    if (taskIndex === -1) return { success: false };

    const task = this.activeTasks[taskIndex];
    task.status = "completed";
    this.activeTasks.splice(taskIndex, 1);

    erosRuntime.publish("AI_TASK_COMPLETED", { taskId, status: "completed", branchId });
    return { success: true, task };
  }

  async failTask(req, branchId, taskId, errorMessage) {
    this.verifyAccess(req, branchId, "services:read");
    const taskIndex = this.activeTasks.findIndex(t => t.taskId === taskId);
    if (taskIndex === -1) return { success: false };

    const task = this.activeTasks[taskIndex];
    
    if (task.attempts >= task.maxAttempts) {
      task.status = "dead_letter";
      task.error = errorMessage;
      this.deadLetterQueue.push(task);
      this.activeTasks.splice(taskIndex, 1);
      erosRuntime.publish("AI_TASK_COMPLETED", { taskId, status: "dead_letter", error: errorMessage, branchId });
    } else {
      task.status = "queued";
      task.runAt = Date.now() + 5000; // Exponential retry backoff delay (5s default)
      erosRuntime.publish("AI_TASK_COMPLETED", { taskId, status: "queued_retry", attempts: task.attempts, branchId });
    }

    return { success: true, task };
  }
}

module.exports = new AITaskQueue();
