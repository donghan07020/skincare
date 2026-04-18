-- Supabase SQL for Admin Dashboard
-- Execute these queries in your Supabase SQL Editor

-- 1. Create/Update consultations table with admin fields
CREATE TABLE IF NOT EXISTS consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  skin_condition TEXT,
  concern TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_email ON consultations(email);

-- 3. Enable Row Level Security
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for admin access
-- Allow anonymous users to insert new consultations (for the landing page form)
CREATE POLICY "Allow public to insert consultations" ON consultations
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users (admin) to view all consultations
CREATE POLICY "Allow authenticated users to view consultations" ON consultations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users (admin) to update consultation status
CREATE POLICY "Allow authenticated users to update consultations" ON consultations
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. Create admin_users table for authentication (optional, if you want database-level admin management)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- 6. Enable RLS for admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 7. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Create trigger for updated_at
CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Create view for admin dashboard statistics (optional)
CREATE OR REPLACE VIEW consultation_stats AS
SELECT
  COUNT(*) as total_consultations,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
  MAX(created_at) as latest_consultation
FROM consultations;

-- 10. Grant permissions (adjust as needed for your setup)
-- For service role (server-side access)
GRANT ALL ON consultations TO service_role;
GRANT ALL ON admin_users TO service_role;

-- For anon role (public form submissions)
GRANT INSERT ON consultations TO anon;

-- 11. Sample data for testing (optional)
-- INSERT INTO consultations (name, email, phone, skin_condition, concern, message, status)
-- VALUES
--   ('테스트 사용자', 'test@example.com', '010-1234-5678', '건성', '주름 개선', '상담 부탁드립니다.', 'pending'),
--   ('김철수', 'kim@example.com', '010-9876-5432', '지성', '여드름 관리', '피부 관리를 시작하고 싶습니다.', 'contacted');

-- 12. Create function for bulk status updates (optional)
CREATE OR REPLACE FUNCTION update_consultation_status(
  consultation_ids UUID[],
  new_status TEXT
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Validate status
  IF new_status NOT IN ('pending', 'contacted', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', new_status;
  END IF;

  -- Update consultations
  UPDATE consultations
  SET status = new_status, updated_at = NOW()
  WHERE id = ANY(consultation_ids);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;