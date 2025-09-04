// CloudConvert API integration for file conversion to text
const CLOUDCONVERT_API_URL = 'https://api.cloudconvert.com/v2';

// Interface definitions for CloudConvert API
export interface CloudConvertJob {
  id: string;
  status: 'processing' | 'finished' | 'error';
  tasks: CloudConvertTask[];
}

export interface CloudConvertTask {
  id: string;
  name: string;
  operation: string;
  status: string;
  result?: {
    form?: {
      url: string;
      parameters: Record<string, string>;
    };
    files?: Array<{
      filename: string;
      url: string;
    }>;
  };
}

export interface ConvertedFile {
  filename: string;
  content: string;
  originalType: string;
}

// Main function to convert any file to text
export async function convertFileToText(file: File, apiKey: string): Promise<string> {
  try {
    console.log(`Starting conversion for file: ${file.name}`);
    
    // 1. Create conversion job
    const job = await createConversionJob(file, apiKey);
    console.log(`Created job: ${job.id}`);
    
    // 2. Upload file
    await uploadFile(job, file, apiKey);
    console.log(`File uploaded successfully`);
    
    // 3. Wait for completion and download result
    const textContent = await waitForJobCompletion(job.id, apiKey);
    console.log(`Conversion completed, text length: ${textContent.length}`);
    
    return textContent;
  } catch (error) {
    console.error('CloudConvert error:', error);
    throw new Error(`Ошибка конвертации файла ${file.name}: ${error.message}`);
  }
}

// Create CloudConvert job for file conversion
async function createConversionJob(file: File, apiKey: string): Promise<CloudConvertJob> {
  const fileFormat = getFileFormat(file);
  const isImage = ['jpg', 'jpeg', 'png', 'heic', 'tiff', 'bmp'].includes(fileFormat);
  
  let tasks: Record<string, any>;
  
  if (isImage) {
    // For images: Image → PDF → DOCX → TXT (chain conversion)
    tasks = {
      'upload-file': {
        operation: 'import/upload'
      },
      'convert-to-pdf': {
        operation: 'convert',
        input: 'upload-file',
        output_format: 'pdf',
        input_format: fileFormat,
        engine: 'tesseract',
        ocr_language: 'rus+eng'
      },
      'convert-to-docx': {
        operation: 'convert',
        input: 'convert-to-pdf',
        output_format: 'docx',
        input_format: 'pdf'
      },
      'convert-to-txt': {
        operation: 'convert',
        input: 'convert-to-docx',
        output_format: 'txt',
        input_format: 'docx'
      },
      'export-file': {
        operation: 'export/url',
        input: 'convert-to-txt'
      }
    };
  } else {
    // For non-images: direct conversion to TXT
    tasks = {
      'upload-file': {
        operation: 'import/upload'
      },
      'convert-file': {
        operation: 'convert',
        input: 'upload-file',
        output_format: 'txt',
        input_format: fileFormat
      },
      'export-file': {
        operation: 'export/url',
        input: 'convert-file'
      }
    };
  }

  const response = await fetch(`${CLOUDCONVERT_API_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tasks })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create CloudConvert job: ${error}`);
  }

  const result = await response.json();
  return result.data;
}

// Upload file to CloudConvert
async function uploadFile(job: CloudConvertJob, file: File, apiKey: string): Promise<void> {
  const uploadTask = job.tasks.find(t => t.name === 'upload-file');
  if (!uploadTask) {
    throw new Error('Upload task not found in job');
  }

  // Get upload parameters
  const taskResponse = await fetch(
    `${CLOUDCONVERT_API_URL}/tasks/${uploadTask.id}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    }
  );

  if (!taskResponse.ok) {
    throw new Error('Failed to get upload parameters');
  }

  const taskData = await taskResponse.json();
  const { url, parameters } = taskData.data.result.form;

  // Create FormData for upload
  const formData = new FormData();
  Object.entries(parameters).forEach(([key, value]) => {
    formData.append(key, value as string);
  });
  formData.append('file', file);

  // Upload file
  const uploadResponse = await fetch(url, {
    method: 'POST',
    body: formData
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file to CloudConvert');
  }
}

// Wait for job completion and download result
async function waitForJobCompletion(jobId: string, apiKey: string): Promise<string> {
  // Use synchronous endpoint for simpler implementation
  const response = await fetch(
    `https://sync.api.cloudconvert.com/v2/jobs/${jobId}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to complete conversion job');
  }

  const job: CloudConvertJob = (await response.json()).data;
  
  if (job.status === 'error') {
    throw new Error('Conversion job failed');
  }

  // Find export task and download result
  const exportTask = job.tasks.find(t => t.name === 'export-file');
  if (!exportTask?.result?.files?.[0]) {
    throw new Error('No converted file found in job result');
  }

  const fileUrl = exportTask.result.files[0].url;
  const textResponse = await fetch(fileUrl);
  
  if (!textResponse.ok) {
    throw new Error('Failed to download converted text');
  }

  return await textResponse.text();
}

// Get file format from file extension
function getFileFormat(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // Map some extensions to CloudConvert formats
  const formatMap: Record<string, string> = {
    'jpg': 'jpg',
    'jpeg': 'jpg',
    'doc': 'doc',
    'docx': 'docx',
    'xls': 'xls',
    'xlsx': 'xlsx',
    'ppt': 'ppt',
    'pptx': 'pptx',
    'pdf': 'pdf',
    'txt': 'txt',
    'rtf': 'rtf',
    'odt': 'odt',
    'odp': 'odp',
    'csv': 'csv',
    'png': 'png',
    'heic': 'heic',
    'tiff': 'tiff',
    'bmp': 'bmp',
    'html': 'html',
    'xml': 'xml',
    'md': 'md'
  };

  return formatMap[extension || ''] || extension || 'auto';
}

// Validate if file format is supported
export function isSupportedFormat(file: File): boolean {
  const supportedFormats = [
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
    'xls', 'xlsx', 'csv', 
    'ppt', 'pptx', 'odp',
    'jpg', 'jpeg', 'png', 'heic', 'tiff', 'bmp',
    'html', 'xml', 'md'
  ];
  
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  return supportedFormats.includes(fileExtension || '');
}

// Get human-readable format description
export function getFormatDescription(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  const descriptions: Record<string, string> = {
    'pdf': 'PDF документ',
    'doc': 'Microsoft Word (старый формат)',
    'docx': 'Microsoft Word',
    'txt': 'Текстовый файл',
    'rtf': 'Rich Text Format',
    'odt': 'OpenDocument Text',
    'xls': 'Microsoft Excel (старый формат)',
    'xlsx': 'Microsoft Excel',
    'csv': 'CSV файл',
    'ppt': 'Microsoft PowerPoint (старый формат)',
    'pptx': 'Microsoft PowerPoint',
    'odp': 'OpenDocument Presentation',
    'jpg': 'JPEG изображение (с OCR)',
    'jpeg': 'JPEG изображение (с OCR)',
    'png': 'PNG изображение (с OCR)',
    'heic': 'HEIC изображение (с OCR)',
    'tiff': 'TIFF изображение (с OCR)',
    'bmp': 'BMP изображение (с OCR)',
    'html': 'HTML файл',
    'xml': 'XML файл',
    'md': 'Markdown файл'
  };

  return descriptions[extension || ''] || `${extension?.toUpperCase()} файл`;
}