-- Добавляем колонку updated_at в таблицу payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Обновляем статус существующих платежей с 'success' на 'completed'
UPDATE payments 
SET status = 'completed' 
WHERE status = 'success';