"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from "sonner";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const handleAuthStateChange = async (session: Session | null) => {
    if (session?.user) {
      const user = session.user;
      
      // Etapa 1: Construir o perfil a partir do token (JWT) para evitar a consulta ao banco que está falhando.
      // Isso também é mais performático.
      const userProfile = {
        id: user.id,
        email: user.email,
        role: user.app_metadata?.role || null,
        real_estate_agency_id: user.app_metadata?.agency_id || null,
      };

      // Etapa 2: Se o usuário tiver uma imobiliária, buscar o status da imobiliária.
      if (userProfile.real_estate_agency_id) {
        const { data: agency, error: agencyError } = await supabase
          .from('real_estate_agencies')
          .select('is_active')
          .eq('id', userProfile.real_estate_agency_id)
          .single();

        if (agencyError) {
          console.error("Erro ao buscar dados da imobiliária:", agencyError);
        }
        
        // Anexar o status da imobiliária ao objeto do perfil.
        // @ts-ignore
        userProfile.real_estate_agencies = agency;
      }

      // Etapa 3: Verificar se a imobiliária está inativa e desconectar o usuário, se necessário.
      // @ts-ignore
      const agencyIsInactive = userProfile?.real_estate_agencies?.is_active === false;
      if (userProfile.role !== 'SuperAdmin' && agencyIsInactive) {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        toast.error("Sua imobiliária está inativa. Contate o suporte.");
      } else {
        setSession(session);
        setProfile(userProfile);
      }
    } else {
      setSession(null);
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await handleAuthStateChange(session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        // Forçar a atualização do token para obter os claims mais recentes
        if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') {
            const { data: { session: newSession } } = await supabase.auth.getSession();
            await handleAuthStateChange(newSession);
        } else if (_event === 'SIGNED_OUT') {
            await handleAuthStateChange(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login';

    if (!session && !isAuthPage) {
      router.push('/login');
    }

    if (session && isAuthPage) {
      router.push('/dashboard');
    }
  }, [session, loading, pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/login');
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signOut,
  };

  if (loading) {
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