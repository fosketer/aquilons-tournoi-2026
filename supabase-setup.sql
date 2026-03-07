-- =============================================
-- Aquilons Tournament Realtime - Supabase Schema
-- =============================================

-- Table: tournois
CREATE TABLE tournois (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  equipe TEXT NOT NULL,
  logo_url TEXT,
  lieu TEXT,
  date_debut DATE,
  date_fin DATE,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: matchs
CREATE TABLE matchs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournoi_id UUID REFERENCES tournois(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  heure TEXT NOT NULL,
  adversaire TEXT NOT NULL,
  terrain TEXT,
  lieu_nom TEXT,
  lieu_adresse TEXT,
  lieu_maps_url TEXT,
  aq_set1 INT,
  adv_set1 INT,
  aq_set2 INT,
  adv_set2 INT,
  aq_score_courant INT DEFAULT 0,
  adv_score_courant INT DEFAULT 0,
  set_courant INT DEFAULT 0,
  statut TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: points (log de chaque point)
CREATE TABLE points (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id UUID REFERENCES matchs(id) ON DELETE CASCADE,
  set_num INT NOT NULL,
  equipe TEXT NOT NULL,
  aq_score INT NOT NULL,
  adv_score INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tournois ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchs ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read tournois" ON tournois FOR SELECT USING (true);
CREATE POLICY "Public read matchs" ON matchs FOR SELECT USING (true);
CREATE POLICY "Public read points" ON points FOR SELECT USING (true);

-- Public write access (anon key)
CREATE POLICY "Public insert tournois" ON tournois FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tournois" ON tournois FOR UPDATE USING (true);
CREATE POLICY "Public insert matchs" ON matchs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update matchs" ON matchs FOR UPDATE USING (true);
CREATE POLICY "Public insert points" ON points FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete points" ON points FOR DELETE USING (true);

-- Enable Realtime on matchs and points
ALTER PUBLICATION supabase_realtime ADD TABLE matchs;
ALTER PUBLICATION supabase_realtime ADD TABLE points;

-- =============================================
-- Insert Tournoi CVS 2026 data
-- =============================================

INSERT INTO tournois (id, nom, equipe, lieu, date_debut, date_fin)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Tournoi CVS 2026',
  'Aquilons - Jean de Brébeuf (Benjamin D2)',
  'Alma',
  '2026-03-06',
  '2026-03-08'
);

INSERT INTO matchs (tournoi_id, numero, heure, adversaire, terrain, lieu_nom, lieu_adresse, lieu_maps_url, statut) VALUES
  ('a0000000-0000-0000-0000-000000000001', 1, '9h30',  'Husky JDN',     'Terrain 5',  'Centre Mario-Tremblay', '605 Boul. Saint-Luc O, Alma',     'https://www.google.com/maps/place/605+Boulevard+Saint-Luc+O,+Alma,+QC', 'upcoming'),
  ('a0000000-0000-0000-0000-000000000001', 2, '10h30', 'Bleu et Or',    'Terrain 11', 'École Jean-Gauthier',   '441 rue Joseph-W.-Fleury, Alma',  'https://www.google.com/maps/place/441+rue+Joseph-W.-Fleury,+Alma,+QC', 'upcoming'),
  ('a0000000-0000-0000-0000-000000000001', 3, '11h30', 'Express U14',   'Terrain 7',  'Camille-Lavoie',        '500 Av. des Métiers, Alma',       'https://www.google.com/maps/place/500+Avenue+des+M%C3%A9tiers,+Alma,+QC', 'upcoming'),
  ('a0000000-0000-0000-0000-000000000001', 4, '14h30', 'Les Condors',   'Terrain 10', 'École Jean-Gauthier',   '441 rue Joseph-W.-Fleury, Alma',  'https://www.google.com/maps/place/441+rue+Joseph-W.-Fleury,+Alma,+QC', 'upcoming'),
  ('a0000000-0000-0000-0000-000000000001', 5, '16h30', 'Bleu et Or',    'Terrain 11', 'École Jean-Gauthier',   '441 rue Joseph-W.-Fleury, Alma',  'https://www.google.com/maps/place/441+rue+Joseph-W.-Fleury,+Alma,+QC', 'upcoming'),
  ('a0000000-0000-0000-0000-000000000001', 6, '17h30', 'Tigres d''Amé', 'Terrain 8',  'Camille-Lavoie',        '500 Av. des Métiers, Alma',       'https://www.google.com/maps/place/500+Avenue+des+M%C3%A9tiers,+Alma,+QC', 'upcoming'),
  ('a0000000-0000-0000-0000-000000000001', 7, '19h30', 'Husky KS',      'Terrain 6',  'Centre Mario-Tremblay', '605 Boul. Saint-Luc O, Alma',     'https://www.google.com/maps/place/605+Boulevard+Saint-Luc+O,+Alma,+QC', 'upcoming');
