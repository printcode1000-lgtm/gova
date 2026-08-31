CREATE TABLE IF NOT EXISTS control_release_state (
  revision text PRIMARY KEY NOT NULL,
  version integer NOT NULL,
  state_json text NOT NULL,
  updated_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS control_release_state_updated_at_idx
  ON control_release_state(updated_at);
