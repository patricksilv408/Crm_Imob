"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LeadManager } from "./components/LeadManager";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();

  return (
    <>
      <Toaster richColors />
      <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 bg-gray-50">
        <div className="w-full max-w-6xl p-4 sm:p-8 bg-white rounded-lg shadow-md">
          <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold">{user?.email}</p>
                <p className="text-sm text-gray-500">{profile?.role || "Não definida"}</p>
              </div>
              {profile?.role === 'SuperAdmin' && (
                <Button asChild variant="secondary">
                  <Link href="/dashboard/admin">
                    <Shield className="mr-2 h-4 w-4" />
                    Painel Admin
                  </Link>
                </Button>
              )}
              <Button onClick={signOut} variant="outline">Sair</Button>
            </div>
          </div>
          
          <LeadManager />

        </div>
      </div>
    </>
  );
}