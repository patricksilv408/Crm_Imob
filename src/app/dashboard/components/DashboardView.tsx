"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import { Shield, Cog, Users } from "lucide-react";
import { User } from "@supabase/supabase-js";

type Profile = {
  role: string | null;
};

export default function DashboardView({
  children,
  user: initialUser,
  profile: initialProfile,
}: {
  children: React.ReactNode;
  user: User | null;
  profile: Profile | null;
}) {
  const { signOut, user: contextUser, profile: contextProfile } = useAuth();

  const user = contextUser || initialUser;
  const profile = contextProfile || initialProfile;

  return (
    <>
      <Toaster richColors />
      <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 bg-gray-50">
        <div className="w-full max-w-6xl p-4 sm:p-8 bg-white rounded-lg shadow-md">
          <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="font-semibold">{user?.email}</p>
                <p className="text-sm text-gray-500">
                  {profile?.role || "Carregando..."}
                </p>
              </div>
              {profile?.role === "SuperAdmin" && (
                <Button asChild variant="secondary" size="sm">
                  <Link href="/dashboard/admin">
                    <Shield className="mr-2 h-4 w-4" />
                    Painel Admin
                  </Link>
                </Button>
              )}
              {profile?.role === "AdminImobiliaria" && (
                <Button asChild variant="secondary" size="sm">
                  <Link href="/dashboard/manage-users">
                    <Users className="mr-2 h-4 w-4" />
                    Gerenciar Usuários
                  </Link>
                </Button>
              )}
              {(profile?.role === "SuperAdmin" ||
                profile?.role === "AdminImobiliaria") && (
                <Button asChild variant="secondary" size="sm">
                  <Link href="/dashboard/settings">
                    <Cog className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                </Button>
              )}
              <Button onClick={signOut} variant="outline" size="sm">
                Sair
              </Button>
            </div>
          </div>

          {children}
        </div>
      </div>
    </>
  );
}