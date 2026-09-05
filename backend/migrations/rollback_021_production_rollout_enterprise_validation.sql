-- Phase 4 - Milestone 4.5 Production Rollout and Enterprise Validation
-- DDL Rollback Schema

DROP TABLE IF EXISTS enterprise_system_panels;
DROP TABLE IF EXISTS enterprise_health_metrics;
DROP TABLE IF EXISTS enterprise_deployment_audit_log;
DROP TABLE IF EXISTS enterprise_release_governance;
DROP TABLE IF EXISTS enterprise_configuration_governance;
DROP TABLE IF EXISTS enterprise_validation_registry;
DROP TABLE IF EXISTS enterprise_production_audit_log;
DROP TABLE IF EXISTS enterprise_release_validations;
DROP TABLE IF EXISTS enterprise_rollout_validations;
DROP TABLE IF EXISTS enterprise_health_checks;
DROP TABLE IF EXISTS enterprise_environment_validations;
DROP TABLE IF EXISTS enterprise_kill_switches;
DROP TABLE IF EXISTS enterprise_rollback_registry;
DROP TABLE IF EXISTS enterprise_deployment_policies;
DROP TABLE IF EXISTS enterprise_production_readiness;

DELETE FROM enterprise_migration_registry WHERE migration_key = '021_production_rollout_enterprise_validation';
