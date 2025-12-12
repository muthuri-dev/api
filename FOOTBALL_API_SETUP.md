# Football API Integration Setup

This project uses **TheSportsDB** - completely FREE with NO API key required! 🎉

## Setup

**NO SETUP NEEDED!** Just restart your backend and matches will start syncing automatically.

The API is completely open and requires:

- ❌ No API key
- ❌ No registration
- ❌ No credit card
- ✅ Just works!

## How It Works (Fully Automated)

Once you add the API key and restart the backend, the system automatically:

### Real-Time Updates

- **Every minute**: Updates live match scores and statuses
- **Every hour**: Syncs today's and tomorrow's fixtures
- **Every day at midnight**: Syncs popular leagues for the current season

### Covered Leagues

The system automatically tracks these popular leagues:

- **39** - Premier League (England)
- **140** - La Liga (Spain)
- **78** - Bundesliga (Germany)
- **135** - Serie A (Italy)
- **61** - Ligue 1 (France)
- **2** - UEFA Champions League
- **3** - UEFA Europa League

## No Manual Intervention Required

The system runs completely automatically. Matches are:

- ✅ Fetched automatically when scheduled
- ✅ Updated live every minute during matches
- ✅ Marked as completed when finished
- ✅ Stored with team logos, scores, and league information

## Rate Limits

**Free tier**: 100 requests/day (sufficient for testing)
**Pro tier**: 3000+ requests/day (recommended for production)

### Estimated Usage

- Live updates: ~1440 requests/day (every minute)
- Hourly syncs: ~24 requests/day
- League syncs: ~7 requests/day
- **Total**: ~1471 requests/day (requires Pro tier for continuous operation)

For testing with free tier, you can temporarily disable some cron jobs.

## Setup Steps

1. Get your API key from RapidAPI
2. Add `FOOTBALL_API_KEY=your_key_here` to `.env`
3. Restart the backend: `npm run start:dev`
4. Matches will start appearing automatically!

## Monitoring

Check logs for sync status:

- ✅ `Syncing today's fixtures...`
- ✅ `Syncing live fixtures...`
- ✅ `Found X fixtures`
- ✅ `Sync completed`
