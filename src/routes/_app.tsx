import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { IncomingCallListener } from "@/components/IncomingCallListener";
import { SiteNotice } from "@/components/SiteNotice";

export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/", search: { next: undefined } });
  }, [loading, session]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <SiteNotice />
      <Outlet />
      <IncomingCallListener />
    </div>
  );
}
