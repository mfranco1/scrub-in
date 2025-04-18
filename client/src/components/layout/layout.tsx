import React, { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileMenu } from "./mobile-menu";
import { Header } from "./header";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  const { logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="flex auth-layout">
      <Sidebar />
      <MobileMenu onLogout={handleLogout} />
      
      <main className="flex-1 bg-slate-50 pt-0 md:pt-0">
        <div className="md:p-6 p-4 md:mt-0 mt-16 max-w-7xl mx-auto">
          <Header title={title} subtitle={subtitle} />
          {children}
        </div>
      </main>
    </div>
  );
}
