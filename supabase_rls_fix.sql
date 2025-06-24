-- Enable Row Level Security on users table
-- Run this in your Supabase SQL editor

-- Enable RLS on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service_role (your API) to access all records
CREATE POLICY "Service role can access all users" 
ON public.users 
FOR ALL 
TO service_role 
USING (true);

-- Optional: Create policy for authenticated users to access their own records
CREATE POLICY "Users can access their own records" 
ON public.users 
FOR ALL 
TO authenticated 
USING (auth.email() = email);

-- Optional: Create policy for anonymous users to insert new records (for signups)
CREATE POLICY "Allow anonymous user creation" 
ON public.users 
FOR INSERT 
TO anon 
WITH CHECK (true);