import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLOUDCONVERT_API_KEY = Deno.env.get('CLOUDCONVERT_API_KEY')!;
const CLOUDCONVERT_SYNC_URL = 'https://sync.api.cloudconvert.com/v2';
const OCR_SPACE_API_KEY = 'K84329473988957'; // Публичный тестовый ключ

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Функция для OCR изображений через OCR.space
async function ocrImage(base64Content: string, filename: string): Promise<string> {
  console.log(`Starting OCR for image: ${filename}`);
  
  const formData = new FormData();
  formData.append('base64Image', `data:image/png;base64,${base64Content}`);
  formData.append('language', 'rus'); // Русский язык
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2'); // Engine 2 лучше для русского
  formData.append('isOverlayRequired', 'false');
  
  const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      'apikey': OCR_SPACE_API_KEY
    },
    body: formData
  });
  
  const ocrResult = await ocrResponse.json();
  console.log('OCR response status:', ocrResult.OCRExitCode);
  
  if (ocrResult.OCRExitCode === 1 || ocrResult.OCRExitCode === 2) {
    const extractedText = ocrResult.ParsedResults?.[0]?.ParsedText || '';
    console.log(`OCR extracted ${extractedText.length} characters`);
    return extractedText;
  } else {
    throw new Error(ocrResult.ErrorMessage?.[0] || 'OCR failed');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { files, researchId, userId } = await req.json();
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error('No files provided for conversion');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting conversion of ${files.length} files for research ${researchId}`);

    const convertedFiles = [];

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`);
        
        const extension = file.name.split('.').pop()?.toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'].includes(extension || '');
        
        // Подготавливаем base64 контент
        const base64Content = file.content.includes(',') 
          ? file.content.split(',')[1] 
          : file.content;
        
        let textContent = '';
        
        if (isImage) {
          // Используем OCR.space для изображений
          console.log('Using OCR.space for image processing');
          textContent = await ocrImage(base64Content, file.name);
          
          if (!textContent || textContent.trim().length === 0) {
            console.warn(`No text extracted from image ${file.name}`);
            textContent = `[Изображение ${file.name} - текст не распознан]`;
          }
        } else if (extension === 'txt') {
          // Для .txt файлов просто декодируем base64
          console.log('Processing TXT file directly');
          try {
            const decoder = new TextDecoder('utf-8');
            const uint8Array = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
            textContent = decoder.decode(uint8Array);
            console.log(`TXT file decoded, length: ${textContent.length}`);
          } catch (error) {
            console.error('Error decoding TXT file:', error);
            textContent = `[Ошибка чтения TXT файла: ${error.message}]`;
          }
        } else if (CLOUDCONVERT_API_KEY && CLOUDCONVERT_API_KEY !== 'undefined') {
          // Для документов используем CloudConvert
          console.log('Using CloudConvert for document processing');
          
          const tasks = {
            'import': {
              operation: 'import/base64',
              file: base64Content,
              filename: file.name
            },
            'convert': {
              operation: 'convert',
              input: 'import',
              input_format: extension,
              output_format: 'txt'
            },
            'export': {
              operation: 'export/url',
              input: 'convert'
            }
          };
          
          const jobResponse = await fetch(`${CLOUDCONVERT_SYNC_URL}/jobs`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tasks })
          });
          
          if (!jobResponse.ok) {
            const errorText = await jobResponse.text();
            console.error('CloudConvert error:', errorText);
            throw new Error(`CloudConvert failed: ${errorText}`);
          }
          
          const jobResult = await jobResponse.json();
          const exportTask = jobResult.data.tasks.find(t => t.name === 'export');
          
          if (exportTask?.result?.files?.[0]?.url) {
            const textResponse = await fetch(exportTask.result.files[0].url);
            textContent = await textResponse.text();
          } else {
            throw new Error('No output from CloudConvert');
          }
        } else {
          // Если нет CloudConvert API ключа, пропускаем документы
          console.warn(`Skipping document ${file.name} - CloudConvert API key not configured`);
          textContent = `[Документ ${file.name} - требуется CloudConvert API для конвертации]`;
        }
        
        console.log(`Conversion completed for ${file.name}, text length: ${textContent.length}`);
        
        const convertedFile = {
          filename: file.name,
          content: textContent,
          originalType: extension
        };
        
        convertedFiles.push(convertedFile);
        
        // Сохраняем в базу данных
        const { error: dbError } = await supabase.from('converted_files').insert({
          research_id: researchId,
          filename: file.name,
          original_type: extension,
          text_content: textContent,
          user_id: userId
        });
        
        if (dbError) {
          console.error('Database error:', dbError);
        }

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        // Добавляем файл с ошибкой
        convertedFiles.push({
          filename: file.name,
          content: `[Ошибка обработки файла: ${error.message}]`,
          originalType: file.name.split('.').pop()?.toLowerCase()
        });
      }
    }

    if (convertedFiles.length === 0) {
      throw new Error('Failed to convert any files');
    }

    console.log(`Successfully processed ${convertedFiles.length} files`);

    return new Response(JSON.stringify({
      success: true,
      files: convertedFiles,
      message: `Successfully processed ${convertedFiles.length} files`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in convert-files function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});