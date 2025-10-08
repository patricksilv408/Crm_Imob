"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from "sonner";

type Profile = {
  id: string;
  email: string | null;
  role: 'SuperAdmin' | 'AdminImobiliaria' | 'Corretor' | null;
  real_estate_agency_id: string | null;
  real_estate_agencies: { is_active: boolean } | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const handleAuthStateChange = async (session: Session | null) => {
    if (session?.user) {
      let finalProfile: Profile | null = null;
      let criticalError: { message: string } | null = null;

      // Retry logic to handle potential race condition where profile is not yet created
      for (let i = 0; i < 4; i++) {
        // Step 1: Fetch profile directly. This should be reliable.
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = Not Found
          criticalError = { message: `Profile fetch error: ${profileError.message}` };
          break;
        }

        if (profileData) {
          // Step 2: If profile has an agency, fetch agency status.
          if (profileData.real_estate_agency_id) {
            const { data: agencyData, error: agencyError } = await supabase
              .from('real_estate_agencies')
              .select('is_active')
              .eq('id', profileData.real_estate_agency_id)
              .single();
            
            if (agencyError) {
              criticalError = { message: `Agency fetch error: ${agencyError.message}` };
              break;
            }
            
            (profileData as Profile).real_estate_agencies = agencyData ? { is_active: agencyData.is_active } : null;
          } else {
            (profileData as Profile).real_estate_agencies = null;
          }
          
          finalProfile = profileData as Profile;
          break; // Success
        }

        await new Promise(res => setTimeout(res, 250 * (i + 1)));
      }

      if (criticalError || !finalProfile) {
        console.error("Error loading user data:", criticalError);
        toast.error("Não foi possível carregar seu perfil. Por favor, tente fazer login novamente.");
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
      } else {
        const agencyIsInactive = finalProfile.real_estate_agencies?.is_active === false;

        if (finalProfile.role !== 'SuperAdmin' && agencyIsInactive) {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          toast.error("Sua imobiliária está inativa. Contate o suporte.");
        } else {
          setSession(session);
          setProfile(finalProfile);
        }
      }
    } else {
      setSession(null);
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message === 'Failed to fetch') {
        event.preventDefault();
        console.error('Caught unhandled promise rejection (Failed to fetch):', event.reason);
        toast.error("Falha de rede. Verifique sua conexão e desative bloqueadores de anúncio.");
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    const getInitialSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      await handleAuthStateChange(session);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await handleAuthStateChange(session);
      }
    );

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login';

    if (session && isAuthPage) {
      router.push('/dashboard');
    }

    if (!session && !isAuthPage) {
      router.push('/login');
    }
  }, [session, loading, pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null); // Ensure session is cleared immediately
    router.push('/login');
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signOut,
  };

  // While the context is loading, or if we are redirecting, show a loading screen.
  // This prevents flashing content.
  if (loading || (!session && pathname !== '/login') || (session && pathname === '/login')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};