-- migrations/001-add-tournoi-config.sql
-- Add slug and config JSONB columns to tournois table for config-driven architecture

ALTER TABLE tournois ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE tournois ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Set slugs
UPDATE tournois SET slug = 'cvs' WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE tournois SET slug = 'qca' WHERE id = 'a0000000-0000-0000-0000-000000000002';

-- CVS config
UPDATE tournois SET config = '{
  "detail": "Alma · 7 mars 2026 · 2 sets de 25 pts",
  "sheets": {
    "id": "1TGb1tBMg2CB9lGfWd3uqxHAcxBW81zw4gSfdKCWH7A0",
    "gids": {
      "d2_resultats": 927908034,
      "d1_resultats": 290611892,
      "elim_d2_tier1": 258735679,
      "elim_d2_tier2": 1190283882
    },
    "pools": [
      {"name": "Pool E", "ids": [41,42,43,44], "teams": ["Express U14 (MAU)", "Aquilon (QC)", "CVS U13 Jaune (SAG)", "Husky JDN (C-N)"]},
      {"name": "Pool F", "ids": [51,52,53,54], "teams": ["Patriotes (QC)", "Husky JPG (C-N)", "ESSOR U13 Noir (QC)", "Macareux (C-N)"]},
      {"name": "Pool G", "ids": [61,62,63,64], "teams": ["Phoenix Or (LAN)", "SELECT 4 (EDQ)", "Husky JSP (C-N)", "Athéltiques (QC)"]},
      {"name": "Pool H", "ids": [71,72,73,74], "teams": ["SELECT 3 (EDQ)", "CVS U13 Bleu (SAG)", "Noir et Or (C-N)", "Husky PG (C-N)"]},
      {"name": "Pool I", "ids": [81,82,83,84], "teams": ["CVS U13 Blanc (SAG)", "Impulsives (CHAR)", "Montagnards 2 (QC)", "Patriotes 2 (QC)"]}
    ],
    "columns": {"sg": 16, "sp": 17, "pp": 18, "pc": 19, "sgsp": 20, "pppc": 21, "rg": 22},
    "aquilon_name": "Aquilon (QC)",
    "elim_venues": {
      "5": {"nom": "Centre Mario-Tremblay", "url": "https://www.google.com/maps/place/605+Boulevard+Saint-Luc+O,+Alma,+QC"},
      "6": {"nom": "Centre Mario-Tremblay", "url": "https://www.google.com/maps/place/605+Boulevard+Saint-Luc+O,+Alma,+QC"},
      "7": {"nom": "Camille-Lavoie", "url": "https://www.google.com/maps/place/500+Avenue+des+M%C3%A9tiers,+Alma,+QC"},
      "8": {"nom": "Camille-Lavoie", "url": "https://www.google.com/maps/place/500+Avenue+des+M%C3%A9tiers,+Alma,+QC"}
    }
  },
  "rseq": {
    "highlights": ["Jean-de-Brébeuf 1", "Armand-Saint-Onge 1", "Armand Saint-Onge 1", "JDNManikoutai (MED)", "JDN/Manikoutai (MED)", "Odyssée 1"],
    "leagues": [
      {"id": "sag", "name": "Saguenay-Lac-Saint-Jean", "leagueId": "cad4071e-1e26-4c8d-ab45-7f72fd92fa43", "type": "volleyball"},
      {"id": "estqc-est", "name": "Est-du-Québec (Est)", "leagueId": "330427e7-9293-4467-92d5-71bc84505a21", "type": "standings"},
      {"id": "estqc-ouest", "name": "Est-du-Québec (Ouest)", "leagueId": "a7d24a40-66f9-473c-9956-d9dc2a462819", "type": "standings"},
      {"id": "cn-d3", "name": "Côte-Nord (D3)", "leagueId": "533891a0-5f82-4d54-b1fc-3815d1b6bed2", "type": "volleyball"},
      {"id": "cn-d4", "name": "Côte-Nord (D4)", "leagueId": "775bc7f1-352c-4f4e-8339-8f5e65e0598d", "type": "volleyball"}
    ]
  },
  "qca": {
    "sheets_url": "https://docs.google.com/spreadsheets/d/1J4ttjcJRPh2bift-6on67t3qp4Tyx_TxPrjJRF3t_3Q/export?format=csv",
    "columns": {"rang": 0, "equipe": 1, "t3": 4, "t4": 7, "t5": 10, "total": 11}
  },
  "team_map": [
    {"tournoi": "Aquilons", "search": "Jean-de-Brébeuf 1", "regionId": "qca"},
    {"tournoi": "Tigres d\u2019Amé", "search": "Armand-Saint-Onge 1", "regionId": "estqc-ouest"},
    {"tournoi": "Husky JDN", "search": "JDNManikoutai (MED)", "regionId": "cn-d3"},
    {"tournoi": "Husky KS", "search": "JDNManikoutai (KS)", "regionId": "cn-d4"},
    {"tournoi": "Bleu et Or", "search": "Odyssée 1", "regionId": "sag"}
  ]
}'::jsonb WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- QCA config
UPDATE tournois SET config = '{
  "detail": "Saint-Georges · 14 mars 2026 · 2 de 3 sets",
  "sheets": null,
  "rseq": {
    "highlights": ["Jean-de-Brébeuf 1"],
    "leagues": []
  },
  "qca": {
    "sheets_url": "https://docs.google.com/spreadsheets/d/1J4ttjcJRPh2bift-6on67t3qp4Tyx_TxPrjJRF3t_3Q/export?format=csv",
    "columns": {"rang": 0, "equipe": 1, "t3": 4, "t4": 7, "t5": 10, "total": 11}
  },
  "team_map": [
    {"tournoi": "Aquilons", "search": "Jean-de-Brébeuf 1", "regionId": "qca"}
  ]
}'::jsonb WHERE id = 'a0000000-0000-0000-0000-000000000002';
