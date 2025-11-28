-- Add custom sources and enabled sources columns to profiles table
ALTER TABLE profiles 
ADD COLUMN custom_sources JSONB DEFAULT '[]'::jsonb,
ADD COLUMN enabled_sources JSONB DEFAULT '["open_syllabus","mit_ocw","yale_oyc","harvard_extension","cmu_oli","hillsdale","saylor","st_johns","uchicago_basic","great_books_academy","sattler","harvard_classics","daily_idea_philosophy","stanford_encyclopedia","coursera","edx","khan_academy","openlearn","oer_commons","merlot","openstax","oer_project","project_gutenberg","archive_org"]'::jsonb;