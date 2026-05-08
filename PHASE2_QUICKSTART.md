# 🚀 Phase 2 - Quick Start Guide

## What's Ready

✅ **Fully implemented:**
- Drizzle ORM schema (6 tables)
- AES-256-GCM encryption for tokens
- Server actions with IDOR protection
- Clerk webhook integration
- Audit logging system
- Security test suite

---

## ⚡ 3-Step Quick Setup

### Step 1: Create Neon Database (5 mins)

1. Go to https://console.neon.tech and sign up
2. Click "Create Project" → name it "codepulse"
3. Copy the connection string (looks like `postgresql://...`)
4. Open `.env.local` and paste:
   ```bash
   DATABASE_URL=postgresql://[paste-connection-string-here]
   ```

### Step 2: Generate Encryption Key (1 min)

Run this command in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add to `.env.local`:
```bash
ENCRYPTION_KEY=[paste-generated-key-here]
```

### Step 3: Deploy Schema (2 mins)

```bash
# Generate migration files
npm run db:generate

# Deploy schema to Neon
npm run db:push
```

Done! 🎉

---

## ✅ Verify Everything Works

### Run Security Tests
```bash
npm run test:security
```

You should see:
```
🛡️  PHASE 2 SECURITY TEST SUITE
================================
🔐 TEST 1: Token Encryption & Decryption
✓ Encrypted token
✓ Decrypted token matches original
✓ Tampering detection works

🔒 TEST 2: IDOR - Token Access Control
✓ Created token for user1
✓ User1 can access their token
✓ User2 correctly cannot access user1's token

🗂️  TEST 3: Row Isolation & Cascade Delete
✓ Created user with related token
✓ Related tokens cascaded delete

#️⃣  TEST 4: Token Hash Uniqueness
✓ Created first token
✓ Duplicate token hash correctly rejected

================================
✓ Passed: 4/4
🎉 All security tests passed!
```

---

## 📊 What You Get

### 6 Database Tables

**users** - Synced from Clerk
- id, clerkId, email, username, firstName, lastName, profileImage, bio, isPublic

**platform_tokens** ⚠️ *All tokens AES-256-GCM encrypted*
- id, userId, platform, encryptedToken, iv, authTag, platformUsername, tokenHash, isActive, lastSynced

**user_stats** - Competitive programming stats
- id, userId, platform, stats (JSON), lastUpdated

**platform_profiles** - Profile metadata
- id, userId, platform, profileUrl, avatarUrl, bio, metadata (JSON)

**friendships** - Leaderboard connections
- id, userId, friendId, status (pending/accepted/blocked), createdAt, updatedAt

**audit_logs** - Security audit trail
- id, userId, action, platform, ipAddress, metadata (JSON), createdAt

---

### 14 Server Actions

**User Management** (app/actions/users.ts)
- `getCurrentUserProfile()` - Get your profile
- `updateUserProfile(data)` - Update profile data
- `getPublicUserProfile(username)` - Get public profiles
- `deleteUserAccount()` - Delete your account (cascades everything)

**Token Management** (app/actions/tokens.ts) - All tokens encrypted
- `addPlatformToken(platform, token, username)` - Add GitHub/LeetCode/etc token
- `getPlatformTokens()` - List your tokens (no decrypted data)
- `getDecryptedToken(tokenId)` - Internal use only (server-side)
- `updatePlatformToken(tokenId, newToken, username)` - Rotate token
- `deletePlatformToken(tokenId)` - Remove token

**Audit Logging** (app/actions/audit.ts)
- `logSecurityAudit(action, platform?, metadata)` - Log events
- `getAuditLogs(limit)` - View your audit trail
- `exportAuditLogs(format)` - Export as JSON/CSV

---

## 🔐 Security Features

### Encryption
- AES-256-GCM (NIST-approved)
- Random IV per encryption
- Authentication tag for tampering detection
- Tokens never exposed to client

### IDOR Protection
- Every action verifies you own the data
- Can't access other users' tokens or profiles
- 401 Unauthorized if access denied

### Row Isolation
- Delete user → auto-deletes tokens, stats, profiles
- No orphaned data
- Tested and verified

### Audit Trail
- All operations logged
- Action, platform, IP, timestamp, metadata
- Use for compliance/investigation

---

## 📝 NPM Commands

```bash
# Development
npm run dev

# Database
npm run db:generate    # Create migration files
npm run db:push        # Deploy schema
npm run db:studio      # Open Drizzle UI

# Testing
npm run test:security  # Run security tests

# Production
npm run build
npm run start
npm run lint
```

---

## 🎯 Next Phase (Phase 3)

Once Phase 2 is set up and tests pass:

**Phase 3: Platform APIs**
1. GitHub API integration (OAuth)
2. LeetCode API (stats sync)
3. CodeForces API (rating, solves)
4. CodeChef API (stats)
5. GeeksForGeeks API (stats)
6. Redis caching for stats
7. Background sync jobs

---

## 📚 Documentation

- [PHASE2_SETUP.md](./PHASE2_SETUP.md) - Detailed setup guide
- [PHASE2_SECURITY_GATES.md](./PHASE2_SECURITY_GATES.md) - Security verification checklist
- [PHASE2_COMPLETE.md](./PHASE2_COMPLETE.md) - Full implementation summary

---

## ❓ Common Issues

**"DATABASE_URL is not set"**
- Check `.env.local` has DATABASE_URL
- Restart dev server

**"Encryption key must be 32 bytes"**
- Generate new: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Must be exactly 64 hex characters

**"Connection refused to database"**
- Verify DATABASE_URL is correct from Neon
- Check Neon project is active
- Try: `psql [DATABASE_URL]` to test

**Tests failing**
- Delete `.next` folder: `rm -rf .next` (or `rmdir /s .next` on Windows)
- Re-run migrations: `npm run db:push`
- Restart dev server

---

## ✅ Checklist

Before proceeding to Phase 3:

- [ ] Neon database created
- [ ] DATABASE_URL in `.env.local`
- [ ] ENCRYPTION_KEY generated and in `.env.local`
- [ ] `npm run db:push` completed successfully
- [ ] `npm run test:security` shows all 4 tests passing
- [ ] User signup/update works and syncs to database
- [ ] Can see users in Drizzle Studio

**When all checked: Phase 2 is complete! ✅**

---

## 🚀 Ready to Start Phase 3?

Run:
```bash
npm run test:security
```

When you see "🎉 All security tests passed!" - you're ready for Phase 3!

