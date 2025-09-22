import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getProfile } from '@/lib/profile-utils';

export interface SubscriptionLimits {
  maxResearches: number;
  maxSegments: number;
  canUseAI: boolean;
  canExport: boolean;
  canUseAdvancedAnalysis: boolean;
}

export interface UseSubscriptionReturn {
  status: 'demo' | 'pro' | 'enterprise';
  isLoading: boolean;
  canAccess: (feature: keyof SubscriptionLimits) => boolean;
  daysLeft: number | null;
  limits: SubscriptionLimits;
  refresh: () => Promise<void>;
  hasActiveSubscription: boolean;
  subscriptionId: string | null;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
}

const SUBSCRIPTION_LIMITS: Record<string, SubscriptionLimits> = {
  demo: {
    maxResearches: 3,
    maxSegments: 10,
    canUseAI: false,
    canExport: false,
    canUseAdvancedAnalysis: false,
  },
  pro: {
    maxResearches: 50,
    maxSegments: 500,
    canUseAI: true,
    canExport: true,
    canUseAdvancedAnalysis: true,
  },
  enterprise: {
    maxResearches: -1, // unlimited
    maxSegments: -1, // unlimited
    canUseAI: true,
    canExport: true,
    canUseAdvancedAnalysis: true,
  },
};

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'demo' | 'pro' | 'enterprise'>('demo');
  const [isLoading, setIsLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const calculateDaysLeft = (expiresAt: string | null): number | null => {
    if (!expiresAt) return null;
    
    const expirationDate = new Date(expiresAt);
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  const checkAndUpdateExpiredSubscription = async (
    userId: string,
    subscriptionStatus: string,
    expiresAt: string | null
  ) => {
    // If subscription has expiration date and it's expired
    if (expiresAt && subscriptionStatus !== 'demo') {
      const expirationDate = new Date(expiresAt);
      const today = new Date();
      
      if (expirationDate < today) {
        console.log('Subscription expired, updating to demo');
        
        // Update subscription status to demo
        const { error } = await supabase
          .from('profiles')
          .update({ subscription_status: 'demo' })
          .eq('user_id', userId);
        
        if (error) {
          console.error('Error updating expired subscription:', error);
          return subscriptionStatus; // Return original status on error
        }
        
        return 'demo';
      }
    }
    
    return subscriptionStatus;
  };

  const fetchSubscriptionData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get user profile with subscription data
      const { data: profile, error } = await getProfile(user.id);

      if (error) {
        console.error('Error fetching profile:', error);
        setStatus('demo');
        setDaysLeft(null);
        setSubscriptionId(null);
        return;
      }

      if (!profile) {
        console.log('No profile found, defaulting to demo');
        setStatus('demo');
        setDaysLeft(null);
        setSubscriptionId(null);
        return;
      }

      // Check and update expired subscription
      const currentStatus = await checkAndUpdateExpiredSubscription(
        user.id,
        profile.subscription_status || 'demo',
        profile.subscription_expires_at
      );

      setStatus(currentStatus as 'demo' | 'pro' | 'enterprise');
      setSubscriptionId(profile.prodamus_subscription_id);
      
      // Calculate days left only for paid subscriptions
      if (currentStatus !== 'demo' && profile.subscription_expires_at) {
        setDaysLeft(calculateDaysLeft(profile.subscription_expires_at));
      } else {
        setDaysLeft(null);
      }

    } catch (error) {
      console.error('Error in fetchSubscriptionData:', error);
      setStatus('demo');
      setDaysLeft(null);
      setSubscriptionId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    await fetchSubscriptionData();
  };

  const canAccess = (feature: keyof SubscriptionLimits): boolean => {
    const currentLimits = SUBSCRIPTION_LIMITS[status];
    return currentLimits[feature] as boolean;
  };

  const cancelSubscription = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !subscriptionId) {
      return { success: false, error: 'Нет активной подписки для отмены' };
    }

    try {
      // Update subscription status to demo and clear subscription data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'demo',
          subscription_expires_at: null,
          prodamus_subscription_id: null
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error cancelling subscription:', updateError);
        return { success: false, error: 'Ошибка при отмене подписки' };
      }

      // Refresh subscription data
      await fetchSubscriptionData();
      
      return { success: true };
    } catch (error) {
      console.error('Error in cancelSubscription:', error);
      return { success: false, error: 'Произошла ошибка при отмене подписки' };
    }
  };

  const limits = SUBSCRIPTION_LIMITS[status];
  const hasActiveSubscription = status !== 'demo' && (daysLeft === null || daysLeft > 0);

  // Initial load and auth state changes
  useEffect(() => {
    fetchSubscriptionData();
  }, [user]);

  // Listen for profile changes in realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Profile updated:', payload);
          fetchSubscriptionData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    status,
    isLoading,
    canAccess,
    daysLeft,
    limits,
    refresh,
    hasActiveSubscription,
    subscriptionId,
    cancelSubscription,
  };
};