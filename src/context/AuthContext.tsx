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
    setLoading(true);
    if (session?.user) {
      let profileData: Profile | null = null;
      let profileError: any = null;

      // Tenta buscar o perfil algumas vezes para lidar com a condição de corrida
      // em que o perfil pode ainda não ter sido criado pelo gatilho do banco de dados.
      for (let i = 0; i < 4; i++) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, real_estate_agencies(is_active)')
          .eq('id', session.user.id)
          .single();

        if (data) {
          profileData = data as Profile;
          profileError = null;
          break; // Perfil encontrado, sai do loop
        }
        
        // Se houver um erro real (que não seja "não encontrado"), armazena e sai.
        if (error && error.code !== 'PGRST116') { // PGRST116 é o código para "Não Encontrado"
          profileError = error;
          break;
        }

        // Se não encontrou, espera um pouco e tenta novamente.
        await new Promise(res => setTimeout(res, 250 * (i + 1)));
      }

      if (profileError || !profileData) {
        console.error("Erro ao buscar perfil do usuário após várias tentativas:", profileError);
        toast.error("Não foi possível carregar seu perfil. Por favor, tente fazer login novamente.");
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
      } else {
        const agencyIsInactive = profileData.real_estate_agencies?.is_active === false;

        if (profileData.role !== 'SuperAdmin' && agencyIsInactive) {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          toast.error("Sua imobiliária está inativa. Contate o suporte.");
        } else {
          setSession(session);
          setProfile(profileData);
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
    const isRootPage = pathname === '/';

    // If user is logged in and on the login or root page, redirect to dashboard
    if (session && (isAuthPage || isRootPage)) {
      router.push('/dashboard');
    }

    // If user is not logged in and not on the login page, redirect to login
    if (!session && !isAuthPage) {
      router.push('/login');
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