-- =====================================================================
-- bbecoplatform.uz — Supabase ma'lumotlar bazasi sxemasi
-- Supabase Dashboard → SQL Editor → New query → shu faylni to'liq
-- joylashtirib "Run" bosing. Skriptni qayta ishga tushirish xavfsiz
-- (idempotent): mavjud ma'lumotlar o'chirilmaydi.
--
-- Jadvallar:
--   profiles               — mobil ilova foydalanuvchilari (auth.users bilan bog'liq)
--   organizations          — mas'ul tashkilotlar
--   reports                — fuqarolar arizalari (ECO REPORT)
--   report_status_history  — holat o'zgarishlari / faoliyat jurnali
--   app_settings           — ilova sozlamalari (admin paneldan boshqariladi)
-- Storage:
--   report-media (private) — arizaga biriktirilgan foto/video
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. JADVALLAR
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  phone           text,
  email           text,
  is_anonymous    boolean not null default false,
  role            text not null default 'user' check (role in ('user','moderator','admin')),
  blocked         boolean not null default false,
  admin_note      text,
  created_at      timestamptz not null default now(),
  last_sign_in_at timestamptz
);

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  short_name  text,
  region      text,                      -- viloyat kodi (null = respublika miqyosida)
  categories  text[] not null default '{}', -- Chiqindi, Havo, Suv, Daraxt, Tuproq, Boshqa
  head        text,
  phone       text,
  email       text,
  address     text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create sequence if not exists public.report_case_seq;

create table if not exists public.reports (
  id                uuid primary key default gen_random_uuid(),
  case_no           text not null unique,
  user_id           uuid default auth.uid(),
  description       text not null check (char_length(description) between 3 and 5000),
  category          text not null check (category in ('Chiqindi','Havo','Suv','Daraxt','Tuproq','Boshqa')),
  region            text,
  address           text,
  lat               double precision,
  lng               double precision,
  location_text     text,
  media_path        text,
  media_type        text check (media_type in ('image','video') or media_type is null),
  status            smallint not null default 0 check (status between 0 and 4),
  priority          smallint not null default 0 check (priority between 0 and 2),
  org_id            uuid,
  admin_note        text,
  cancelled         boolean not null default false,
  cancelled_at      timestamptz,
  edited_at         timestamptz,
  status_changed_at timestamptz,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint reports_user_id_fkey foreign key (user_id) references public.profiles(id) on delete set null,
  constraint reports_org_id_fkey  foreign key (org_id)  references public.organizations(id) on delete set null
);

create table if not exists public.report_status_history (
  id         bigint generated always as identity primary key,
  report_id  uuid not null,
  event      text not null check (event in ('created','status','org','note','edited','cancelled','priority')),
  status     smallint,
  note       text,
  actor      uuid,
  created_at timestamptz not null default now(),
  constraint report_status_history_report_id_fkey foreign key (report_id) references public.reports(id) on delete cascade,
  constraint report_status_history_actor_fkey     foreign key (actor)     references public.profiles(id) on delete set null
);

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists reports_user_idx     on public.reports(user_id);
create index if not exists reports_created_idx  on public.reports(created_at desc);
create index if not exists reports_status_idx   on public.reports(status);
create index if not exists reports_region_idx   on public.reports(region);
create index if not exists reports_category_idx on public.reports(category);
create index if not exists reports_org_idx      on public.reports(org_id);
create index if not exists history_report_idx   on public.report_status_history(report_id, created_at);
create index if not exists history_created_idx  on public.report_status_history(created_at desc);

-- ---------------------------------------------------------------------
-- 2. YORDAMCHI FUNKSIYALAR (rollar)
-- ---------------------------------------------------------------------
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role in ('admin','moderator') and not blocked);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'admin' and not blocked);
$$;

create or replace function public.setting(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select value from public.app_settings where key = p_key;
$$;

-- Tizim ichki amallari (hisobni o'chirish va h.k.) uchun cheklovlarni chetlab o'tish belgisi
create or replace function public.eco_bypass() returns boolean
language sql stable as $$ select coalesce(current_setting('eco.bypass', true), '') = 'on'; $$;

-- ---------------------------------------------------------------------
-- 3. PROFILLAR: auth.users bilan avtomatik sinxronlash
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, email, is_anonymous, created_at, last_sign_in_at)
  values (new.id,
          nullif(new.raw_user_meta_data->>'full_name', ''),
          nullif(new.phone, ''),
          nullif(new.email, ''),
          coalesce(new.is_anonymous, false),
          coalesce(new.created_at, now()),
          new.last_sign_in_at)
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.handle_user_updated() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('eco.bypass', 'on', true);
  update public.profiles set
    phone           = nullif(new.phone, ''),
    email           = nullif(new.email, ''),
    is_anonymous    = coalesce(new.is_anonymous, false),
    last_sign_in_at = new.last_sign_in_at,
    full_name       = coalesce(full_name, nullif(new.raw_user_meta_data->>'full_name', ''))
  where id = new.id;
  perform set_config('eco.bypass', 'off', true);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated after update of phone, email, is_anonymous, last_sign_in_at, raw_user_meta_data on auth.users
  for each row execute function public.handle_user_updated();

-- Oddiy foydalanuvchi faqat o'z ismini o'zgartira oladi
create or replace function public.profiles_protect() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.eco_bypass() or auth.uid() is null then return new; end if;
  if not public.is_admin() then
    new.role := old.role; new.blocked := old.blocked; new.phone := old.phone; new.email := old.email;
    new.is_anonymous := old.is_anonymous; new.admin_note := old.admin_note; new.created_at := old.created_at;
    new.last_sign_in_at := old.last_sign_in_at;
  elsif new.id = auth.uid() and (new.role <> 'admin' or new.blocked) then
    raise exception 'O‘zingizni admin rolidan chiqara yoki bloklay olmaysiz';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.profiles_protect();

-- Mavjud foydalanuvchilar uchun profil yaratish (sxema keyinroq qo'shilgan bo'lsa)
insert into public.profiles (id, full_name, phone, email, is_anonymous, created_at, last_sign_in_at)
select u.id, nullif(u.raw_user_meta_data->>'full_name',''), nullif(u.phone,''), nullif(u.email,''),
       coalesce(u.is_anonymous,false), u.created_at, u.last_sign_in_at
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 4. ARIZALAR: biznes qoidalari (triggerlar)
-- ---------------------------------------------------------------------
create or replace function public.reports_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_limit int;
  v_org   uuid;
begin
  new.case_no := 'ECO-' || lpad(nextval('public.report_case_seq')::text, 6, '0');
  new.created_at := now();
  new.updated_at := now();

  if auth.uid() is not null and not public.is_staff() then
    -- Fuqaro faqat o'z nomidan, boshlang'ich holatda ariza yubora oladi
    new.user_id := auth.uid();
    new.status := 0; new.priority := 0; new.cancelled := false; new.cancelled_at := null;
    new.org_id := null; new.admin_note := null; new.edited_at := null; new.resolved_at := null;

    if coalesce(public.setting('accepting_reports') #>> '{}', 'true') = 'false' then
      raise exception 'Arizalarni qabul qilish vaqtincha to‘xtatilgan';
    end if;
    if exists (select 1 from public.profiles where id = auth.uid() and blocked) then
      raise exception 'Hisobingiz bloklangan';
    end if;
    v_limit := coalesce(nullif(public.setting('daily_limit') #>> '{}', '')::int, 0);
    if v_limit > 0 and (select count(*) from public.reports
                        where user_id = auth.uid() and created_at > now() - interval '24 hours') >= v_limit then
      raise exception 'Kunlik ariza limiti tugadi (% ta)', v_limit;
    end if;
  end if;

  -- Avtomatik yo'naltirish: viloyat + kategoriya bo'yicha mos tashkilot
  if new.org_id is null and coalesce(public.setting('auto_assign') #>> '{}', 'false') = 'true' then
    select o.id into v_org from public.organizations o
    where o.active and new.category = any(o.categories) and (o.region = new.region or o.region is null)
    order by (o.region is null), o.created_at limit 1;
    if v_org is not null then new.org_id := v_org; end if;
  end if;
  return new;
end $$;

create or replace function public.reports_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_days int;
begin
  if public.eco_bypass() then return new; end if;

  if auth.uid() is not null and not public.is_staff() then
    if old.user_id is distinct from auth.uid() then raise exception 'Ruxsat yo‘q'; end if;
    if old.cancelled then raise exception 'Ariza bekor qilingan, o‘zgartirib bo‘lmaydi'; end if;
    -- Fuqaro faqat tavsif, kategoriya va "bekor qilish"ni o'zgartira oladi
    new.id := old.id; new.case_no := old.case_no; new.user_id := old.user_id;
    new.region := old.region; new.address := old.address; new.lat := old.lat; new.lng := old.lng;
    new.location_text := old.location_text; new.media_path := old.media_path; new.media_type := old.media_type;
    new.status := old.status; new.priority := old.priority; new.org_id := old.org_id; new.admin_note := old.admin_note;
    new.created_at := old.created_at; new.resolved_at := old.resolved_at; new.status_changed_at := old.status_changed_at;
    new.edited_at := old.edited_at;
    if new.cancelled = false then new.cancelled := old.cancelled; end if;

    if new.description is distinct from old.description or new.category is distinct from old.category then
      v_days := coalesce(nullif(public.setting('edit_days') #>> '{}', '')::int, 5);
      if now() - old.created_at > make_interval(days => v_days) then
        raise exception 'Tahrirlash muddati tugagan';
      end if;
      new.edited_at := now();
    end if;
  end if;

  if new.cancelled and not old.cancelled then new.cancelled_at := now(); end if;
  if not new.cancelled then new.cancelled_at := null; end if;
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    if new.status >= 3 and old.status < 3 then new.resolved_at := now(); end if;
    if new.status < 3 then new.resolved_at := null; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.reports_after_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.report_status_history (report_id, event, status, actor)
    values (new.id, 'created', new.status, auth.uid());
    if new.org_id is not null then
      insert into public.report_status_history (report_id, event, note, actor)
      values (new.id, 'org', (select name from public.organizations where id = new.org_id), null);
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.report_status_history (report_id, event, status, actor) values (new.id, 'status', new.status, auth.uid());
  end if;
  if new.org_id is distinct from old.org_id then
    insert into public.report_status_history (report_id, event, note, actor)
    values (new.id, 'org', coalesce((select name from public.organizations where id = new.org_id), '—'), auth.uid());
  end if;
  if new.admin_note is distinct from old.admin_note and coalesce(new.admin_note, '') <> '' then
    insert into public.report_status_history (report_id, event, note, actor) values (new.id, 'note', new.admin_note, auth.uid());
  end if;
  if new.priority is distinct from old.priority then
    insert into public.report_status_history (report_id, event, status, actor) values (new.id, 'priority', new.priority, auth.uid());
  end if;
  if new.cancelled and not old.cancelled then
    insert into public.report_status_history (report_id, event, actor) values (new.id, 'cancelled', auth.uid());
  end if;
  if new.edited_at is distinct from old.edited_at and new.edited_at is not null then
    insert into public.report_status_history (report_id, event, actor) values (new.id, 'edited', auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists reports_before_insert on public.reports;
create trigger reports_before_insert before insert on public.reports
  for each row execute function public.reports_before_insert();
drop trigger if exists reports_before_update on public.reports;
create trigger reports_before_update before update on public.reports
  for each row execute function public.reports_before_update();
drop trigger if exists reports_after_change on public.reports;
create trigger reports_after_change after insert or update on public.reports
  for each row execute function public.reports_after_change();

-- ---------------------------------------------------------------------
-- 5. RPC: hisobni o'chirish (ilova) va foydalanuvchini o'chirish (admin)
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Kirish talab qilinadi'; end if;
  perform set_config('eco.bypass', 'on', true);
  update public.reports set user_id = null where user_id = auth.uid();  -- arizalar anonim qoladi
  delete from auth.users where id = auth.uid();                          -- profil cascade bilan o'chadi
end $$;

create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Faqat admin uchun'; end if;
  if p_user = auth.uid() then raise exception 'O‘zingizni o‘chira olmaysiz'; end if;
  perform set_config('eco.bypass', 'on', true);
  update public.reports set user_id = null where user_id = p_user;
  delete from auth.users where id = p_user;
end $$;

revoke all on function public.delete_my_account() from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.organizations         enable row level security;
alter table public.reports               enable row level security;
alter table public.report_status_history enable row level security;
alter table public.app_settings          enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- organizations (ilova tashkilot nomini ko'rsatadi — o'qish hamma uchun)
drop policy if exists orgs_select on public.organizations;
create policy orgs_select on public.organizations for select to anon, authenticated using (true);
drop policy if exists orgs_write on public.organizations;
create policy orgs_write on public.organizations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- reports
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (user_id = auth.uid() or public.is_staff());
drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports for update to authenticated
  using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
drop policy if exists reports_delete on public.reports;
create policy reports_delete on public.reports for delete to authenticated using (public.is_admin());

-- history (faqat o'qish; yozuvlar triggerlar orqali qo'shiladi)
drop policy if exists history_select on public.report_status_history;
create policy history_select on public.report_status_history for select to authenticated
  using (public.is_staff() or exists (select 1 from public.reports r where r.id = report_id and r.user_id = auth.uid()));

-- app_settings
drop policy if exists settings_select on public.app_settings;
create policy settings_select on public.app_settings for select to anon, authenticated using (true);
drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 7. STORAGE: report-media (yopiq bucket, 50 MB, faqat rasm/video)
--    Fayl yo'li: <user_id>/<vaqt>-<tasodifiy>.<kengaytma>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-media', 'report-media', false, 52428800, array['image/*','video/*'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "report-media insert own" on storage.objects;
create policy "report-media insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'report-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "report-media read own or staff" on storage.objects;
create policy "report-media read own or staff" on storage.objects for select to authenticated
  using (bucket_id = 'report-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
drop policy if exists "report-media delete staff" on storage.objects;
create policy "report-media delete staff" on storage.objects for delete to authenticated
  using (bucket_id = 'report-media' and public.is_staff());

-- ---------------------------------------------------------------------
-- 8. REALTIME (ilova va admin panel o'zgarishlarni jonli ko'radi)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['reports','profiles','report_status_history'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 9. BOSHLANG'ICH MA'LUMOTLAR
-- ---------------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('accepting_reports', 'true'::jsonb),
  ('edit_days',         '5'::jsonb),
  ('daily_limit',       '10'::jsonb),
  ('auto_assign',       'false'::jsonb),
  ('announcement',      '{"enabled": false, "uz": "", "ru": ""}'::jsonb)
on conflict (key) do nothing;

insert into public.organizations (name, short_name, region, categories, phone, email)
select * from (values
  ('O‘zbekiston Respublikasi Ekologiya, atrof-muhitni muhofaza qilish va iqlim o‘zgarishi vazirligi', 'Ekologiya vazirligi', null::text,
     array['Chiqindi','Havo','Suv','Daraxt','Tuproq','Boshqa'], '+998 71 207-07-70', null::text),
  ('Toshkent shahar Ekologiya boshqarmasi', 'Toshkent sh. ekologiya', 'tashkent_city', array['Havo','Suv','Daraxt','Tuproq','Boshqa'], null, null),
  ('“Toshkent shahar obodonlashtirish” boshqarmasi', 'Obodonlashtirish', 'tashkent_city', array['Chiqindi','Daraxt'], null, null),
  ('Chiqindilar bilan ishlash agentligi', 'Chiqindi agentligi', null, array['Chiqindi'], null, null)
) as v(name, short_name, region, categories, phone, email)
where not exists (select 1 from public.organizations);

-- =====================================================================
-- 10. ADMINNI TAYINLASH (bir marta, qo'lda):
--   1) Authentication → Users → "Add user" → email + parol (Auto confirm)
--   2) Quyidagini o'z emailingiz bilan ishga tushiring:
--      update public.profiles set role = 'admin' where email = 'admin@bbecoplatform.uz';
-- =====================================================================
