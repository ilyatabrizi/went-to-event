create or replace function public.list_conversation_inbox(p_user_id text)
returns table (
  conversation_id uuid,
  updated_at timestamptz,
  person_id text,
  username text,
  display_name text,
  avatar_url text,
  message_id uuid,
  message_sender_id text,
  message_body text,
  message_created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    conversation.id,
    conversation.updated_at,
    person.id,
    person.username,
    person.display_name,
    person.avatar_url,
    latest.id,
    latest.sender_id,
    latest.body,
    latest.created_at
  from public.conversation_members membership
  join public.conversations conversation on conversation.id = membership.conversation_id
  join lateral (
    select member.user_id
    from public.conversation_members member
    where member.conversation_id = conversation.id
      and member.user_id <> p_user_id
    order by member.joined_at asc
    limit 1
  ) other on true
  left join public.profiles person on person.id = other.user_id
  left join lateral (
    select message.id, message.sender_id, message.body, message.created_at
    from public.messages message
    where message.conversation_id = conversation.id
    order by message.created_at desc, message.id desc
    limit 1
  ) latest on true
  where membership.user_id = p_user_id
  order by conversation.updated_at desc;
$$;

revoke execute on function public.list_conversation_inbox(text) from public;
grant execute on function public.list_conversation_inbox(text) to service_role;
