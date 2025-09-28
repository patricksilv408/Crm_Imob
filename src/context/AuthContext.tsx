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
      // Etapa 1: Buscar os dados do perfil do usuário.
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // Ignorar "linha não encontrada"
        console.error("Erro ao buscar perfil:", profileError);
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Etapa 2: Se o usuário tiver uma imobiliária, buscar o status da imobiliária.
      if (userProfile && userProfile.real_estate_agency_id) {
        const { data: agency, error: agencyError } = await supabase
          .from('real_estate_agencies')
          .select('is_active')
          .eq('id', userProfile.real_estate_agency_id)
          .single();

        if (agencyError) {
          console.error("Erro ao buscar dados da imobiliária:", agencyError);
        } else {
          // Anexar o status da imobiliária ao objeto do perfil para uso consistente.
          userProfile.real_estate_agencies = agency;
        }
      }

      // Etapa 3: Verificar se a imobiliária está inativa e desconectar o usuário, se necessário.
      const agencyIsInactive = userProfile?.real_estate_agencies?.is_active === false;
      if (agencyIsInactive) {
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
        await handleAuthStateChange(session);
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