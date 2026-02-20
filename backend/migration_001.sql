-- D1 migration to add status and stl details to Assets
ALTER TABLE Assets ADD COLUMN status TEXT DEFAULT 'generated'; -- 'generated' (image), 'processing' (3D), 'completed' (STL ready), 'failed'
ALTER TABLE Assets ADD COLUMN stl_id TEXT;
