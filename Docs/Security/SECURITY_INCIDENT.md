# 🚨 Security Incident Report

**Date:** 2026-02-08
**Severity:** HIGH
**Status:** MITIGATED - ACTION REQUIRED

## Incident Summary

A **Zhipu AI API key** was accidentally committed to the Git repository in file `.env.docker` and pushed to GitHub.

### Exposed Credential
- **File:** `.env.docker`
- **Key Type:** ZHIPU_API_KEY
- **Exposed Value:** `***REVOKED-REMOVED-FROM-DOC***` (la valeur réelle a été retirée de ce document et purgée de l'historique Git — voir section Actions ci-dessous)
- **Commit:** cc316c4
- **Detection:** GitGuardian (Incident #26953230)

## Immediate Actions Taken

✅ **Completed:**
1. Removed `.env.docker` from Git tracking (`git rm --cached`)
2. Added `.env.docker` to `.gitignore`
3. Created `.env.docker.example` as a safe template
4. Replaced exposed key with placeholder in local `.env.docker`

## ⚠️ REQUIRED ACTIONS (USER MUST DO)

### 1. Revoke the Exposed Key (CRITICAL)
```bash
# Go to Zhipu AI Dashboard
# URL: https://open.bigmodel.cn/usercenter/apikeys
# Rechercher la clé dans le tableau de bord Zhipu et la révoquer
# Click "Delete" or "Revoke"
```

### 2. Generate New API Key
```bash
# In Zhipu AI Dashboard:
# 1. Click "Create API Key"
# 2. Copy the new key
# 3. Add it to your LOCAL .env.docker file (line 31)
```

### 3. Clean Git History (Optional but Recommended)
```bash
# Option A: Use BFG Repo-Cleaner (Recommended)
java -jar bfg.jar --replace-text passwords.txt Smart-HR.git
cd Smart-HR.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force

# Option B: Use git-filter-repo
git filter-repo --invert-paths --path .env.docker
git push --force
```

### 4. Audit for Other Exposed Secrets
```bash
# Check if other sensitive files were committed
git log --all --full-history -- "*.env*"
git log --all --full-history -- "*secret*"
git log --all --full-history -- "*credentials*"
```

## Prevention Measures Implemented

1. **`.gitignore` updated** with comprehensive patterns:
   - `*.env` (all environment files)
   - `.env.docker`
   - `.env.*`
   - `credentials.json`, `secrets.json`, `*.pem`, `*.key`

2. **Template file created**: `.env.docker.example`
   - Safe to commit
   - No real credentials
   - Clear instructions for users

3. **Documentation added** to `CLAUDE.md` and `README.md`

## Lessons Learned

1. **Never commit `.env` files** - always use `.env.example` templates
2. **Enable pre-commit hooks** to scan for secrets before commits
3. **Use GitGuardian** or similar tools for continuous monitoring
4. **Rotate credentials regularly** (every 90 days minimum)

## References

- GitGuardian Incident: #26953230
- Zhipu AI Dashboard: https://open.bigmodel.cn/usercenter/apikeys
- Git Secret Removal Guide: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

---

**Next Review Date:** 2026-03-08
**Responsible:** Project Owner
