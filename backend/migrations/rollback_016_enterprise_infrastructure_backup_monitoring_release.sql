PRAGMA foreign_keys = ON;

-- Drop Indexes
DROP INDEX IF EXISTS idx_enterprise_system_alerts_probe;
DROP INDEX IF EXISTS idx_enterprise_backup_log_parent;
DROP INDEX IF EXISTS idx_enterprise_infra_policy_lifecycle_key;
DROP INDEX IF EXISTS idx_enterprise_infra_policy_compatibility_key;
DROP INDEX IF EXISTS idx_enterprise_infra_policy_versions_key;
DROP INDEX IF EXISTS idx_enterprise_infra_topology_asset;
DROP INDEX IF EXISTS idx_enterprise_infra_dependencies_child;
DROP INDEX IF EXISTS idx_enterprise_infra_dependencies_parent;
DROP INDEX IF EXISTS idx_enterprise_infra_relationships_child;
DROP INDEX IF EXISTS idx_enterprise_infra_relationships_parent;

-- Drop Triggers & Tables
DROP TRIGGER IF EXISTS trg_enterprise_infra_capacity_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_capacity;

DROP TRIGGER IF EXISTS trg_enterprise_infra_compliance_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_compliance;

DROP TRIGGER IF EXISTS trg_enterprise_infra_sla_slo_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_sla_slo;

DROP TRIGGER IF EXISTS trg_enterprise_infra_keys_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_keys;

DROP TRIGGER IF EXISTS trg_enterprise_infra_observability_profiles_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_observability_profiles;

DROP TRIGGER IF EXISTS trg_enterprise_infra_releases_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_releases;

DROP TRIGGER IF EXISTS trg_enterprise_infra_configurations_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_configurations;

DROP TRIGGER IF EXISTS trg_enterprise_infra_change_windows_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_change_windows;

DROP TRIGGER IF EXISTS trg_enterprise_system_alerts_append_only_delete;
DROP TRIGGER IF EXISTS trg_enterprise_system_alerts_append_only_update;
DROP TRIGGER IF EXISTS trg_enterprise_system_alerts_uuid_immutable;
DROP TABLE IF EXISTS enterprise_system_alerts;

DROP TRIGGER IF EXISTS trg_enterprise_health_probes_uuid_immutable;
DROP TABLE IF EXISTS enterprise_health_probes;

DROP TRIGGER IF EXISTS trg_enterprise_backup_log_append_only_delete;
DROP TRIGGER IF EXISTS trg_enterprise_backup_log_append_only_update;
DROP TRIGGER IF EXISTS trg_enterprise_backup_log_uuid_immutable;
DROP TABLE IF EXISTS enterprise_backup_log;

DROP TRIGGER IF EXISTS trg_enterprise_infra_policy_lifecycle_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_policy_lifecycle;

DROP TRIGGER IF EXISTS trg_enterprise_infra_policy_compatibility_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_policy_compatibility;

DROP TRIGGER IF EXISTS trg_enterprise_infra_policy_versions_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_policy_versions;

DROP TRIGGER IF EXISTS trg_enterprise_infra_policies_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_policies;

DROP TRIGGER IF EXISTS trg_enterprise_infra_topology_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_topology;

DROP TRIGGER IF EXISTS trg_enterprise_infra_dependencies_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_dependencies;

DROP TRIGGER IF EXISTS trg_enterprise_infra_relationships_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infra_relationships;

DROP TRIGGER IF EXISTS trg_enterprise_infrastructure_assets_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infrastructure_assets;

DROP TRIGGER IF EXISTS trg_enterprise_infrastructure_environments_uuid_immutable;
DROP TABLE IF EXISTS enterprise_infrastructure_environments;
