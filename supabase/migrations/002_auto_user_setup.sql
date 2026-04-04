-- ===========================================
-- PROLEAD - Auto User & Org Setup
-- Creates an organization and user record
-- automatically when someone signs up
-- ===========================================

-- Trigger function: runs after every new signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create a new organization for this user
  INSERT INTO organizations (name, settings)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || '''s Team',
    '{"timezone": "Europe/Amsterdam", "language": "nl"}'
  )
  RETURNING id INTO new_org_id;

  -- Create the user record linked to the org
  INSERT INTO users (id, org_id, email, name, role)
  VALUES (
    NEW.id,
    new_org_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
