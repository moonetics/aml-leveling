CREATE TABLE "command_usage_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "command_name" TEXT NOT NULL,
    "target_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "command_usage_events_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild_settings" ("guild_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "command_usage_events_guild_id_command_name_created_at_idx" ON "command_usage_events"("guild_id", "command_name", "created_at" DESC);
CREATE INDEX "command_usage_events_guild_id_user_id_created_at_idx" ON "command_usage_events"("guild_id", "user_id", "created_at" DESC);
