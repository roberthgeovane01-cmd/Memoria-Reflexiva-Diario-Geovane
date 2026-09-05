import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { DEMO_ALLOWED, isDemoActive } from "@/lib/demo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Sessão real primeiro; o modo de teste é só contingência.
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return { user: data.user };
    // Modo de teste existe apenas em desenvolvimento; em produção não há fallback.
    if (DEMO_ALLOWED && isDemoActive()) return;
    throw redirect({ to: "/auth" });
  },

  component: () => <Outlet />,
});
