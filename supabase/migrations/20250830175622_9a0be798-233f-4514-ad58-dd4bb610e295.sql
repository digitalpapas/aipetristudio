-- Update the research record to add generated segments manually for testing
UPDATE researches 
SET generated_segments = '[
  {"id": 1, "title": "Тест сегмент 1", "description": "Описание тестового сегмента 1"},
  {"id": 2, "title": "Тест сегмент 2", "description": "Описание тестового сегмента 2"},
  {"id": 3, "title": "Тест сегмент 3", "description": "Описание тестового сегмента 3"}
]'::jsonb
WHERE "Project ID" = '1756576284555';