CREATE INDEX IF NOT EXISTS system_logs_time_id_idx
  ON system_logs(last_occurred_at, id);

CREATE INDEX IF NOT EXISTS system_logs_origin_level_time_id_idx
  ON system_logs(origin, level, last_occurred_at, id);

CREATE INDEX IF NOT EXISTS system_logs_level_occurrences_time_idx
  ON system_logs(level, occurrences, last_occurred_at);
