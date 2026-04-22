-- Create a function to execute raw SQL (admin only)
-- This function allows running migrations programmatically
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- Restrict access to service role only
REVOKE ALL ON FUNCTION exec_sql(text) FROM public;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
