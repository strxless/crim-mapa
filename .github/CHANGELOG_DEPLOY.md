# Auto-Changelog on Deploy

## How It Works

Every push to `main` automatically triggers the "What's New" modal for all users:

1. **GitHub Action** runs after each push to main
2. Waits 30 seconds for Vercel to deploy
3. Calls `/api/seed-changelog` endpoint
4. Creates new changelog entry with timestamp-based version
5. All users see the modal on next page load

## Setup

### 1. Add Vercel Production URL to GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add secret:
- Name: `VERCEL_PRODUCTION_URL`
- Value: `https://your-app.vercel.app` (without trailing slash)

### 2. Customize Changelog Content

Edit [scripts/seed-changelog.ts](../scripts/seed-changelog.ts):

```typescript
const updateData = {
  version, // Auto-generated
  title: 'Your Title Here',
  description: 'Your description',
  features: JSON.stringify([
    {
      icon: '',
      title: 'Feature Name',
      description: 'Feature description',
      badge: 'NOWE', // Optional
    },
    // Add more features...
  ]),
};
```

### 3. Optional: Manual Version Control

To set a specific version instead of auto-generated timestamp:

```bash
CHANGELOG_VERSION="2.1.0" npx tsx scripts/seed-changelog.ts
```

Or set `CHANGELOG_VERSION` in Vercel environment variables.

## Manual Trigger

If you need to manually trigger the changelog (without pushing code):

Visit: `https://your-app.vercel.app/api/seed-changelog`

This creates a new changelog entry that all users will see.

## Disable Auto-Trigger

To disable automatic changelog on every deploy:

Delete or rename the workflow file:
```bash
rm .github/workflows/seed-changelog-on-deploy.yml
```

## How Users See It

- Modal appears on login/page refresh
- Shows once per version per user
- Stored in `user_updates_viewed` table
- Users can close it and won't see it again until next version
