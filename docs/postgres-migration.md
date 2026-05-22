# SQLite to PostgreSQL Migration

Run this on the VPS when PostgreSQL is installed and the bot is still using SQLite.

## 1. Stop Bot and Backup SQLite

```bash
pm2 stop aml-leveling
mkdir -p data/backups
cp data/production.db data/backups/production-before-postgres.db
ls -lh data/backups/production-before-postgres.db
```

## 2. Set PostgreSQL URL

Update `.env`:

```env
DATABASE_URL="postgresql://aml_user:YOUR_PASSWORD@localhost:5432/aml_leveling?schema=public"
NODE_ENV=production
```

## 3. Generate PostgreSQL Client and Create Tables

```bash
npm run db:pg:generate
npm run db:pg:push
```

`db:pg:push` should be run against an empty PostgreSQL database.

## 4. Import SQLite Data

```bash
npm run migrate:sqlite-to-postgres -- --sqlite data/backups/production-before-postgres.db
```

The importer refuses to run if PostgreSQL already has data, to avoid duplicate rows.

## 5. Verify and Start Bot

```bash
npm run build
npm run health
npm run commands:register
npm run roles:apply
npm run roles:sync-all
pm2 restart aml-leveling
pm2 save
pm2 logs aml-leveling
```

After migration, use PostgreSQL-specific Prisma commands in production:

```bash
npm run db:pg:generate
npm run db:pg:push
```

Keep `npm run db:generate` and `npm run db:deploy` only for the local SQLite workflow.
