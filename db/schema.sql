-- On Mic Community: schema (brief §7 data model, plus the small support
-- tables the brief implies: waitlist, rate limits, first-party analytics).
-- Additive and safe to re-run.

create table if not exists jam (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  starts_at         timestamptz not null,
  booking_cutoff_at timestamptz not null,
  seat_capacity     int not null check (seat_capacity > 0),
  price_inr         int not null check (price_inr >= 0),
  venue_name        text not null default '',   -- server-only
  venue_map_url     text not null default '',   -- server-only
  status            text not null default 'draft'
                    check (status in ('draft', 'open', 'closed', 'done')),
  created_at        timestamptz not null default now()
);

create table if not exists staff (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  role       text not null check (role in ('admin', 'door', 'counter')),
  pin_hash   text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists booking (
  id               uuid primary key,
  jam_id           uuid not null references jam(id),
  pass_no          text not null,
  name             text not null,
  phone            text not null,
  instagram        text not null default '',
  tier             text not null default 'regular'
                   check (tier in ('regular', 'performer', 'core', 'guest')),
  state            text not null default 'HELD'
                   check (state in ('HELD', 'PAID_PENDING', 'CONFIRMED', 'CHECKED_IN',
                                    'EXPIRED', 'REJECTED', 'CANCELLED')),
  hold_expires_at  timestamptz,
  utr              text unique,
  amount_inr       int not null,
  pass_token_hash  text not null unique,
  token_rev        int not null default 0,
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  created_at       timestamptz not null default now(),
  utr_submitted_at timestamptz,
  confirmed_at     timestamptz,
  checked_in_at    timestamptz,
  unique (jam_id, pass_no)
);

-- One active seat per phone per jam. Stale HELD rows are flipped to EXPIRED
-- inside the hold transaction before this can bite.
create unique index if not exists booking_one_active_per_phone
  on booking (jam_id, phone)
  where state in ('HELD', 'PAID_PENDING', 'CONFIRMED', 'CHECKED_IN');

create index if not exists booking_jam_state on booking (jam_id, state);

create table if not exists scan_log (
  id         bigserial primary key,
  booking_id uuid references booking(id),
  staff_id   uuid references staff(id),
  result     text not null,  -- VERIFIED | ALREADY_USED | INVALID
  input      text not null default '',
  scanned_at timestamptz not null default now()
);

create table if not exists token_use (
  id         bigserial primary key,
  booking_id uuid not null references booking(id),
  item       text not null default 'mocktail',
  served_at  timestamptz not null default now(),
  staff_id   uuid references staff(id),
  unique (booking_id, item)
);

create table if not exists performer_request (
  id         uuid primary key default gen_random_uuid(),
  jam_id     uuid references jam(id),
  name       text not null,
  phone      text not null,
  acts       text[] not null default '{}',
  notes      text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists waitlist (
  id         uuid primary key default gen_random_uuid(),
  jam_id     uuid references jam(id),
  name       text not null,
  phone      text not null,
  created_at timestamptz not null default now(),
  unique (jam_id, phone)
);

create table if not exists rate_hit (
  key text not null,
  at  timestamptz not null default now()
);
create index if not exists rate_hit_key_at on rate_hit (key, at);

-- Privacy-friendly analytics: no cookies, no IP, no user id.
create table if not exists analytics_event (
  id           bigserial primary key,
  name         text not null,
  path         text not null default '',
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  referrer     text,
  created_at   timestamptz not null default now()
);
create index if not exists analytics_event_created on analytics_event (created_at);
