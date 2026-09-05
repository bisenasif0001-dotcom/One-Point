/**
 * EROS Workflow Runtime Engine & Registries
 * Phase 11.3 Implementation Core
 */

const { erosRuntime } = require('./eros-runtime');

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.initDefaultServices();
  }

  initDefaultServices() {
    // Register metadata-driven citizen services
    this.register({
      serviceId: "PAN_CARD",
      category: "identity",
      requiredDocuments: ["aadhaar", "photo", "signature_proof"],
      baseFee: 150,
      defaultSLA: "2 working days",
      governmentAPI: "/api/v5/otp"
    });
    this.register({
      serviceId: "GST_REGISTRATION",
      category: "business",
      requiredDocuments: ["aadhaar", "pan", "photo", "address_proof", "bank_statement"],
      baseFee: 1000,
      defaultSLA: "3 working days",
      governmentAPI: "/api/v1/gst"
    });
  }

  register(serviceMeta) {
    this.services.set(serviceMeta.serviceId, serviceMeta);
  }

  get(serviceId) {
    return this.services.get(serviceId) || null;
  }
}

class WorkflowRegistry {
  constructor() {
    this.workflows = new Map();
    this.initDefaultWorkflows();
  }

  initDefaultWorkflows() {
    this.register({
      workflowId: "CITIZEN_SERVICE_FLOW",
      steps: [
        { key: "intake", order: 10, retryLimit: 3 },
        { key: "document_verification", order: 20, retryLimit: 2 },
        { key: "payment_confirmation", order: 30, retryLimit: 1 },
        { key: "government_submission", order: 40, retryLimit: 3 },
        { key: "completion_handover", order: 50, retryLimit: 1 }
      ],
      rollbackSteps: {
        "government_submission": "revert_submission_state",
        "payment_confirmation": "issue_refund_draft"
      }
    });
  }

  register(wf) {
    this.workflows.set(wf.workflowId, wf);
  }

  get(workflowId) {
    return this.workflows.get(workflowId) || null;
  }
}

class RetryQueue {
  constructor() {
    this.queue = [];
  }

  enqueue(task, backoffMs = 100) {
    const runAt = Date.now() + backoffMs;
    this.queue.push({ task, runAt, attempts: (task.attempts || 0) + 1 });
    erosRuntime.publish("WORKFLOW_RETRY_ENQUEUED", { taskId: task.id, runAt });
  }

  processQueue(executor) {
    const now = Date.now();
    const ready = this.queue.filter(item => item.runAt <= now);
    this.queue = this.queue.filter(item => item.runAt > now);

    ready.forEach(item => {
      erosRuntime.publish("WORKFLOW_RETRY_TRIGGERED", { taskId: item.task.id, attempt: item.attempts });
      executor.executeStep(item.task.workflowId, item.task.stepKey, item.task.context, item.attempts);
    });
  }
}

class WorkflowExecutor {
  constructor(serviceRegistry, workflowRegistry, retryQueue) {
    this.services = serviceRegistry;
    this.workflows = workflowRegistry;
    this.retryQueue = retryQueue;
  }

  executeStep(workflowId, stepKey, context, attempt = 1) {
    const wf = this.workflows.get(workflowId);
    if (!wf) {
      throw new Error(`Workflow ${workflowId} not found in registry`);
    }

    const step = wf.steps.find(s => s.key === stepKey);
    if (!step) {
      throw new Error(`Step ${stepKey} not found in workflow ${workflowId}`);
    }

    erosRuntime.publish("WORKFLOW_STEP_STARTED", { workflowId, stepKey, attempt });

    // Simulate API calls or validation routines
    try {
      // Simulate database/API logic
      if (stepKey === "document_verification" && !context.documentsProvided) {
        throw new Error("Missing required documents validation failed");
      }

      if (stepKey === "government_submission" && context.simulateFail) {
        throw new Error("Gateway Timeout from Government Gateway API");
      }

      // If success, publish completion event
      erosRuntime.publish("WORKFLOW_STEP_COMPLETED", { workflowId, stepKey, status: "success" });
      return { success: true, stepKey };
    } catch (err) {
      erosRuntime.publish("WORKFLOW_STEP_FAILED", { workflowId, stepKey, error: err.message });

      // Check retry policy
      if (attempt <= step.retryLimit) {
        this.retryQueue.enqueue({ id: `task-${Date.now()}`, workflowId, stepKey, context, attempts: attempt }, 10 * attempt);
        return { success: false, status: "retrying", error: err.message };
      } else {
        // Trigger Rollback Support
        const rollbackAction = wf.rollbackSteps[stepKey];
        if (rollbackAction) {
          this.rollbackWorkflow(workflowId, stepKey, rollbackAction, context);
        }
        return { success: false, status: "failed", error: err.message, rollbackTriggered: !!rollbackAction };
      }
    }
  }

  rollbackWorkflow(workflowId, failedStep, rollbackAction, context) {
    erosRuntime.publish("WORKFLOW_ROLLBACK_STARTED", { workflowId, failedStep, rollbackAction });
    // Execute compensation transactions
    erosRuntime.publish("WORKFLOW_ROLLBACK_COMPLETED", { workflowId, failedStep, rollbackAction, status: "rolled_back" });
  }
}

const serviceRegistryInstance = new ServiceRegistry();
const workflowRegistryInstance = new WorkflowRegistry();
const retryQueueInstance = new RetryQueue();
const workflowExecutorInstance = new WorkflowExecutor(serviceRegistryInstance, workflowRegistryInstance, retryQueueInstance);

module.exports = {
  serviceRegistry: serviceRegistryInstance,
  workflowRegistry: workflowRegistryInstance,
  retryQueue: retryQueueInstance,
  workflowExecutor: workflowExecutorInstance
};
