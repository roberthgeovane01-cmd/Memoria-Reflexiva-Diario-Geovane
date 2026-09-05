-- generated_reflections só tinha policy de SELECT: o insert do cliente
-- (src/lib/db.ts) falhava silenciosamente e a cadeia versão IA → edição →
-- aprovação nunca era gravada (RN-004/RN-011). Segue como fallback do lado
-- do cliente; a geração real hoje passa pela Edge Function generate-reflection,
-- que grava com a secret key.
create policy "generated_reflections_insert_own"
on public.generated_reflections
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and session_id in (
    select reflection_sessions.id
    from reflection_sessions
    where reflection_sessions.user_id = (select auth.uid())
  )
);
