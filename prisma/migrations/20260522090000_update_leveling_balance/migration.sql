PRAGMA foreign_keys=OFF;

CREATE TABLE "new_guild_settings" (
    "guild_id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "min_exp" INTEGER NOT NULL DEFAULT 5,
    "max_exp" INTEGER NOT NULL DEFAULT 10,
    "cooldown_seconds" INTEGER NOT NULL DEFAULT 20,
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

INSERT INTO "new_guild_settings" (
    "guild_id",
    "enabled",
    "min_exp",
    "max_exp",
    "cooldown_seconds",
    "daily_exp_cap",
    "timezone",
    "leaderboard_enabled",
    "leaderboard_channel_id",
    "leaderboard_message_id",
    "leaderboard_top_limit",
    "level_up_channel_id",
    "level_up_template",
    "role_reward_mode",
    "allow_link_only_exp",
    "allow_emoji_only_exp",
    "allow_attachment_only_exp",
    "created_at",
    "updated_at"
)
SELECT
    "guild_id",
    "enabled",
    "min_exp",
    "max_exp",
    CASE WHEN "cooldown_seconds" = 30 THEN 20 ELSE "cooldown_seconds" END,
    "daily_exp_cap",
    "timezone",
    "leaderboard_enabled",
    "leaderboard_channel_id",
    "leaderboard_message_id",
    "leaderboard_top_limit",
    "level_up_channel_id",
    "level_up_template",
    "role_reward_mode",
    "allow_link_only_exp",
    "allow_emoji_only_exp",
    "allow_attachment_only_exp",
    "created_at",
    "updated_at"
FROM "guild_settings";

DROP TABLE "guild_settings";
ALTER TABLE "new_guild_settings" RENAME TO "guild_settings";

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
