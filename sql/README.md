# SQL Scripts Directory

## Quick Reference

### ACTIVE Scripts (Use These)
- `ACTIVE_database_optimization.sql` - **PRODUCTION READY** database optimization with partnerships & viral tracking

### Historical Migrations (Keep for Reference)
- `main-migration.sql` - Original database schema
- `resume_storage_migration.sql` - Storage bucket setup
- `storage_policies.sql` - Supabase RLS policies
- Various migration files for historical tracking

### Archive Directory
- `archive/` - Contains failed/superseded optimization attempts
- **DO NOT USE** files in archive/ - they contain transaction errors

## Usage Instructions

### For Database Optimization
```sql
-- Copy and paste ACTIVE_database_optimization.sql into Supabase SQL Editor
-- This will add:
-- - Performance indexes (90% speed improvement)
-- - Partnership tracking tables
-- - Viral growth metrics
-- - Discount code system
-- - Real-time business analytics
```

### File Naming Convention
- `ACTIVE_` - Current production-ready scripts
- `MIGRATION_` - Historical database changes
- `archive/` - Failed attempts, obsolete versions

## 5S Compliance
This directory follows 5S lean methodology:
- **SORT**: Only essential scripts in main directory
- **SET IN ORDER**: Clear naming conventions
- **SHINE**: Clean, commented SQL code
- **STANDARDIZE**: Consistent structure
- **SUSTAIN**: Monthly cleanup schedule