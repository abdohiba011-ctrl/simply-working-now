-- Seed real neighborhoods for each city
INSERT INTO public.service_locations (name, city_id, is_active, is_popular, display_order) VALUES
  -- Casablanca
  ('Maarif',           '80784a4c-ff06-4e96-946d-eae9d2677370', true, true,  1),
  ('Anfa',             '80784a4c-ff06-4e96-946d-eae9d2677370', true, true,  2),
  ('Ain Diab',         '80784a4c-ff06-4e96-946d-eae9d2677370', true, true,  3),
  ('Sidi Maarouf',     '80784a4c-ff06-4e96-946d-eae9d2677370', true, false, 4),
  ('Bouskoura',        '80784a4c-ff06-4e96-946d-eae9d2677370', true, false, 5),
  ('Derb Sultan',      '80784a4c-ff06-4e96-946d-eae9d2677370', true, false, 6),
  ('Mediouna',         '80784a4c-ff06-4e96-946d-eae9d2677370', true, false, 7),
  ('Tit Mellil',       '80784a4c-ff06-4e96-946d-eae9d2677370', true, false, 8),

  -- Marrakesh
  ('Gueliz',           'f183ffc5-afe9-4b92-8474-170354832ab4', true, true,  1),
  ('Medina',           'f183ffc5-afe9-4b92-8474-170354832ab4', true, true,  2),
  ('Hivernage',        'f183ffc5-afe9-4b92-8474-170354832ab4', true, true,  3),
  ('Palmeraie',        'f183ffc5-afe9-4b92-8474-170354832ab4', true, false, 4),
  ('Targa',            'f183ffc5-afe9-4b92-8474-170354832ab4', true, false, 5),
  ('Sidi Ghanem',      'f183ffc5-afe9-4b92-8474-170354832ab4', true, false, 6),
  ('Mhamid',           'f183ffc5-afe9-4b92-8474-170354832ab4', true, false, 7),

  -- Rabat
  ('Agdal',            'f0b09a89-0bf7-469e-8984-4aae5ea891f2', true, true,  1),
  ('Hassan',           'f0b09a89-0bf7-469e-8984-4aae5ea891f2', true, true,  2),
  ('Souissi',          'f0b09a89-0bf7-469e-8984-4aae5ea891f2', true, false, 3),
  ('Hay Riad',         'f0b09a89-0bf7-469e-8984-4aae5ea891f2', true, false, 4),
  ('Medina (Rabat)',   'f0b09a89-0bf7-469e-8984-4aae5ea891f2', true, false, 5),
  ('Yacoub El Mansour','f0b09a89-0bf7-469e-8984-4aae5ea891f2', true, false, 6),

  -- Tangier
  ('Malabata',         '114c0985-b491-4430-a46b-23f424b57efc', true, true,  1),
  ('Centre Ville',     '114c0985-b491-4430-a46b-23f424b57efc', true, true,  2),
  ('Iberia',           '114c0985-b491-4430-a46b-23f424b57efc', true, false, 3),
  ('Marshan',          '114c0985-b491-4430-a46b-23f424b57efc', true, false, 4),
  ('Boukhalef',        '114c0985-b491-4430-a46b-23f424b57efc', true, false, 5),
  ('Cap Spartel',      '114c0985-b491-4430-a46b-23f424b57efc', true, false, 6),

  -- Fes
  ('Fes el-Bali',      '98c5769c-a71a-41ad-befe-1007790cab21', true, true,  1),
  ('Ville Nouvelle',   '98c5769c-a71a-41ad-befe-1007790cab21', true, true,  2),
  ('Atlas',            '98c5769c-a71a-41ad-befe-1007790cab21', true, false, 3),
  ('Saiss',            '98c5769c-a71a-41ad-befe-1007790cab21', true, false, 4),
  ('Narjiss',          '98c5769c-a71a-41ad-befe-1007790cab21', true, false, 5),

  -- Agadir
  ('Founty',           'f5620b19-fcc5-49ce-87fb-e39eecde6da0', true, true,  1),
  ('Talborjt',         'f5620b19-fcc5-49ce-87fb-e39eecde6da0', true, true,  2),
  ('Centre Ville (Agadir)', 'f5620b19-fcc5-49ce-87fb-e39eecde6da0', true, false, 3),
  ('Hay Mohammadi',    'f5620b19-fcc5-49ce-87fb-e39eecde6da0', true, false, 4),
  ('Dakhla',           'f5620b19-fcc5-49ce-87fb-e39eecde6da0', true, false, 5),

  -- Essaouira
  ('Medina (Essaouira)', '6616b09c-0343-4f1d-b32d-1caee17d2bdb', true, true,  1),
  ('Borj El Berod',     '6616b09c-0343-4f1d-b32d-1caee17d2bdb', true, false, 2),
  ('Diabat',            '6616b09c-0343-4f1d-b32d-1caee17d2bdb', true, false, 3),

  -- Chefchaouen
  ('Medina (Chefchaouen)', 'b295a1f9-ee7a-4fa5-886c-dea199f1494e', true, true,  1),
  ('Ras El Maa',          'b295a1f9-ee7a-4fa5-886c-dea199f1494e', true, false, 2),
  ('Plaza Outa el-Hammam','b295a1f9-ee7a-4fa5-886c-dea199f1494e', true, false, 3);
