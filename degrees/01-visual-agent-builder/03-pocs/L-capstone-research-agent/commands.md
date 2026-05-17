# Commands — L-capstone

## Setup

```bash
cd 03-pocs/L-capstone-research-agent/source/
npm install
```

## Development

```bash
npm run dev       # start Next.js dev server on :3000
npm run build     # verify next build passes
npm test          # run all 43 tests
npm run test:watch  # watch mode
```

## Snapshot Updates

If the run() signature or block generators change, update snapshots with:
```bash
cd source/ && npx vitest run -u
```

## Deployment (requires vercel login)

```bash
vercel login      # interactive, run once
cd source/
vercel --prod     # deploy to production
```
