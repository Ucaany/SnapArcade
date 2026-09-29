CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_owner_analytics AS
SELECT
  owners.owner_id,
  owners.month,
  COALESCE(owners.revenue, 0)::bigint AS revenue,
  COALESCE(owners.transaction_count, 0)::int AS transaction_count,
  COALESCE(sessions.session_count, 0)::int AS session_count
FROM (
  SELECT owner_id, date_trunc('month', created_at) AS month,
    SUM(amount) FILTER (WHERE status = 'settlement') AS revenue,
    COUNT(*) FILTER (WHERE status = 'settlement') AS transaction_count
  FROM transactions GROUP BY owner_id, date_trunc('month', created_at)
) owners
LEFT JOIN (
  SELECT owner_id, date_trunc('month', started_at) AS month, COUNT(*) AS session_count
  FROM sessions GROUP BY owner_id, date_trunc('month', started_at)
) sessions ON sessions.owner_id = owners.owner_id AND sessions.month = owners.month;

CREATE UNIQUE INDEX IF NOT EXISTS monthly_owner_analytics_owner_month_idx
  ON monthly_owner_analytics (owner_id, month);

-- Invoke REFRESH MATERIALIZED VIEW CONCURRENTLY from the authenticated internal scheduler.
