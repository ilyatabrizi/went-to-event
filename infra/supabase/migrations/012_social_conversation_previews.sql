-- Return one latest-message row per conversation for a member.
-- DISTINCT ON lets Postgres use the messages conversation/created index instead
-- of sending every message to the serverless function for reduction.
create or replace function public.list_conversation_previews(p_user_id text)
returns table (
  conversation_id uuid,
  message_id uuid,
  sender_id text,
  body text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select distinct on (m.conversation_id)
    m.conversation_id,
    m.id as message_id,
    m.sender_id,
    m.body,
    m.created_at
  from public.messages m
  join public.conversation_members member
    on member.conversation_id = m.conversation_id
   and member.user_id = p_user_id
  order by m.conversation_id, m.created_at desc, m.id desc;
$$;

revoke execute on function public.list_conversation_previews(text) from public;
grant execute on function public.list_conversation_previews(text) to service_role;
