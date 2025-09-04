// File conversion utility functions and types
import { supabase } from "@/integrations/supabase/client";

export interface ConvertedFile {
  filename: string;
  content: string;
  originalType: string;
}

export interface FileConversionResult {
  success: boolean;
  data?: ConvertedFile[];
  error?: string;
}

export interface ConversionProgress {
  filename: string;
  status: 'pending' | 'uploading' | 'converting' | 'completed' | 'error';
  progress: number;
  error?: string;
}

// Convert files to text using Supabase edge function with specific researchId
export async function convertFilesToTextViaEdgeFunction(
  files: File[],
  researchId: string,
  onProgress?: (progress: ConversionProgress[]) => void
): Promise<FileConversionResult> {
  try {
    // Получаем текущего пользователя
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log("Starting file conversion...");
    console.log("Files to convert:", files.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type
    })));

    // Validate all files first
    const unsupportedFiles = files.filter(file => !isSupportedFormat(file));
    if (unsupportedFiles.length > 0) {
      const unsupportedNames = unsupportedFiles.map(f => f.name).join(', ');
      throw new Error(`Неподдерживаемые форматы файлов: ${unsupportedNames}`);
    }

    // Initialize progress tracking
    const progressState: ConversionProgress[] = files.map(file => ({
      filename: file.name,
      status: 'pending',
      progress: 0
    }));

    if (onProgress) {
      onProgress([...progressState]);
    }

    // Convert files to base64
    const filesData = await Promise.all(
      files.map(async (file, index) => {
        try {
          // Update progress: uploading
          progressState[index] = {
            ...progressState[index],
            status: 'uploading',
            progress: 25
          };
          if (onProgress) onProgress([...progressState]);

          const base64Content = await fileToBase64(file);
          
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64Content
          };
        } catch (error) {
          console.error(`Error preparing file ${file.name}:`, error);
          
          // Update progress: error
          progressState[index] = {
            ...progressState[index],
            status: 'error',
            progress: 0,
            error: error.message
          };
          if (onProgress) onProgress([...progressState]);
          throw error;
        }
      })
    );

    // Update progress for all files: converting
    progressState.forEach((_, index) => {
      progressState[index] = {
        ...progressState[index],
        status: 'converting',
        progress: 50
      };
    });
    if (onProgress) onProgress([...progressState]);

    // Call Supabase edge function for conversion
    const { data, error } = await supabase.functions.invoke('convert-files', {
      body: {
        files: filesData,
        researchId: researchId,
        userId: user.id // Передаем userId явно
      }
    });

    console.log("Conversion result:", {
      success: data?.success,
      filesCount: data?.files?.length,
      error: error?.message || data?.error
    });

    if (error) {
      throw new Error(error.message || 'Edge function error');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Conversion failed');
    }

    if (data.files) {
      console.log("Converted text preview:", 
        data.files.map(f => ({
          filename: f.filename,
          contentLength: f.content.length,
          preview: f.content.substring(0, 100)
        }))
      );
    }

    // Update progress: completed for all files
    progressState.forEach((_, index) => {
      progressState[index] = {
        ...progressState[index],
        status: 'completed',
        progress: 100
      };
    });
    if (onProgress) onProgress([...progressState]);

    return {
      success: true,
      data: data.files
    };

  } catch (error) {
    console.error('File conversion error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper функция для конвертации файла в base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

// Legacy function for backward compatibility - now redirects to edge function
export async function convertFilesToText(
  files: File[],
  onProgress?: (progress: ConversionProgress[]) => void
): Promise<FileConversionResult> {
  return convertFilesToTextViaEdgeFunction(files, Date.now().toString(), onProgress);
}

// Save converted files to Supabase (kept for compatibility but edge function now handles this)
export async function saveConvertedFilesToSupabase(
  convertedFiles: ConvertedFile[],
  researchId: string
): Promise<void> {
  // This is now handled by the edge function
  console.log('Files already saved by edge function');
}

// Get file size in human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Validate file size (CloudConvert has limits)
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  const maxSize = 100 * 1024 * 1024; // 100MB limit
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Файл ${file.name} превышает максимальный размер 100MB`
    };
  }
  
  return { valid: true };
}

// Get total size of all files
export function getTotalFileSize(files: File[]): number {
  return files.reduce((total, file) => total + file.size, 0);
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