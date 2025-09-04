// Интерфейс для сегмента
interface ParsedSegment {
  id: number;
  title: string;
  description: string;
}

// Функция очистки текста от лишних префиксов
function cleanText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  // Сначала убираем JSON артефакты
  let cleaned = text
    // Убираем артефакты типа "}, {" в начале
    .replace(/^[\s,}\{]+/, '')
    // Убираем кавычки и экранирование в начале и конце
    .replace(/^["'`]+|["'`]+$/g, '')
    // Убираем префиксы
    .replace(/^(description|title)["']?\s*:\s*["']?/gi, '')
    .replace(/^(Название аудитории|Пояснение|Title|Description|Segment \d+):\s*/gi, '')
    // Убираем markdown форматирование
    .replace(/^\*\*(.*?)\*\*$/g, '$1')
    // Исправляем экранированные символы
    .replace(/\\"/g, '"')
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    // Убираем лишние пробелы
    .replace(/\s+/g, ' ')
    .trim();
    
  // Убираем остатки JSON в конце строки
  cleaned = cleaned.replace(/[}\]]+$/, '').trim();
  
  // Если текст заканчивается на неполное предложение с кавычкой, убираем её
  if (cleaned.endsWith('"') && !cleaned.startsWith('"')) {
    cleaned = cleaned.slice(0, -1).trim();
  }
  
  return cleaned;
}

// Функция для восстановления сегментов из поврежденного JSON
function recoverFromCorruptedJson(data: any): ParsedSegment[] {
  console.log('🔧 Пытаемся восстановить из поврежденного JSON:', data);
  
  const segments: ParsedSegment[] = [];
  
  if (!Array.isArray(data)) return segments;
  
  data.forEach((item, index) => {
    try {
      let title = '';
      let description = '';
      
      // Извлекаем title
      if (item.title && typeof item.title === 'string') {
        title = item.title;
      }
      
      // Извлекаем description - может быть строкой или массивом
      if (item.description) {
        if (typeof item.description === 'string') {
          // Проверяем, не содержит ли description JSON массив
          if (item.description.startsWith('[') && item.description.endsWith(']')) {
            try {
              const parsedDesc = JSON.parse(item.description);
              if (Array.isArray(parsedDesc)) {
                description = parsedDesc.join(' ');
              } else {
                description = item.description;
              }
            } catch {
              description = item.description;
            }
          } else {
            description = item.description;
          }
        } else if (Array.isArray(item.description)) {
          description = item.description.join(' ');
        } else {
          description = String(item.description);
        }
      }
      
      // Если title содержит описание (что часто происходит в поврежденном JSON)
      if (title && title.length > 50 && title.includes('.')) {
        const parts = title.split('.').map(p => p.trim());
        if (parts.length >= 2) {
          title = parts[0];
          description = parts.slice(1).join('. ') + (description ? ' ' + description : '');
        }
      }
      
      // Очищаем полученные данные
      title = cleanText(title);
      description = cleanText(description);
      
      if (title || description) {
        segments.push({
          id: index + 1,
          title: title || `Сегмент ${index + 1}`,
          description: description || ''
        });
      }
      
    } catch (error) {
      console.log(`❌ Ошибка при обработке элемента ${index}:`, error);
      // Создаем резервный сегмент
      segments.push({
        id: index + 1,
        title: `Сегмент ${index + 1}`,
        description: String(item)
      });
    }
  });
  
  console.log('✅ Восстановлено сегментов:', segments.length, segments);
  return segments;
}

// Функция для извлечения JSON из текстовых полей
function extractJsonFromText(text: string): any[] {
  const results: any[] = [];
  
  // Паттерны для поиска JSON в тексте
  const jsonPatterns = [
    /\[[\s\S]*?\]/g,  // Массив JSON
    /"?\[[\s\S]*?\]"?/g,  // Экранированный массив JSON
  ];
  
  for (const pattern of jsonPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      try {
        let jsonStr = match[0];
        // Убираем внешние кавычки если есть
        if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
          jsonStr = jsonStr.slice(1, -1);
        }
        // Исправляем экранированные кавычки
        jsonStr = jsonStr.replace(/\\"/g, '"');
        
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          results.push(...parsed);
        }
      } catch (e) {
        console.log('Не удалось извлечь JSON из:', match[0]);
      }
    }
  }
  
  return results;
}

// Главная функция парсинга
export function parseSegments(input: string | any): ParsedSegment[] {
  console.log('🚀 Начинаем парсинг:', typeof input);
  console.log('📝 Исходные данные:', input);
  
  const segments: ParsedSegment[] = [];
  
  // 1. ПРИОРИТЕТ: Обработка чистого JSON (новый формат от агента)
  if (typeof input === 'string') {
    const trimmed = input.trim();
    
    // Проверяем, не является ли это фрагментом JSON от OpenAI
    if (trimmed.includes('description":') || trimmed.includes('title":')) {
      // Пытаемся восстановить JSON структуру
      try {
        // Ищем все сегменты по паттерну
        const segmentMatches = trimmed.matchAll(/{[^}]*"title"[^}]*"description"[^}]*}/g);
        const foundSegments = [];
        
        for (const match of segmentMatches) {
          try {
            const segment = JSON.parse(match[0]);
            foundSegments.push(segment);
          } catch {
            // Пропускаем невалидные
          }
        }
        
        if (foundSegments.length > 0) {
          return foundSegments.map((item, index) => ({
            id: index + 1,
            title: cleanText(item.title || `Сегмент ${index + 1}`),
            description: cleanText(item.description || '')
          }));
        }
      } catch {
        console.log('Не удалось восстановить JSON структуру');
      }
    }
    
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        console.log('📊 Успешно распарсили JSON:', parsed);
        
        if (Array.isArray(parsed)) {
          // Проверяем на поврежденный JSON (description как массив)
          const hasCorruptedStructure = parsed.some(item => 
            Array.isArray(item.description) || 
            (typeof item.description === 'string' && item.description.startsWith('['))
          );
          
          if (hasCorruptedStructure) {
            console.log('⚠️ Обнаружен поврежденный JSON, применяем восстановление');
            const recovered = recoverFromCorruptedJson(parsed);
            if (recovered.length > 0) return recovered;
          }
          
          // Стандартная обработка корректного JSON
          const result = parsed.map((item, index) => ({
            id: index + 1,
            title: cleanText(item.title || item.name || `Сегмент ${index + 1}`),
            description: cleanText(item.description || item.content || '')
          }));
          
          if (result.length > 0) {
            console.log('✅ Стандартная обработка JSON:', result);
            return result;
          }
        }
      } catch (e) {
        console.log('❌ Ошибка парсинга JSON:', e);
        console.log('🔄 Пробуем другие методы');
      }
    }
  }
  
  // 2. Если входные данные - уже готовый массив объектов  
  if (Array.isArray(input)) {
    console.log('📋 Обрабатываем готовый массив');
    
    // Проверяем на поврежденную структуру
    const hasCorruption = input.some(item => 
      Array.isArray(item?.description) || 
      (typeof item?.description === 'string' && item.description.startsWith('['))
    );
    
    if (hasCorruption) {
      console.log('⚠️ Обнаружена поврежденная структура в массиве');
      const recovered = recoverFromCorruptedJson(input);
      if (recovered.length > 0) return recovered;
    }
    
    // Стандартная обработка массива
    input.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        segments.push({
          id: index + 1,
          title: cleanText(item.title || item.name || item.segment_name || `Сегмент ${index + 1}`),
          description: cleanText(item.description || item.details || item.explanation || item.content || '')
        });
      }
    });
    
    if (segments.length > 0) {
      console.log('✅ Обработали массив:', segments);
      return segments;
    }
  }
  
  // 3. Объект с полем segments или проверка на поврежденные данные
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    console.log('🔍 Анализируем объект:', input);
    
    // Проверяем стандартные поля с массивами
    const possibleArrays = ['segments', 'results', 'data', 'items', 'audiences', 'generated_segments'];
    for (const key of possibleArrays) {
      if (Array.isArray(input[key])) {
        console.log(`📋 Найден массив в поле "${key}"`);
        return parseSegments(input[key]);
      }
    }
    
    // Проверяем на JSON в текстовых полях (для поврежденных данных)
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string' && (value.startsWith('[') || value.includes('"title"'))) {
        console.log(`🔧 Найден потенциальный JSON в поле "${key}"`);
        const extracted = extractJsonFromText(value);
        if (extracted.length > 0) {
          return parseSegments(extracted);
        }
      }
    }
    
    // Если это один объект-сегмент
    if (input.title || input.name || input.description) {
      return [{
        id: 1,
        title: cleanText(input.title || input.name || 'Сегмент 1'),
        description: cleanText(input.description || input.content || '')
      }];
    }
  }
  
  // 3. Преобразуем в строку для текстового парсинга
  let textContent = '';
  if (typeof input === 'string') {
    textContent = input;
  } else {
    try {
      textContent = JSON.stringify(input);
    } catch {
      textContent = String(input);
    }
  }
  
  // 4. Пробуем извлечь JSON из строки
  // Проверяем разные форматы JSON
  const jsonPatterns = [
    /\[[\s\S]*?\]/g,  // Массив JSON
    /\{[\s\S]*?\}/g,  // Объект JSON
    /```json\s*([\s\S]*?)\s*```/g,  // JSON в markdown блоке
    /```\s*([\s\S]*?)\s*```/g  // Любой код блок
  ];
  
  for (const pattern of jsonPatterns) {
    const matches = textContent.matchAll(pattern);
    for (const match of matches) {
      try {
        const jsonStr = match[1] || match[0];
        const parsed = JSON.parse(jsonStr.replace(/```json|```/g, '').trim());
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Обрабатываем каждый элемент массива
          const segments = parsed.map((item, index) => {
            // Извлекаем заголовок и описание из полей title и description
            let title = item.title || item.name || '';
            let description = item.description || item.content || '';
            
            // Если в title есть и заголовок и описание (разделенные точкой или двоеточием)
            if (title.includes('. ') || title.includes(': ')) {
              const parts = title.split(/[.:]\s+/);
              if (parts.length >= 2) {
                title = cleanText(parts[0]);
                // Остальное добавляем к описанию
                description = cleanText(parts.slice(1).join('. ') + (description ? ' ' + description : ''));
              } else {
                title = cleanText(title);
              }
            } else {
              title = cleanText(title);
            }
            
            // Специальная обработка для случая когда весь контент в одном поле
            if (!description && title.length > 100) {
              // Пытаемся найти естественное разделение
              const sentences = title.match(/[^.!?]+[.!?]+/g) || [title];
              if (sentences.length > 1) {
                title = cleanText(sentences[0]);
                description = cleanText(sentences.slice(1).join(' '));
              }
            }
            
            description = cleanText(description);
            
            return {
              id: index + 1,
              title: title || `Сегмент ${index + 1}`,
              description: description || ''
            };
          });
          
          if (segments.length > 0) return segments;
        } else if (typeof parsed === 'object' && parsed !== null) {
          const result = parseSegments(parsed);
          if (result.length > 0) return result;
        }
      } catch {
        // Продолжаем с другими паттернами
      }
    }
  }
  
  // 5. Парсинг текстового формата с разными паттернами сегментов
  const segmentPatterns = [
    // Паттерн: **Сегмент 1** или Сегмент 1: или #1 или 1.
    /(?:^|\n)\s*(?:\*\*)?(?:Сегмент|Segment|Аудитория|Audience|#)\s*(\d+)(?:\*\*)?[:\.\-\s]*(.*?)(?=\n\s*(?:\*\*)?(?:Сегмент|Segment|Аудитория|Audience|#)\s*\d+|$)/gis,
    // Паттерн для нумерованных списков
    /(?:^|\n)\s*(\d+)[\.)\-]\s*(.*?)(?=\n\s*\d+[\.)\-]|$)/gis,
    // Паттерн для заголовков с двоеточием
    /(?:^|\n)\s*([А-Яа-яA-Za-z][^:\n]{3,50}):\s*([^\n]+(?:\n(?![А-Яа-яA-Za-z][^:\n]{3,50}:)[^\n]+)*)/gi
  ];
  
  for (const pattern of segmentPatterns) {
    const matches = textContent.matchAll(pattern);
    const foundSegments: ParsedSegment[] = [];
    
    for (const match of matches) {
      const fullMatch = match[0].trim();
      
      // Разбираем на заголовок и описание
      const lines = fullMatch.split('\n').map(l => l.trim()).filter(Boolean);
      
      if (lines.length > 0) {
        let title = '';
        let description = '';
        
        // Первая строка обычно заголовок
        const firstLine = lines[0];
        
        // Извлекаем заголовок
        const titleMatch = firstLine.match(/(?:Сегмент\s*\d+[:\-\s]*)?(.+)/i);
        if (titleMatch) {
          title = cleanText(titleMatch[1]);
        }
        
        // Остальные строки - описание
        if (lines.length > 1) {
          description = lines.slice(1).map(line => cleanText(line)).join(' ');
        } else if (match[2]) {
          description = cleanText(match[2]);
        }
        
        // Проверяем на наличие вложенной структуры "Название: ... Пояснение: ..."
        const titleDescPattern = /(?:Название[^:]*:|Title:)\s*([^\.]+)\.?\s*(?:Пояснение[^:]*:|Описание[^:]*:|Description:)\s*(.+)/i;
        const nestedMatch = (title + ' ' + description).match(titleDescPattern);
        
        if (nestedMatch) {
          title = cleanText(nestedMatch[1]);
          description = cleanText(nestedMatch[2]);
        }
        
        if (title || description) {
          foundSegments.push({
            id: foundSegments.length + 1,
            title: title || `Сегмент ${foundSegments.length + 1}`,
            description: description || ''
          });
        }
      }
    }
    
    if (foundSegments.length >= 2) {
      // Если нашли хотя бы 2 сегмента, возвращаем их
      return foundSegments;
    }
  }
  
  // 6. Последняя попытка - разбить по ключевым словам
  const keywords = ['Корпоративные клиенты', 'Молодожены', 'Организаторы мероприятий', 
                    'Малый бизнес', 'Стартапы', 'Частные предприниматели'];
  
  for (const keyword of keywords) {
    if (textContent.includes(keyword)) {
      const index = textContent.indexOf(keyword);
      const endIndex = textContent.indexOf('\n\n', index) || textContent.length;
      const segmentText = textContent.substring(index, endIndex);
      
      const descStart = segmentText.indexOf(':') + 1 || segmentText.indexOf('.') + 1;
      const description = cleanText(segmentText.substring(descStart));
      
      segments.push({
        id: segments.length + 1,
        title: cleanText(keyword),
        description: description
      });
    }
  }
  
  // 7. Если ничего не нашли, но есть текст - создаем один сегмент
  if (segments.length === 0 && textContent.trim()) {
    return [{
      id: 1,
      title: 'Результат анализа',
      description: cleanText(textContent.substring(0, 500))
    }];
  }
  
  return segments;
}

// Функция для тестирования парсера
export function testParser() {
  const testCases = [
    // Ваш пример
    `[{"title":"Название аудитории: Корпоративные клиенты","description":"Пояснение: Этот сегмент обладает высокой платежеспособностью"},{"title":"Название аудитории: Молодожены","description":"Пояснение: Пары, планирующие свадьбу"}]`,
    // Простой текст
    `Сегмент 1: Корпоративные клиенты
    Описание: Компании с высоким бюджетом
    
    Сегмент 2: Стартапы
    Описание: Молодые компании`,
    // Markdown
    `**Сегмент 1**
    Корпоративные клиенты - основная аудитория
    
    **Сегмент 2** 
    Малый бизнес - дополнительная аудитория`
  ];
  
  testCases.forEach((test, i) => {
    console.log(`Тест ${i + 1}:`, parseSegments(test));
  });
}