-- CreateTable
CREATE TABLE "guild_settings" (
    "guild_id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "min_exp" INTEGER NOT NULL DEFAULT 5,
    "max_exp" INTEGER NOT NULL DEFAULT 10,
    "cooldown_seconds" INTEGER NOT NULL DEFAULT 30,
    "daily_exp_cap" INTEGER NOT NULL DEFAULT 500,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "leaderboard_enabled" BOOLEAN NOT NULL DEFAULT false,
    "leaderboard_channel_id" TEXT,
    "leaderboard_message_id" TEXT,
    "leaderboard_top_limit" INTEGER NOT NULL DEFAULT 10,
    "level_up_channel_id" TEXT,
    "level_up_template" TEXT,
    "role_reward_mode" TEXT NOT NULL DEFAULT 'cumulative',
    "allow_link_only_exp" BOOLEAN NOT NULL DEFAULT false,
    "allow_emoji_only_exp" BOOLEAN NOT NULL DEFAULT false,
    "allow_attachment_only_exp" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "guild_exp_channels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guild_exp_channels_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild_settings" ("guild_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_level_stats" (
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_exp" BIGINT NOT NULL DEFAULT 0,
    "current_level" INTEGER NOT NULL DEFAULT 1,
    "current_level_exp" BIGINT NOT NULL DEFAULT 0,
    "required_exp_to_next_level" BIGINT NOT NULL DEFAULT 100,
    "valid_message_count" BIGINT NOT NULL DEFAULT 0,
    "invalid_message_count" BIGINT NOT NULL DEFAULT 0,
    "daily_exp" INTEGER NOT NULL DEFAULT 0,
    "daily_exp_date" DATETIME,
    "last_exp_gain_at" DATETIME,
    "last_message_at" DATETIME,
    "last_level_up_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,

    PRIMARY KEY ("guild_id", "user_id"),
    CONSTRAINT "user_level_stats_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild_settings" ("guild_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "role_rewards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "required_level" INTEGER NOT NULL,
    "role_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "role_rewards_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild_settings" ("guild_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "exp_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "old_total_exp" BIGINT NOT NULL,
    "new_total_exp" BIGINT NOT NULL,
    "old_level" INTEGER NOT NULL,
    "new_level" INTEGER NOT NULL,
    "reason_code" TEXT,
    "message_id" TEXT,
    "channel_id" TEXT,
    "actor_user_id" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exp_events_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild_settings" ("guild_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invalid_message_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "reason_code" TEXT NOT NULL,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invalid_message_events_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild_settings" ("guild_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_user_id" TEXT,
    "before" TEXT,
    "after" TEXT,
    "reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild_settings" ("guild_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "guild_exp_channels_guild_id_idx" ON "guild_exp_channels"("guild_id");

-- CreateIndex
CREATE INDEX "guild_exp_channels_channel_id_idx" ON "guild_exp_channels"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "guild_exp_channels_guild_id_channel_id_mode_key" ON "guild_exp_channels"("guild_id", "channel_id", "mode");

-- CreateIndex
CREATE INDEX "idx_user_level_stats_leaderboard" ON "user_level_stats"("guild_id", "current_level" DESC, "total_exp" DESC);

-- CreateIndex
CREATE INDEX "idx_user_level_stats_user" ON "user_level_stats"("guild_id", "user_id");

-- CreateIndex
CREATE INDEX "role_rewards_guild_id_idx" ON "role_rewards"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_rewards_guild_id_required_level_role_id_key" ON "role_rewards"("guild_id", "required_level", "role_id");

-- CreateIndex
CREATE INDEX "exp_events_guild_id_idx" ON "exp_events"("guild_id");

-- CreateIndex
CREATE INDEX "exp_events_user_id_idx" ON "exp_events"("user_id");

-- CreateIndex
CREATE INDEX "idx_exp_events_guild_user_created" ON "exp_events"("guild_id", "user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "invalid_message_events_guild_id_idx" ON "invalid_message_events"("guild_id");

-- CreateIndex
CREATE INDEX "invalid_message_events_guild_id_user_id_created_at_idx" ON "invalid_message_events"("guild_id", "user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_guild_id_idx" ON "audit_logs"("guild_id");

-- CreateIndex
CREATE INDEX "audit_logs_guild_id_actor_user_id_created_at_idx" ON "audit_logs"("guild_id", "actor_user_id", "created_at" DESC);
