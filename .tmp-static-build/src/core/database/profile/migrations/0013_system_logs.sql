CREATE TABLE IF NOT EXISTS system_logs (
  id text PRIMARY KEY NOT NULL,
  fingerprint text NOT NULL UNIQUE,
  level text NOT NULL,
  source text NOT NULL,
  console_method text NOT NULL DEFAULT '',
  message text NOT NULL,
  page text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT 'server',
  error_name text NOT NULL DEFAULT '',
  source_file text NOT NULL DEFAULT '',
  source_line integer,
  source_column integer,
  user_agent text NOT NULL DEFAULT '',
  feature text NOT NULL DEFAULT '',
  operation text NOT NULL DEFAULT '',
  stack text NOT NULL DEFAULT '',
  route_name text NOT NULL DEFAULT '',
  status_code integer,
  request_method text NOT NULL DEFAULT '',
  app_version text NOT NULL DEFAULT '',
  native_version text NOT NULL DEFAULT '',
  uid text NOT NULL DEFAULT '',
  occurrences integer NOT NULL DEFAULT 1,
  first_occurred_at text NOT NULL,
  last_occurred_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS system_logs_level_time_idx
  ON system_logs(level, last_occurred_at);

CREATE INDEX IF NOT EXISTS system_logs_platform_time_idx
  ON system_logs(platform, last_occurred_at);

CREATE INDEX IF NOT EXISTS system_logs_feature_idx
  ON system_logs(feature, operation);
