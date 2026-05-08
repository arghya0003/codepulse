# Phase 2: Database & ORM Setup

## 🚀 Overview

This phase implements:
- **Neon PostgreSQL** database with Drizzle ORM
- **AES-256-GCM encryption** for platform access tokens (never transmitted to client)
- **IDOR protection** - row isolation and access control
- **Server actions** for type-safe database operations
- **Audit logging** for security compliance

## 📋 Setup Instructions

### 1. Create Neon Database

1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Create a new project called "codepulse"
3. Copy the connection string (should look like):
   ```
   postgresql://user:password@ep-xxxx.neon.tech/codepulse?sslmode=require
   ```
4. Add to `.env.local`:
   ```bash
   DATABASE_URL=postgresql://user:password@ep-xxxx.neon.tech/codepulse?sslmode=require
   ```

### 2. Generate Encryption Key

Generate a secure 256-bit (32 bytes) encryption key in hex format:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env.local`:
```bash
ENCRYPTION_KEY=<generated-key-here>
```

### 3. Run Database Migrations

```bash
npm run db:push
```

This creates:
- `users` - synced from Clerk
- `platform_tokens` - encrypted API tokens (GitHub, LeetCode, etc.)
- `user_stats` - competitive programming stats
- `platform_profiles` - profile metadata
- `friendships` - leaderboard connections
- `audit_logs` - security audit trail

## 🔐 Security Gates

### Gate 1: AES-256-GCM Token Encryption ✓
- All access tokens encrypted at rest
- Decrypted only in server actions
- Never exposed to client
- IV & auth tag stored separately

### Gate 2: IDOR (Insecure Direct Object Reference) ✓
- All database queries verify user ownership
- Users can only access/modify their own data
- Row-level isolation enforced in all server actions

### Gate 3: Row Isolation ✓
- Foreign key constraints ensure referential integrity
- Cascade deletes prevent orphaned data
- Tests verify isolation (see `lib/security-tests.ts`)

## 📝 Server Actions

### User Management (`app/actions/users.ts`)
- `getCurrentUserProfile()` - get authenticated user
- `upsertUser()` - sync from Clerk webhook
- `updateUserProfile()` - update user data
- `getPublicUserProfile()` - privacy-aware public access
- `deleteUserAccount()` - cascade delete with auth

### Token Management (`app/actions/tokens.ts`)
- `addPlatformToken()` - add encrypted token
- `getPlatformTokens()` - list tokens (metadata only, never encrypted data)
- `getDecryptedToken()` - internal use only, verified ownership
- `updatePlatformToken()` - rotate token
- `deletePlatformToken()` - revoke access

## 🧪 Running Security Tests

```bash
npm run test:security
```

Tests verify:
1. ✓ AES-256-GCM encryption/decryption
2. ✓ IDOR protection - users can't access others' tokens
3. ✓ Row isolation - cascade deletes work
4. ✓ Token hash uniqueness

## 🔄 Database Schema

### users
```
id: UUID (primary key)
clerkId: VARCHAR (unique, from Clerk webhook)
email: VARCHAR (unique)
username: VARCHAR (unique)
firstName, lastName: VARCHAR
profileImage: TEXT
bio: TEXT
isPublic: BOOLEAN (default: false)
createdAt, updatedAt: TIMESTAMP
```

### platform_tokens
```
id: UUID (primary key)
userId: UUID (foreign key → users, cascade delete)
platform: VARCHAR (github, leetcode, codeforces, codechef, gfg)
encryptedToken: TEXT (AES-256-GCM encrypted)
iv: VARCHAR (hex-encoded initialization vector)
authTag: VARCHAR (hex-encoded authentication tag)
platformUsername: VARCHAR (unencrypted, queryable)
tokenHash: VARCHAR (unique, SHA256 hash for dedup)
isActive: BOOLEAN
lastSynced: TIMESTAMP
createdAt, updatedAt: TIMESTAMP
```

### user_stats
```
id: UUID
userId: UUID (foreign key → users, cascade delete)
platform: VARCHAR
stats: JSONB (flexible schema per platform)
lastUpdated: TIMESTAMP
```

### platform_profiles, friendships, audit_logs
See `db/schema.ts` for full definitions

## 🚨 Important Security Notes

1. **Encryption Key Management**
   - Store ENCRYPTION_KEY securely in environment
   - Never commit to version control
   - Rotate keys requires data migration

2. **Token Handling**
   - Tokens never logged or cached client-side
   - Always use `getDecryptedToken()` only on server
   - Client receives metadata only via `getPlatformTokens()`

3. **IDOR Protection**
   - Every server action checks `auth()` 
   - Compares requesting user's clerkId with resource owner
   - Returns `Unauthorized` if ownership check fails

4. **Audit Logging**
   - All token operations logged to `audit_logs`
   - Includes: action, platform, IP address, timestamp
   - Use for security investigations

## 📊 Next Steps (Phase 3)

Once Phase 2 is complete and all gates pass:
1. Implement GitHub/LeetCode/CodeForces API integrations
2. Set up Redis caching for stats
3. Create background sync jobs
4. Implement rate limiting

## ⚙️ Troubleshooting

### "DATABASE_URL is not set"
- Ensure Neon connection string is in `.env.local`
- Restart development server after adding env vars

### "Encryption key must be 32 bytes"
- Generate new key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Key must be exactly 64 hex characters (32 bytes)

### "Invalid webhook signature"
- Regenerate Clerk webhook secret in dashboard
- Ensure `CLERK_WEBHOOK_SECRET` matches

### Drizzle type errors
- Run `npm run db:generate` to regenerate types
- Clear `.next` folder: `rm -rf .next`
