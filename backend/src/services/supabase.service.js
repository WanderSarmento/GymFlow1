const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
const isConfigured = !!(supabaseUrl && supabaseKey);

if (isConfigured) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('===============================================');
  console.log('  Supabase Storage inicializado com sucesso!   ');
  console.log('===============================================');
} else {
  console.warn('===============================================');
  console.warn('  AVISO: Chaves do Supabase não configuradas.  ');
  console.warn('  Utilizando modo de Fallback Local (Base64)  ');
  console.warn('===============================================');
}

/**
 * Faz o upload de um arquivo para o Supabase Storage ou retorna um Data URI (Fallback)
 * @param {Buffer} fileBuffer Buffer do arquivo recebido via Multer
 * @param {string} fileName Nome sugerido para salvar o arquivo
 * @param {string} mimeType Tipo MIME do arquivo (ex: image/png)
 * @returns {Promise<string>} Retorna a URL pública ou o Data URI
 */
async function uploadGymLogo(fileBuffer, fileName, mimeType) {
  if (!isConfigured) {
    // Modo de fallback: gera um Data URI em Base64 para visualização local imediata
    const base64Data = fileBuffer.toString('base64');
    return `data:${mimeType};base64,${base64Data}`;
  }

  try {
    // Cria um nome de arquivo único
    const fileExt = fileName.split('.').pop() || 'png';
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    // Executa o upload para o bucket público 'gym-logos'
    const { data, error } = await supabase.storage
      .from('gym-logos')
      .upload(uniqueFileName, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      throw error;
    }

    // Obtém a URL pública do arquivo
    const { data: publicUrlData } = supabase.storage
      .from('gym-logos')
      .getPublicUrl(uniqueFileName);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Erro no upload para o Supabase Storage:', err);
    throw new Error('Falha ao fazer upload da imagem para o Supabase.');
  }
}

module.exports = {
  uploadGymLogo,
  isSupabaseConfigured: isConfigured
};
