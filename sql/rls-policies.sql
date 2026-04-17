-- RLS Policies for Aldea Savia Padel Reservations System

-- Enable RLS on all tables
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- RESERVATIONS TABLE POLICIES

-- Allow users to read their own reservations
CREATE POLICY "Users can read own reservations" ON reservations
FOR SELECT
USING (auth.uid() = user_id);

-- Allow admins to read all reservations
CREATE POLICY "Admins can read all reservations" ON reservations
FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow admins to create reservations
CREATE POLICY "Admin can create reservations" ON reservations
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow admins to delete reservations
CREATE POLICY "Admin can delete reservations" ON reservations
FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RESERVATION_PLAYERS TABLE POLICIES

-- Allow users to read players for their own reservations
CREATE POLICY "Users can read own reservation players" ON reservation_players
FOR SELECT
USING (EXISTS (SELECT 1 FROM reservations WHERE id = reservation_id AND user_id = auth.uid()));

-- Allow admins to read all reservation players
CREATE POLICY "Admins can read all reservation players" ON reservation_players
FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow admins to insert players for any reservation
CREATE POLICY "Admin can insert reservation players" ON reservation_players
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow admins to delete reservation players
CREATE POLICY "Admin can delete reservation players" ON reservation_players
FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- PROFILES TABLE POLICIES

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow authenticated users to read resident profiles
CREATE POLICY "Users can read resident profiles" ON profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND role = 'resident');

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- BLOCKED_SLOTS TABLE POLICIES

-- Allow admins to manage blocked slots
CREATE POLICY "Admins can manage blocked slots" ON blocked_slots
FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
