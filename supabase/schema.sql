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
--   report_comments        — idora xodimlarining ichki izohlari (fuqaro ko'rmaydi)
--   response_templates     — fuqaroga javob shablonlari
--   app_settings           — ilova sozlamalari (admin paneldan boshqariladi)
-- Rollar (profiles.role):
--   user       — fuqaro (mobil ilova)
--   admin      — vazirlik markaziy apparati: hamma arizalar, tashkilotlar, xodimlar
--   moderator  — vazirlik operatori: hamma arizalarni ko'radi va taqsimlaydi
--   org_head   — idora rahbari: o'z idorasi arizalari, ijrochi tayinlash, yo'naltirish
--   org_staff  — idora ijrochisi (inspektor): o'ziga biriktirilgan arizalar
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
  role            text not null default 'user',
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
  event      text not null,
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

-- Idoralar portali uchun qo'shimcha ustunlar (eski bazalarda ham qo'shiladi)
alter table public.profiles add column if not exists org_id   uuid;
alter table public.profiles add column if not exists position text;
alter table public.reports  add column if not exists assignee_id   uuid;
alter table public.reports  add column if not exists deadline_at   timestamptz;
alter table public.reports  add column if not exists accepted_at   timestamptz;
alter table public.reports  add column if not exists proof_path    text;
alter table public.reports  add column if not exists reject_reason text;
alter table public.reports  add column if not exists extend_count  smallint not null default 0;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user','moderator','admin','org_head','org_staff'));
alter table public.profiles drop constraint if exists profiles_org_id_fkey;
alter table public.profiles add constraint profiles_org_id_fkey
  foreign key (org_id) references public.organizations(id) on delete set null;
alter table public.reports drop constraint if exists reports_assignee_id_fkey;
alter table public.reports add constraint reports_assignee_id_fkey
  foreign key (assignee_id) references public.profiles(id) on delete set null;
alter table public.report_status_history drop constraint if exists report_status_history_event_check;
alter table public.report_status_history add constraint report_status_history_event_check
  check (event in ('created','status','org','note','edited','cancelled','priority',
                   'assigned','deadline','forwarded','rejected','proof'));

create table if not exists public.report_comments (
  id         bigint generated always as identity primary key,
  report_id  uuid not null references public.reports(id) on delete cascade,
  author     uuid default auth.uid() references public.profiles(id) on delete set null,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.response_templates (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references public.organizations(id) on delete cascade,  -- null = hamma idoralar uchun
  title      text not null check (char_length(title) between 1 and 200),
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists reports_user_idx     on public.reports(user_id);
create index if not exists reports_assignee_idx on public.reports(assignee_id);
create index if not exists reports_deadline_idx on public.reports(deadline_at);
create index if not exists profiles_org_idx     on public.profiles(org_id);
create index if not exists comments_report_idx  on public.report_comments(report_id, created_at);
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

-- Idora xodimi (rahbar yoki ijrochi) va uning idorasi
create or replace function public.my_org() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from public.profiles
  where id = auth.uid() and role in ('org_head','org_staff') and not blocked;
$$;

create or replace function public.is_agent() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_org() is not null;
$$;

create or replace function public.is_org_head() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'org_head' and org_id is not null and not blocked);
$$;

-- Arizani ko'rish huquqi: vazirlik xodimi yoki ariza yo'naltirilgan idora xodimi
create or replace function public.can_see_org(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff() or (p_org is not null and p_org = public.my_org());
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
    new.last_sign_in_at := old.last_sign_in_at; new.org_id := old.org_id; new.position := old.position;
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

  -- Ko'rib chiqish muddati: kategoriya bo'yicha (sozlamalar), standart 15 kun
  -- ("Jismoniy va yuridik shaxslarning murojaatlari to'g'risida"gi Qonun)
  if new.deadline_at is null then
    new.deadline_at := now() + make_interval(days => coalesce(
      nullif(public.setting('sla_days') ->> new.category, '')::int, 15));
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

-- Barcha rollar uchun umumiy qoidalar (vaqt belgilari, yo'naltirish, rad etish)
create or replace function public.reports_finish_update(p_new public.reports, p_old public.reports) returns public.reports
language plpgsql security definer set search_path = public as $$
begin
  if p_new.cancelled and not p_old.cancelled then p_new.cancelled_at := now(); end if;
  if not p_new.cancelled then p_new.cancelled_at := null; end if;
  -- Boshqa idoraga yo'naltirildi: yangi idora uchun ariza qaytadan "yangi" bo'ladi
  if p_new.org_id is distinct from p_old.org_id then
    p_new.assignee_id := null;
    if p_old.org_id is not null and p_new.status between 1 and 2 then p_new.status := 0; end if;
  end if;
  if p_new.deadline_at is distinct from p_old.deadline_at and p_new.deadline_at > p_old.deadline_at then
    p_new.extend_count := p_old.extend_count + 1;
  else
    p_new.extend_count := p_old.extend_count;
  end if;
  -- Rad etildi: sabab yozilgan bo'lsa ariza yopiladi
  if coalesce(p_new.reject_reason, '') <> '' and coalesce(p_old.reject_reason, '') = '' then
    p_new.status := 4;
  end if;
  if p_new.status is distinct from p_old.status then
    p_new.status_changed_at := now();
    if p_new.status >= 1 and p_new.accepted_at is null then p_new.accepted_at := now(); end if;
    if p_new.status >= 3 and p_old.status < 3 then p_new.resolved_at := now(); end if;
    if p_new.status < 3 then p_new.resolved_at := null; end if;
  end if;
  p_new.updated_at := now();
  return p_new;
end $$;

create or replace function public.reports_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_days int;
begin
  if public.eco_bypass() then return new; end if;

  if auth.uid() is not null and not public.is_staff() and not public.is_agent() then
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
    return public.reports_finish_update(new, old);
  end if;

  if auth.uid() is not null and not public.is_staff() then
    -- Idora xodimi: faqat o'z idorasiga yo'naltirilgan arizalar
    if not public.is_agent() or old.org_id is distinct from public.my_org() then
      raise exception 'Ruxsat yo‘q';
    end if;
    -- Fuqaro yozgan ma'lumotlar o'zgarmaydi
    new.id := old.id; new.case_no := old.case_no; new.user_id := old.user_id;
    new.description := old.description; new.category := old.category; new.region := old.region;
    new.address := old.address; new.lat := old.lat; new.lng := old.lng; new.location_text := old.location_text;
    new.media_path := old.media_path; new.media_type := old.media_type; new.created_at := old.created_at;
    new.cancelled := old.cancelled; new.cancelled_at := old.cancelled_at; new.edited_at := old.edited_at;
    if old.cancelled then raise exception 'Ariza fuqaro tomonidan bekor qilingan'; end if;

    if not public.is_org_head() then
      -- Ijrochi faqat o'ziga biriktirilgan arizada ishlaydi va uni boshqaga o'tkaza olmaydi
      if old.assignee_id is distinct from auth.uid() then raise exception 'Bu ariza sizga biriktirilmagan'; end if;
      new.assignee_id := old.assignee_id; new.org_id := old.org_id;
      new.deadline_at := old.deadline_at; new.priority := old.priority;
    end if;

    if new.assignee_id is distinct from old.assignee_id and new.assignee_id is not null
       and not exists (select 1 from public.profiles p where p.id = new.assignee_id
                       and p.org_id = old.org_id and p.role in ('org_head','org_staff') and not p.blocked) then
      raise exception 'Ijrochi shu idora xodimi bo‘lishi kerak';
    end if;

    if new.deadline_at is distinct from old.deadline_at then
      if new.deadline_at is null or new.deadline_at > old.created_at + interval '30 days' then
        raise exception 'Muddat murojaat kelgan kundan boshlab 30 kundan oshmasligi kerak';
      end if;
    end if;

    if ((new.status >= 3 and old.status < 3) or (coalesce(new.reject_reason, '') <> '' and coalesce(old.reject_reason, '') = ''))
       and coalesce(btrim(new.admin_note), '') = '' then
      raise exception 'Arizani yopishdan oldin fuqaroga javob yozing';
    end if;
  end if;

  return public.reports_finish_update(new, old);
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
    values (new.id, case when old.org_id is null then 'org' else 'forwarded' end,
            coalesce((select name from public.organizations where id = new.org_id), '—'), auth.uid());
  end if;
  if new.assignee_id is distinct from old.assignee_id and new.assignee_id is not null then
    insert into public.report_status_history (report_id, event, note, actor)
    values (new.id, 'assigned', coalesce((select full_name from public.profiles where id = new.assignee_id), '—'), auth.uid());
  end if;
  if new.deadline_at is distinct from old.deadline_at and new.deadline_at is not null then
    insert into public.report_status_history (report_id, event, note, actor)
    values (new.id, 'deadline', to_char(new.deadline_at at time zone 'Asia/Tashkent', 'DD.MM.YYYY'), auth.uid());
  end if;
  if coalesce(new.reject_reason, '') <> '' and new.reject_reason is distinct from old.reject_reason then
    insert into public.report_status_history (report_id, event, note, actor) values (new.id, 'rejected', new.reject_reason, auth.uid());
  end if;
  if new.proof_path is distinct from old.proof_path and new.proof_path is not null then
    insert into public.report_status_history (report_id, event, actor) values (new.id, 'proof', auth.uid());
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

-- Arizani boshqa idoraga yo'naltirish (vazirlik xodimi yoki idora rahbari)
create or replace function public.forward_report(p_report uuid, p_org uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_old uuid;
begin
  select org_id into v_old from public.reports where id = p_report;
  if not found then raise exception 'Ariza topilmadi'; end if;
  if not (public.is_staff() or (public.is_org_head() and v_old = public.my_org())) then
    raise exception 'Ruxsat yo‘q';
  end if;
  if not exists (select 1 from public.organizations where id = p_org and active) then
    raise exception 'Tashkilot topilmadi yoki faol emas';
  end if;
  if p_org is not distinct from v_old then raise exception 'Ariza allaqachon shu tashkilotda'; end if;
  if coalesce(btrim(p_reason), '') <> '' then
    insert into public.report_comments (report_id, author, body)
    values (p_report, auth.uid(), 'Yo‘naltirish sababi: ' || left(btrim(p_reason), 3900));
  end if;
  update public.reports set org_id = p_org where id = p_report;
end $$;

revoke all on function public.forward_report(uuid, uuid, text) from public, anon;
grant execute on function public.forward_report(uuid, uuid, text) to authenticated;

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
  using (id = auth.uid() or public.is_staff()
         or (public.is_agent() and (org_id = public.my_org()
             or id in (select r.user_id from public.reports r where r.org_id = public.my_org()))));
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
  using (user_id = auth.uid() or public.can_see_org(org_id));
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (user_id = auth.uid() or public.is_staff());
drop policy if exists reports_update on public.reports;
-- Boshqa idoraga yo'naltirish forward_report() RPC orqali (yo'naltirgandan keyin ariza ko'rinmaydi)
create policy reports_update on public.reports for update to authenticated
  using (user_id = auth.uid() or public.can_see_org(org_id))
  with check (user_id = auth.uid() or public.can_see_org(org_id));
drop policy if exists reports_delete on public.reports;
create policy reports_delete on public.reports for delete to authenticated using (public.is_admin());

-- history (faqat o'qish; yozuvlar triggerlar orqali qo'shiladi)
drop policy if exists history_select on public.report_status_history;
create policy history_select on public.report_status_history for select to authenticated
  using (public.is_staff() or exists (select 1 from public.reports r where r.id = report_id
                                      and (r.user_id = auth.uid() or public.can_see_org(r.org_id))));

-- ichki izohlar: faqat vazirlik va ariza yo'naltirilgan idora xodimlari
alter table public.report_comments    enable row level security;
alter table public.response_templates enable row level security;
drop policy if exists comments_select on public.report_comments;
create policy comments_select on public.report_comments for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id and public.can_see_org(r.org_id)));
drop policy if exists comments_insert on public.report_comments;
create policy comments_insert on public.report_comments for insert to authenticated
  with check (author = auth.uid() and exists (select 1 from public.reports r where r.id = report_id and public.can_see_org(r.org_id)));

-- javob shablonlari: umumiylarini vazirlik, idoraga xoslarini idora rahbari boshqaradi
drop policy if exists templates_select on public.response_templates;
create policy templates_select on public.response_templates for select to authenticated
  using (public.is_staff() or (public.is_agent() and (org_id is null or org_id = public.my_org())));
drop policy if exists templates_write on public.response_templates;
create policy templates_write on public.response_templates for all to authenticated
  using (public.is_admin() or (public.is_org_head() and org_id = public.my_org()))
  with check (public.is_admin() or (public.is_org_head() and org_id = public.my_org()));

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
-- Idora xodimi o'z idorasidagi ariza rasmini ko'radi; bajarilgan ish surati: proof/<report_id>/<fayl>
drop policy if exists "report-media read agents" on storage.objects;
create policy "report-media read agents" on storage.objects for select to authenticated
  using (bucket_id = 'report-media' and exists (select 1 from public.reports r
         where (r.media_path = name or r.proof_path = name)
           and (public.can_see_org(r.org_id) or r.user_id = auth.uid())));
drop policy if exists "report-media proof insert" on storage.objects;
create policy "report-media proof insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'report-media' and (storage.foldername(name))[1] = 'proof'
              and exists (select 1 from public.reports r
                          where r.id::text = (storage.foldername(name))[2] and public.can_see_org(r.org_id)));
drop policy if exists "report-media delete staff" on storage.objects;
create policy "report-media delete staff" on storage.objects for delete to authenticated
  using (bucket_id = 'report-media' and public.is_staff());

-- ---------------------------------------------------------------------
-- 7b. TOZALASH AKSIYALARI: rasmiy e'lonlar va "Qatnashaman"
-- Vazirlik/tashkilotlar portalda e'lon qiladi, fuqarolar ilovada ko'radi
-- va qatnashishini belgilaydi. Ishtirokchilar ro'yxatini fuqarolar
-- ko'rmaydi: faqat soni (event_counts) ochiq.
-- ---------------------------------------------------------------------
create table if not exists public.eco_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 5 and 160),
  description text check (char_length(description) <= 3000),
  type        text not null default 'clean' check (type in ('clean','tree','volunteer','action')),
  region      text,
  place       text check (char_length(place) <= 300),
  lat         double precision check (lat between -90 and 90),
  lng         double precision check (lng between -180 and 180),
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  organizer   text check (char_length(organizer) <= 160),
  contact     text check (char_length(contact) <= 160),
  link        text check (link ~ '^https://' and char_length(link) <= 500),
  max_people  int check (max_people > 0),
  org_id      uuid references public.organizations(id) on delete set null,
  status      text not null default 'published' check (status in ('draft','published','cancelled')),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists eco_events_starts_idx on public.eco_events (starts_at);

create table if not exists public.event_participants (
  event_id   uuid not null references public.eco_events(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create or replace function public.eco_events_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then new.created_by := auth.uid(); new.created_at := now();
  else new.created_by := old.created_by; new.created_at := old.created_at; end if;
  -- tashkilot rahbari faqat o'z tashkiloti nomidan e'lon qiladi
  if not public.is_staff() and public.is_org_head() then
    new.org_id := public.my_org();
  end if;
  return new;
end $$;
drop trigger if exists eco_events_before_write on public.eco_events;
create trigger eco_events_before_write before insert or update on public.eco_events
  for each row execute function public.eco_events_before_write();

-- Qatnashish: faqat e'lon qilingan, hali tugamagan, joyi bor tadbirga;
-- bloklangan foydalanuvchi qatnasha olmaydi.
create or replace function public.can_join_event(p_event uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.eco_events e
    where e.id = p_event and e.status = 'published'
      and coalesce(e.ends_at, e.starts_at + interval '1 day') > now()
      and (e.max_people is null
           or (select count(*) from public.event_participants p where p.event_id = e.id) < e.max_people))
  and not exists (select 1 from public.profiles where id = auth.uid() and blocked);
$$;

create or replace function public.event_counts(p_ids uuid[]) returns table(event_id uuid, going bigint)
language sql stable security definer set search_path = public as $$
  select p.event_id, count(*) from public.event_participants p
  join public.eco_events e on e.id = p.event_id and e.status <> 'draft'
  where p.event_id = any(p_ids) group by p.event_id;
$$;
revoke all on function public.event_counts(uuid[]) from public;
grant execute on function public.event_counts(uuid[]) to anon, authenticated;
revoke all on function public.can_join_event(uuid) from public;
grant execute on function public.can_join_event(uuid) to authenticated;

alter table public.eco_events enable row level security;
alter table public.event_participants enable row level security;

drop policy if exists "eco_events read" on public.eco_events;
create policy "eco_events read" on public.eco_events for select to anon, authenticated
  using (status in ('published','cancelled') or public.is_staff()
         or (public.is_org_head() and org_id = public.my_org()));
drop policy if exists "eco_events insert" on public.eco_events;
create policy "eco_events insert" on public.eco_events for insert to authenticated
  with check (public.is_staff() or public.is_org_head());
drop policy if exists "eco_events update" on public.eco_events;
create policy "eco_events update" on public.eco_events for update to authenticated
  using (public.is_staff() or (public.is_org_head() and org_id = public.my_org()))
  with check (public.is_staff() or (public.is_org_head() and org_id = public.my_org()));
drop policy if exists "eco_events delete" on public.eco_events;
create policy "eco_events delete" on public.eco_events for delete to authenticated
  using (public.is_staff() or (public.is_org_head() and org_id = public.my_org()));

drop policy if exists "event_participants own read" on public.event_participants;
create policy "event_participants own read" on public.event_participants for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "event_participants join" on public.event_participants;
create policy "event_participants join" on public.event_participants for insert to authenticated
  with check (user_id = auth.uid() and public.can_join_event(event_id));
drop policy if exists "event_participants leave" on public.event_participants;
create policy "event_participants leave" on public.event_participants for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 8. REALTIME (ilova va admin panel o'zgarishlarni jonli ko'radi)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['reports','profiles','report_status_history','report_comments','eco_events'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 8b. AI YORDAMCHI: kunlik so'rovlar limiti
-- Savol matnlari bazada SAQLANMAYDI — faqat foydalanuvchi bo'yicha kunlik hisoblagich.
-- ai_consume() faqat ai-chat Edge Function (service_role) tomonidan chaqiriladi.
-- ---------------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default (now() at time zone 'Asia/Tashkent')::date,
  count   int  not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
-- Siyosat yo'q: anon/authenticated foydalanuvchilar jadvalni o'qiy ham, yoza ham olmaydi.

create or replace function public.ai_consume(p_user uuid, p_limit int) returns boolean
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into public.ai_usage(user_id, day, count)
  values (p_user, (now() at time zone 'Asia/Tashkent')::date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into v;
  delete from public.ai_usage where day < (now() at time zone 'Asia/Tashkent')::date - 7;
  return v <= p_limit;
end $$;
revoke all on function public.ai_consume(uuid, int) from public, anon, authenticated;
grant execute on function public.ai_consume(uuid, int) to service_role;

-- ---------------------------------------------------------------------
-- 9. BOSHLANG'ICH MA'LUMOTLAR
-- ---------------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('accepting_reports', 'true'::jsonb),
  ('edit_days',         '5'::jsonb),
  ('daily_limit',       '10'::jsonb),
  ('auto_assign',       'false'::jsonb),
  ('sla_days',          '{"Chiqindi":5,"Havo":3,"Suv":5,"Daraxt":7,"Tuproq":10,"Boshqa":15}'::jsonb),
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
--
-- IDORA XODIMLARINI QO'SHISH:
--   1) Authentication → Users → "Add user" (xodimning ish emaili + parol)
--   2) Portalda "Xodimlar" bo'limida unga idora va rol (rahbar / ijrochi) tanlang,
--      yoki SQL bilan:
--      update public.profiles set role = 'org_head', org_id = '<idora id>', full_name = 'F.I.Sh.'
--      where email = 'rahbar@idora.uz';
-- =====================================================================
