# AML Leveling

AML Leveling adalah Discord bot leveling untuk satu server AML. Bot ini memberi EXP dari chat valid, menghitung level, menampilkan rank dan leaderboard, mengelola role reward, serta menyediakan command admin untuk konfigurasi, koreksi EXP, reset data, dan audit log.

## Discord Bot Description

```text
AML Leveling membantu komunitas AML membangun aktivitas yang sehat lewat sistem EXP, level, leaderboard, dan reward role otomatis. Bot ini dirancang untuk menghargai kontribusi member, menjaga kualitas chat, dan memberi admin kontrol yang rapi atas progres komunitas.
```

Panjang: 254 karakter.

## Features

- Chat EXP otomatis dengan cooldown, daily cap, validasi spam, duplicate detection, dan guild guard.
- Level formula konsisten dari total EXP.
- User commands: `/rank`, `/level`, `/profile`, `/rewards`.
- Admin-only leaderboard command: `/leaderboard`.
- Admin config: enable/disable, EXP range, cooldown, daily cap, timezone, allowed/ignored channels.
- Auto leaderboard yang mengedit message lama dan recover setelah restart.
- Static role rewards Level 1-50 dengan mode highest-only.
- Level-up history notification ke channel admin khusus.
- Admin operations: manual EXP add/remove/set, reset user/all, dan logs.
- Audit log untuk perubahan admin penting.
- SQLite local database, tanpa Docker, MySQL, atau PostgreSQL.
- Health check, test suite, linting, dan PM2 config untuk production.

## Tech Stack

- Node.js 22+
- TypeScript ESM
- discord.js v14
- Prisma ORM
- SQLite
- Vitest
- ESLint
- Prettier
- Pino logger
- Zod env validation

## Requirements

- Node.js 22 atau lebih baru
- npm
- Discord application dan bot token
- SQLite file database melalui Prisma

## Setup

Install dependencies:

```bash
npm install
```

Copy env example:

```bash
copy .env.example .env
```

Isi `.env`:

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
DATABASE_URL="file:./dev.db"
NODE_ENV=development
LOG_LEVEL=info
DEFAULT_TIMEZONE=Asia/Jakarta
LEADERBOARD_UPDATE_INTERVAL_SECONDS=60
```

Generate Prisma Client dan jalankan migration:

```bash
npm run db:generate
npm run db:migrate
```

Register slash commands:

```bash
npm run commands:register
```

Run bot untuk development:

```bash
npm run dev
```

## Discord Application Setup

Di Discord Developer Portal:

1. Buat application baru.
2. Tambahkan bot user.
3. Copy bot token ke `DISCORD_TOKEN`.
4. Copy application/client ID ke `DISCORD_CLIENT_ID`.
5. Copy server ID AML ke `DISCORD_GUILD_ID`.
6. Enable privileged intents:
   - Server Members Intent
   - Message Content Intent
7. Invite bot dengan scopes:
   - `bot`
   - `applications.commands`

Recommended bot permissions:

- View Channels
- Send Messages
- Embed Links
- Read Message History
- Manage Roles

Role bot harus berada di atas role reward yang akan diberikan otomatis.

## Commands

User commands:

```text
/rank [user]
/level [user]
/profile [user]
/rewards
```

Admin-only leaderboard:

```text
/leaderboard [page]
```

Admin config:

```text
/leveling config view
/leveling enable
/leveling disable
/leveling set-exp min max
/leveling set-cooldown seconds
/leveling set-daily-cap amount
/leveling daily-cap enable amount
/leveling daily-cap disable
/leveling set-timezone timezone
/leveling channels allow-add channel
/leveling channels allow-remove channel
/leveling channels ignore-add channel
/leveling channels ignore-remove channel
```

`/leveling set-daily-cap amount:0` atau `/leveling daily-cap disable` berarti daily cap disabled/unlimited.

Leaderboard:

```text
/leveling leaderboard set-channel channel
/leveling leaderboard refresh
/leveling leaderboard disable
```

Level-up history:

```text
/leveling history set-channel channel
/leveling history disable
```

Jika history channel belum diset, bot tidak mengirim public level-up notification ke channel chat asal.

Role rewards:

```text
/leveling roles list
/leveling roles sync user
/leveling roles sync-all
```

Static 20-role mapping untuk Level 1-50 tersedia di [docs/role-level-mapping.md](docs/role-level-mapping.md). Bot memakai role ID yang sudah ada dan selalu sync dengan mode highest-only.

Admin maintenance:

```text
/leveling exp add user amount [reason]
/leveling exp remove user amount [reason]
/leveling exp set user amount [reason]
/leveling reset user user [reason]
/leveling reset all confirm_text [reason]
/leveling logs [page] [limit] [user]
```

Untuk reset semua data leveling, `confirm_text` harus persis:

```text
RESET AML LEVELING
```

`reset all` menghapus user stats, EXP events, dan invalid message events. Config, channel rules, role rewards, leaderboard settings, dan audit logs tetap disimpan.

## Scripts

```bash
npm run dev                # Run bot in watch mode
npm run build              # Compile TypeScript to dist
npm start                  # Run compiled bot
npm run lint               # Run ESLint
npm test                   # Run Vitest
npm run db:migrate         # Run Prisma migrations
npm run db:generate        # Generate Prisma Client
npm run commands:register  # Register Discord slash commands
npm run roles:create       # Create AML level reward roles in Discord
npm run roles:delete       # Delete AML level reward roles from Discord
npm run roles:list         # List Discord guild roles, highest first
npm run health             # Validate env, SQLite, and command registry
```

## Database

Default database:

```env
DATABASE_URL="file:./dev.db"
```

Dengan Prisma, file SQLite default akan berada di:

```text
prisma/dev.db
```

File database lokal dan secret tidak boleh dipush ke GitHub.

## SQLite Backup

Sebelum deploy production, migration, atau `/leveling reset all`, buat backup database.

PowerShell:

```powershell
New-Item -ItemType Directory -Force backups
Copy-Item prisma\dev.db backups\aml-leveling-backup.db
```

Jika file WAL/SHM ada:

```powershell
Copy-Item prisma\dev.db-wal backups\aml-leveling-backup.db-wal -ErrorAction SilentlyContinue
Copy-Item prisma\dev.db-shm backups\aml-leveling-backup.db-shm -ErrorAction SilentlyContinue
```

Dengan `sqlite3`:

```bash
sqlite3 prisma/dev.db ".backup backups/aml-leveling.db"
```

## Production

Build dan validasi:

```bash
npm ci
npm run build
npm run db:migrate
npm run health
npm run commands:register
```

Run dengan PM2:

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

Monitoring:

```bash
pm2 logs aml-leveling
npm run health
```

Production notes:

- Gunakan `DATABASE_URL` yang menunjuk ke path SQLite persisten.
- Jalankan satu process bot saja untuk server AML.
- Pastikan `.env` dan file `.db` tidak pernah dipush.
- Backup SQLite secara rutin.
- Pastikan permission Discord dan hierarchy role bot sudah benar.

## Testing

Run semua test:

```bash
npm test
```

Run quality checks:

```bash
npm run build
npm run lint
npx prisma validate
```

## Project Structure

```text
src/
  commands/        Slash command modules
  config/          Environment validation
  database/        Prisma client and transaction helper
  events/          Discord event handlers
  modules/         Leveling, settings, audit, admin services
  utils/           Logger, formatting, time helpers
prisma/
  schema.prisma    SQLite schema
scripts/
  register-commands.ts
  health-check.ts
tests/
  *.test.ts
```

## Security Notes

- Jangan commit `.env`.
- Jangan commit file SQLite production.
- Jangan share bot token.
- Rotate token jika pernah bocor.
- Gunakan permission Discord seminimal mungkin, tetapi `Manage Roles` dibutuhkan untuk role reward.

## License

Private project for AML unless a license is added later.
