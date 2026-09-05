/**
 * EROS Security Layer & RBAC Middleware
 * Phase 11.4 Implementation Core
 */

const { erosRuntime } = require('./eros-runtime');

class SecurityRegistry {
  constructor() {
    this.rolePermissions = new Map();
    this.initDefaultRoles();
  }

  initDefaultRoles() {
    // Map permissions by role
    this.rolePermissions.set("super-admin", ["*"]);
    this.rolePermissions.set("global-admin", [
      "config:read", "config:write", 
      "services:read", "services:write",
      "workflows:read", "workflows:write"
    ]);
    this.rolePermissions.set("branch-manager", [
      "config:read",
      "services:read",
      "workflows:read", "workflows:write_local"
    ]);
    this.rolePermissions.set("customer", [
      "services:read",
      "workflows:read"
    ]);
  }

  hasPermission(role, action) {
    const permissions = this.rolePermissions.get(role);
    if (!permissions) return false;
    if (permissions.includes("*")) return true;
    return permissions.includes(action);
  }
}

const securityRegistryInstance = new SecurityRegistry();

// 2. Audit Logger Integration
function logAuditActivity(actorId, role, action, resourceId, success) {
  const payload = { actorId, role, action, resourceId, success };
  erosRuntime.publish("SECURITY_AUDIT_LOGGED", payload);
}

// 3. Permission Verification Middleware
function permissionMiddleware(req, action, resourceId = "global") {
  // Extract user authorization headers
  const token = req.headers["x-session-token"] || "";
  
  // Resolve user role (Mock token parser or session verify check)
  let user = { id: "anonymous", role: "customer" };
  if (token === "super-admin-token") {
    user = { id: "admin-01", role: "super-admin" };
  } else if (token === "branch-manager-token") {
    user = { id: "manager-104", role: "branch-manager" };
  }

  const success = securityRegistryInstance.hasPermission(user.role, action);
  logAuditActivity(user.id, user.role, action, resourceId, success);

  return {
    authorized: success,
    user
  };
}

module.exports = {
  securityRegistry: securityRegistryInstance,
  permissionMiddleware,
  logAuditActivity
};
