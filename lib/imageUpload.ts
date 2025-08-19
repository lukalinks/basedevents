import { supabase } from './supabaseClient';

export async function uploadEventImage(file: File): Promise<string | null> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    console.log('Starting image upload for file:', file.name);

    // Try Supabase storage first with timeout
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `events/${fileName}`;

      console.log('Attempting Supabase upload to path:', filePath);

      // Create a promise with timeout
      const uploadPromise = supabase.storage
        .from('event-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), 10000)
      );

      const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;

      if (error) {
        console.warn('Supabase storage error:', error);
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        console.log('Supabase upload successful:', publicUrlData.publicUrl);
        return publicUrlData.publicUrl;
      }
    } catch (supabaseError) {
      console.warn('Supabase upload failed, using fallback method:', supabaseError);
    }

    // Fallback: Convert to base64 data URL for demo purposes
    console.log('Using base64 fallback for image');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log('Base64 conversion successful');
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export async function deleteEventImage(imageUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `events/${fileName}`;

    const { error } = await supabase.storage
      .from('event-images')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}
