import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface KidProfile {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  display_name: string;
  avatar_preset: string;
  avatar_url: string | null;
  card_design: string;
  pin_hash: string | null;
  allowance_balance: number;
  created_at: string;
  updated_at: string;
}

export interface AllowanceTransaction {
  id: string;
  user_id: string;
  kid_profile_id: string;
  amount: number;
  type: 'deposit' | 'withdraw';
  description: string | null;
  created_at: string;
}

export const AVATAR_PRESETS = [
  { id: 'astronaut', emoji: '👨‍🚀', label: 'Astronaut' },
  { id: 'princess', emoji: '👸', label: 'Princess' },
  { id: 'superhero', emoji: '🦸', label: 'Superhero' },
  { id: 'scientist', emoji: '🧑‍🔬', label: 'Scientist' },
  { id: 'pirate', emoji: '🏴‍☠️', label: 'Pirate' },
  { id: 'dragon', emoji: '🐉', label: 'Dragon' },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'ninja', emoji: '🥷', label: 'Ninja' },
  { id: 'wizard', emoji: '🧙', label: 'Wizard' },
  { id: 'fairy', emoji: '🧚', label: 'Fairy' },
  { id: 'alien', emoji: '👽', label: 'Alien' },
];

export const CARD_DESIGNS = [
  { id: 'galaxy', label: 'Galaxy Explorer', gradient: 'from-indigo-500 via-purple-500 to-pink-500', pattern: '✨🌌🚀' },
  { id: 'ocean', label: 'Ocean Diver', gradient: 'from-cyan-500 via-blue-500 to-teal-500', pattern: '🐠🌊🐚' },
  { id: 'jungle', label: 'Jungle King', gradient: 'from-green-500 via-emerald-500 to-lime-500', pattern: '🌿🦁🌴' },
  { id: 'sunset', label: 'Sunset Dreamer', gradient: 'from-orange-500 via-red-500 to-pink-500', pattern: '🌅☀️🌺' },
  { id: 'arctic', label: 'Arctic Explorer', gradient: 'from-sky-300 via-blue-400 to-indigo-400', pattern: '❄️🐧🏔️' },
  { id: 'candy', label: 'Candy Land', gradient: 'from-pink-400 via-fuchsia-400 to-violet-400', pattern: '🍭🍬🎀' },
  { id: 'treasure', label: 'Treasure Hunter', gradient: 'from-amber-500 via-yellow-500 to-orange-400', pattern: '💰🗝️👑' },
  { id: 'ninja', label: 'Shadow Ninja', gradient: 'from-slate-700 via-gray-600 to-zinc-500', pattern: '🥷⚔️🌙' },
];

// Free tier: max 2 kids, Pro: unlimited
export const MAX_FREE_KIDS = 2;

// Simple hash for PIN (not cryptographic - just for kid balance hiding)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'kid-salt-intoiq');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useKidProfile() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<KidProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<AllowanceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const profile = profiles.find(p => p.id === selectedProfileId) || null;
  const hasProfile = profiles.length > 0;

  const fetchProfiles = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('kid_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const kidProfiles = (data || []) as unknown as KidProfile[];
      setProfiles(kidProfiles);

      // Auto-select first profile if none selected or selected no longer exists
      if (kidProfiles.length > 0) {
        setSelectedProfileId(prev => {
          if (prev && kidProfiles.some(p => p.id === prev)) return prev;
          return kidProfiles[0].id;
        });
      } else {
        setSelectedProfileId(null);
      }
    } catch (error) {
      console.error('Error fetching kid profiles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user || !profile) return;

    try {
      const { data, error } = await supabase
        .from('allowance_transactions')
        .select('*')
        .eq('kid_profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data as unknown as AllowanceTransaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (profile) fetchTransactions();
    else setTransactions([]);
  }, [profile, fetchTransactions]);

  const createProfile = async (data: {
    display_name: string;
    avatar_preset: string;
    avatar_url?: string | null;
    card_design: string;
    pin: string;
    portfolio_id?: string | null;
  }) => {
    if (!user) return null;

    try {
      const pinHash = await hashPin(data.pin);

      const { data: newProfile, error } = await supabase
        .from('kid_profiles')
        .insert({
          user_id: user.id,
          display_name: data.display_name,
          avatar_preset: data.avatar_preset,
          avatar_url: data.avatar_url || null,
          card_design: data.card_design,
          pin_hash: pinHash,
        })
        .select()
        .single();

      if (error) throw error;

      // Refetch to get the auto-created portfolio_id from trigger
      const { data: refreshed } = await supabase
        .from('kid_profiles')
        .select('*')
        .eq('id', newProfile.id)
        .single();

      const created = (refreshed || newProfile) as unknown as KidProfile;
      setProfiles(prev => [...prev, created]);
      setSelectedProfileId(created.id);
      toast.success('🎉 Profile created!');
      return created;
    } catch (error) {
      console.error('Error creating kid profile:', error);
      toast.error('Oops! Could not create profile 😅');
      return null;
    }
  };

  const selectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    if (!profile?.pin_hash) return true;
    const pinHash = await hashPin(pin);
    return pinHash === profile.pin_hash;
  };

  const addAllowance = async (amount: number, description: string, type: 'deposit' | 'withdraw' = 'deposit') => {
    if (!user || !profile) return false;

    if (type === 'withdraw' && amount > profile.allowance_balance) {
      toast.error("Not enough savings! 🐷");
      return false;
    }

    try {
      const { error: txError } = await supabase
        .from('allowance_transactions')
        .insert({
          user_id: user.id,
          kid_profile_id: profile.id,
          amount,
          type,
          description,
        });

      if (txError) throw txError;

      const newBalance = type === 'deposit'
        ? profile.allowance_balance + amount
        : profile.allowance_balance - amount;

      const { error: updateError } = await supabase
        .from('kid_profiles')
        .update({ allowance_balance: newBalance })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfiles(prev => prev.map(p =>
        p.id === profile.id ? { ...p, allowance_balance: newBalance } : p
      ));
      await fetchTransactions();

      toast.success(type === 'deposit' ? '💰 Money added!' : '💸 Withdrawal complete!');
      return true;
    } catch (error) {
      console.error('Error with allowance:', error);
      toast.error('Something went wrong 😅');
      return false;
    }
  };

  return {
    profile,
    profiles,
    hasProfile,
    isLoading,
    transactions,
    selectedProfileId,
    createProfile,
    selectProfile,
    verifyPin,
    addAllowance,
    refetch: fetchProfiles,
  };
}
