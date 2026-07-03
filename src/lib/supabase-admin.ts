import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("eyJ")
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Y2pqcGZpdWJqcm5scmlibm1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjYwNjQxNSwiZXhwIjoyMDk4MTgyNDE1fQ._dJKiBEBbW1Xo0M_L08Wyqc4T27JBwhyjhZN7TSdNnA";

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
