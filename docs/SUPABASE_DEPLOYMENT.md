# Supabase Database Migration Instructions

## Overview
This document contains instructions for migrating Resume Vita from in-memory storage to Supabase persistent database storage.

## Critical Issue Resolved
- **BEFORE**: All user tracking data was stored in memory and lost on every deployment/restart
- **AFTER**: All data is now persistently stored in Supabase database with proper logging

## Files Changed
- `src/lib/supabase.ts` - Complete Supabase client and helper functions
- `src/app/api/user-tracking/route.ts` - Migrated from memory to Supabase
- `src/app/api/admin/auth/route.ts` - Admin sessions now use Supabase
- `sql/migration.sql` - Database schema and initial data
- `.env.local` - Environment variables template

## Deployment Steps

### 1. Set Up Supabase Project
1. Create a new Supabase project at https://supabase.com
2. Copy the project URL and anon key from Settings > API
3. Update environment variables in production:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 2. Run Database Migration
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of `sql/migration.sql`
4. Execute the migration to create all tables and initial data

### 3. Verify Database Setup
After running the migration, you should have:
- `user_sessions` table with tracking data
- `whitelist_entries` table with predefined entries (Adam, Jessica, Mike Rowe Foundation, EKU)
- `abuse_patterns` table for security monitoring
- `admin_sessions` table for secure admin authentication
- Proper indexes and Row Level Security policies

### 4. Test the Integration
1. Deploy the updated code to production
2. Test user registration and tracking
3. Test admin login (tadbitrusty / Pandora8533!)
4. Verify data persistence after deployment

## Pre-configured Whitelist Entries
The migration includes these whitelist entries:
- `adam@example.com` - Admin with unlimited access
- `jessica@example.com` - Admin with unlimited access  
- `mikeroweworks.org` domain - 50 free resumes, 100% discount
- `eku.edu` domain - 10 free resumes, 50% discount
- `beta@resumevita.io` - Beta testing account

## Security Features
- Row Level Security enabled on all tables
- Comprehensive logging for all database operations
- Secure admin session management
- Abuse pattern detection and logging

## Monitoring
All database operations are logged with `[DB]` prefixes for easy monitoring and debugging.

## Rollback Plan
If issues occur, the old in-memory system code is preserved in git history. However, any data collected after migration will be lost if rolling back.

---
🚨 **CRITICAL**: Update environment variables before deploying to production!