
INSERT INTO public.service_cities (name, name_key, description, is_available, is_coming_soon, show_in_homepage, display_order, bikes_count, price_from)
VALUES
  ('Casablanca', 'casablanca', 'Economic capital of Morocco', true, false, true, 1, 400, 99),
  ('Marrakesh', 'marrakesh', 'The Red City', false, true, true, 2, 0, 99),
  ('Rabat', 'rabat', 'Capital of Morocco', false, true, true, 3, 0, 99),
  ('Fes', 'fes', 'Cultural capital', false, true, true, 4, 0, 99),
  ('Tangier', 'tangier', 'Gateway to Africa', false, true, true, 5, 0, 99),
  ('Agadir', 'agadir', 'Beach destination', false, true, true, 6, 0, 99),
  ('Essaouira', 'essaouira', 'Coastal windy city', false, true, true, 7, 0, 99),
  ('Chefchaouen', 'chefchaouen', 'The Blue Pearl', false, true, true, 8, 0, 99)
ON CONFLICT DO NOTHING;
