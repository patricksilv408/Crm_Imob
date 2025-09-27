"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

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
    setSession(session);
    if (session?.user) {
      let { data: userProfile } = await supabase
        .from('profiles')
        .select('*, real_estate_agencies(is_active)')
        .eq('id', session.user.id)
        .single();

      // Autocorreção: Se o perfil não existir, cria um.
      // Isso lida com casos onde o usuário foi criado antes do gatilho do DB estar ativo.
      if (!userProfile && session.user.email) {
        const { data: newUserProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
            role: session.user.email === 'patrick.santosilv@gmail.com' ? 'SuperAdmin' : null
          })
          .select('*, real_estate_agencies(is_active)')
          .single();
        
        if (insertError) {
          console.error("Erro ao criar perfil dinamicamente:", insertError);
        } else {
          userProfile = newUserProfile;
        }
      }

      const agency = userProfile?.real_estate_agencies;
      if (agency && agency.is_active === false) {
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
      } else {
        setProfile(userProfile);
      }
    } else {
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
    if (!loading) {
      if (session && pathname === '/login') {
        router.push('/dashboard');
      } else if (!session && pathname !== '/login') {
        router.push('/login');
      }
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

  if (loading && pathname !== '/login') {
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