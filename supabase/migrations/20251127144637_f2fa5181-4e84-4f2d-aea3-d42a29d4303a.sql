-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create disciplines table for academic disciplines
CREATE TABLE public.disciplines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  l1 TEXT NOT NULL,
  l2 TEXT,
  l3 TEXT,
  l4 TEXT,
  l5 TEXT,
  l6 TEXT,
  search_text TEXT GENERATED ALWAYS AS (
    LOWER(COALESCE(l1, '') || ' ' || COALESCE(l2, '') || ' ' || 
    COALESCE(l3, '') || ' ' || COALESCE(l4, '') || ' ' || 
    COALESCE(l5, '') || ' ' || COALESCE(l6, ''))
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster searching
CREATE INDEX idx_disciplines_search ON public.disciplines USING GIN(to_tsvector('english', search_text));
CREATE INDEX idx_disciplines_l1 ON public.disciplines(l1);

-- Enable RLS on disciplines (public read access)
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read disciplines
CREATE POLICY "Anyone can view disciplines"
  ON public.disciplines
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create user_progress table to track learning progress
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'exploring' CHECK (status IN ('exploring', 'learning', 'mastered')),
  notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, discipline_id)
);

-- Enable RLS on user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- User progress policies
CREATE POLICY "Users can view their own progress"
  ON public.user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
  ON public.user_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();