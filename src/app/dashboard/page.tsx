"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
      <div className="w-full max-w-4xl p-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={signOut} variant="outline">Sair</Button>
        </div>
        <div className="space-y-4">
          <p>
            <strong>Email:</strong> {user?.email}
          </p>
          <p>
            <strong>Função:</strong> {profile?.role || "Não definida"}
          </p>
          {profile?.role === 'SuperAdmin' && (
            <div className="p-4 mt-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700">
              <p className="font-bold">Modo SuperAdmin</p>
              <p>Você tem acesso total ao sistema.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}