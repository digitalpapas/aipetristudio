import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_status: string | null;
  subscription_expires_at: string | null;
  trial_used: boolean | null;
  researches_count: number | null;
  segments_count: number | null;
}

export async function getProfile(userId: string): Promise<{ data: Profile | null; error: any }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  return { data, error };
}

export async function updateProfile(
  userId: string, 
  updates: { 
    full_name?: string; 
    avatar_url?: string;
    subscription_status?: string;
    subscription_expires_at?: string;
    trial_used?: boolean;
    researches_count?: number;
    segments_count?: number;
  }
): Promise<{ data: Profile | null; error: any }> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  return { data, error };
}

export async function uploadAvatar(
  userId: string, 
  file: File
): Promise<{ data: { publicUrl: string } | null; error: any }> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true
    });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  // Get public URL
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return { data, error: null };
}

export async function getOrCreateProfile(userId: string): Promise<{ data: Profile | null; error: any }> {
  // First try to get existing profile
  const { data: profile, error: getError } = await getProfile(userId);
  
  // If profile exists, return it
  if (profile && !getError) {
    return { data: profile, error: null };
  }

  // If profile doesn't exist, try to create it from user metadata
  if (!profile && !getError) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: new Error('No user found') };
    }

    // Create profile from user metadata
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null
      })
      .select()
      .single();

    return { data: newProfile, error: createError };
  }

  // Return the original error if we couldn't get profile
  return { data: null, error: getError };
}