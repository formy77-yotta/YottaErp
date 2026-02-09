import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'document-imports';

/**
 * Upload file a Supabase Storage
 */
export async function uploadDocumentFile(
  file: File,
  organizationId: string
): Promise<{ url: string; path: string }> {
  const timestamp = Date.now();
  const fileName = `${organizationId}/${timestamp}_${file.name}`;
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Errore upload file: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Elimina file da Supabase Storage
 */
export async function deleteDocumentFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
  if (error) {
    throw new Error(`Errore eliminazione file: ${error.message}`);
  }
}
