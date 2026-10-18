-- Short descriptions are allowed; the UI still requires a non-empty value.
alter table public.account_verification_requests
  drop constraint if exists account_verification_requests_message_check;

alter table public.account_verification_requests
  add constraint account_verification_requests_message_check
  check (char_length(message) between 1 and 1000);
