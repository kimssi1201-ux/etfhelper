# Keyword Ranking Operations

The ranking feature stores real Naver SearchAd keyword volumes in Cloudflare D1.
It must not fall back to mock data in production.

## Required Cloudflare settings

1. Create a D1 database, for example `etfhelper-keyword-rankings`.
2. Apply `migrations/0001_keyword_volume_history.sql`.
3. Add the D1 binding to Cloudflare Pages Production:
   - Binding name: `KEYWORD_RANKING_DB`
   - Database: the D1 database created above
4. Add these Production environment variables:
   - `RANKING_COLLECT_SECRET`: a long random secret
   - `RANKING_COLLECT_URL`: `https://fastincome.kr/api/ranking/collect`

The existing Naver SearchAd variables must also be present:

- `NAVER_SEARCHAD_API_KEY`
- `NAVER_SEARCHAD_SECRET_KEY`
- `NAVER_SEARCHAD_CUSTOMER_ID`

## Daily schedule

The repository includes `.github/workflows/keyword-ranking-collect.yml`.
Add the same `RANKING_COLLECT_SECRET` value as a GitHub Actions repository secret.
The workflow runs at `0 19 * * *` UTC, which is 04:00 KST.

The generated Cloudflare Pages worker also exports a `scheduled()` handler. If a
Cloudflare Cron Trigger is attached to this worker, use the same cron expression:

```txt
0 19 * * *
```

## Runtime behavior

- Candidate keywords live in `data/ranking-keywords.json`.
- Failed keywords are retried up to 3 times in the same batch.
- Snapshots are retained for at least 90 days and older rows are pruned after collection.
- Missing previous-day or previous-week data is rendered as blank movement, not `0%`.
