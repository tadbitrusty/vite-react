# API Key Protection & Export Strategy
## Never Lose Your Working Setup Again!

### Step 1: Export Your Current Working Workflow

#### In N8N Interface:
1. **Open your working ResumeSniper workflow**
2. **Click the 3-dot menu** (top right of workflow)
3. **Select "Download"** (this exports the JSON)
4. **Save as**: `ResumeSniper-WORKING-BACKUP-$(date +%Y%m%d).json`

#### What Gets Exported:
✅ **All node configurations**  
✅ **All connections between nodes**  
✅ **All parameter settings**  
❌ **API Keys are NOT exported** (this is good for security!)

### Step 2: Document Your Credential IDs (CRITICAL!)

Your workflow references credentials by ID numbers. Document these:

```json
{
  "credential_mapping": {
    "supabase_api": {
      "id": "1", 
      "name": "Supabase ResumeSniper",
      "type": "supabaseApi"
    },
    "claude_api": {
      "id": "2",
      "name": "Claude API", 
      "type": "anthropicApi"
    },
    "openai_api": {
      "id": "3",
      "name": "OpenAI API",
      "type": "openAiApi"
    },
    "groq_api": {
      "id": "4", 
      "name": "Groq API",
      "type": "groqApi"
    },
    "smtp_email": {
      "id": "5",
      "name": "SMTP Email",
      "type": "smtp"
    }
  }
}
```

### Step 3: Backup Your Credentials (SECURE THIS!)

#### In N8N Settings > Credentials:
1. **Screenshot each credential** (hide the actual keys)
2. **Document the credential names and IDs**
3. **Store API keys separately** in a secure password manager

#### Your Credential Backup Checklist:
- [ ] Claude API Key (sk-ant-...)
- [ ] OpenAI API Key (sk-...)  
- [ ] Groq API Key (gsk_...)
- [ ] Supabase URL & Service Role Key
- [ ] SMTP Email Settings (host, username, password)

### Step 4: Safe Enhancement Process

#### Create Enhancement Version:
1. **Import your backup JSON** into new workflow
2. **Rename to "ResumeSniper-v2"** 
3. **Verify all credentials connect** (they should use same IDs)
4. **Test with one resume** before making changes

#### If Credentials Don't Connect:
- **Don't panic!** Your original workflow still works
- **Reconnect credentials** one by one to new workflow
- **Original workflow keeps running** while you fix v2

### Step 5: Rollback Strategy

#### Always Have These Ready:
1. **Working v1 workflow** (never modify)
2. **Exported JSON backup** 
3. **Credential documentation**
4. **Database backup** (Supabase auto-backups)

#### Emergency Rollback:
1. **Switch traffic back to v1** (change webhook URLs)
2. **Disable v2 workflow**
3. **Investigate issues**
4. **Try again when ready**

### Step 6: Production Migration Strategy

#### Gradual Traffic Migration:
```
Week 1: 10% traffic to v2 (test with real users)
Week 2: 25% traffic to v2 (if metrics look good)  
Week 3: 50% traffic to v2 (if success rate >= v1)
Week 4: 100% traffic to v2 (full migration)
```

#### Success Metrics to Watch:
- **Processing Success Rate**: v2 >= v1 
- **Processing Time**: v2 <= v1 + 10 seconds
- **User Complaints**: v2 <= v1
- **Revenue Impact**: v2 >= v1

### Step 7: Advanced Backup Strategy

#### Automated Backups:
```javascript
// Function node: "Auto Backup Trigger"
// Runs weekly
const backupData = {
  workflow_version: "v2.1",
  last_backup: new Date().toISOString(),
  performance_metrics: $json.weekly_stats,
  credential_status: "all_connected"
};

// Log to Supabase for tracking
return [{ json: backupData }];
```

#### Version Control for Workflows:
- **Export weekly** with version numbers
- **Store in Git repository** (without API keys)
- **Tag releases** (v1.0, v1.1, v2.0, etc.)
- **Keep changelog** of what changed

### SENSEI WISDOM: The Paranoid Backup Rule

**"If losing it would make you say 'suck donkey dick', back it up twice!"**

Your working N8N workflow is **money-printing machinery**. Treat it like the valuable asset it is:

1. **Multiple backups** (local + cloud)
2. **Tested restore process** 
3. **Documented credentials**
4. **Gradual improvements only**
5. **Always have rollback plan**

---

**Now go export that workflow, Grasshopper! Your API keys are precious!** 🔐