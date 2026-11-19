-- v2.7: konum, ziyaret, müşteriye özel fiyat, araç stoğu
alter table public.parties add column if not exists lat double precision, add column if not exists lng double precision;

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  date timestamptz not null default now(),
  result text not null default 'ziyaret' check (result in ('ziyaret','gidilemedi')),
  note text,
  created_by text default (auth.jwt() ->> 'email')
);
create index if not exists visits_party_idx on public.visits (party_id, date);

create table if not exists public.party_prices (
  party_id uuid not null references public.parties(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(14,2) not null,
  base numeric(14,2),
  updated_at timestamptz not null default now(),
  primary key (party_id, product_id)
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.vehicle_stock (
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  qty numeric(14,3) not null default 0,
  primary key (vehicle_id, product_id)
);
create table if not exists public.vehicle_moves (
  id bigint generated always as identity primary key,
  group_id uuid,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  date timestamptz not null default now(),
  type text not null check (type in ('yukleme','bosaltma','satis','satis_iade','iptal','sayim')),
  qty numeric(14,3) not null,
  balance numeric(14,3),
  document_id uuid references public.documents(id) on delete set null,
  note text,
  created_by text default (auth.jwt() ->> 'email')
);
create index if not exists vehicle_moves_grp_idx on public.vehicle_moves (group_id);
create index if not exists vehicle_moves_veh_idx on public.vehicle_moves (vehicle_id, date);

alter table public.documents add column if not exists vehicle_id uuid references public.vehicles(id) on delete set null;

do $$ declare t text; begin
  foreach t in array array['visits','party_prices','vehicles','vehicle_stock','vehicle_moves'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_member', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_member()) with check (public.is_member())', t||'_member', t);
  end loop;
end $$;

alter table public.stock_moves drop constraint if exists stock_moves_type_check;
alter table public.stock_moves add constraint stock_moves_type_check check (type in ('satis','alis','satis_iade','alis_iade','sayim','fire','giris','cikis','acilis','iptal','arac_sayim'));

-- son temas: ledger hareketi veya ziyaret
create or replace view public.party_balances with (security_invoker = true) as
  select p.id,
    coalesce((select sum(l.debit) - sum(l.credit) from public.ledger l where l.party_id = p.id), 0) as balance,
    greatest((select max(l.date) from public.ledger l where l.party_id = p.id), (select max(v.date) from public.visits v where v.party_id = p.id)) as last_move,
    (select max(v.date) from public.visits v where v.party_id = p.id) as last_visit
  from public.parties p;

create or replace function public._vstock(p_veh uuid, p_product uuid, p_qty numeric, p_type text, p_group uuid, p_doc uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare b numeric;
begin
  insert into vehicle_stock(vehicle_id, product_id, qty) values (p_veh, p_product, p_qty)
  on conflict (vehicle_id, product_id) do update set qty = vehicle_stock.qty + excluded.qty
  returning qty into b;
  insert into vehicle_moves(group_id, vehicle_id, product_id, type, qty, balance, document_id, note)
  values (p_group, p_veh, p_product, p_type, p_qty, b, p_doc, p_note);
end $$;
revoke execute on function public._vstock(uuid, uuid, numeric, text, uuid, uuid, text) from public, anon, authenticated;

-- yükleme / boşaltma (toplam stok değişmez)
create or replace function public.vehicle_transfer(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_gid uuid := coalesce((p->>'id')::uuid, gen_random_uuid()); v_veh uuid := (p->>'vehicle_id')::uuid; v_type text := p->>'type'; l jsonb; q numeric; n int := 0;
begin
  if not public.is_member() then raise exception 'Yetkisiz'; end if;
  if exists (select 1 from vehicle_moves where group_id = v_gid) then return jsonb_build_object('id', v_gid, 'duplicate', true); end if;
  if v_type not in ('yukleme','bosaltma') then raise exception 'Geçersiz işlem'; end if;
  if not exists (select 1 from vehicles where id = v_veh) then raise exception 'Araç bulunamadı'; end if;
  for l in select * from jsonb_array_elements(p->'lines') loop
    q := abs((l->>'qty')::numeric);
    if q > 0 then
      perform _vstock(v_veh, (l->>'product_id')::uuid, case when v_type = 'yukleme' then q else -q end, v_type, v_gid, null, nullif(p->>'note',''));
      n := n + 1;
    end if;
  end loop;
  return jsonb_build_object('id', v_gid, 'lines', n);
end $$;

-- akşam araç sayımı: araçtaki miktarı sayılana eşitler, farkı toplam stoğa da yansıtır
create or replace function public.vehicle_count(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_gid uuid := coalesce((p->>'id')::uuid, gen_random_uuid()); v_veh uuid := (p->>'vehicle_id')::uuid; l jsonb; cur numeric; d numeric; v_pid uuid; diffs jsonb := '[]'::jsonb; vname text;
begin
  if not public.is_member() then raise exception 'Yetkisiz'; end if;
  if exists (select 1 from vehicle_moves where group_id = v_gid) then return jsonb_build_object('id', v_gid, 'duplicate', true); end if;
  select name into vname from vehicles where id = v_veh;
  if vname is null then raise exception 'Araç bulunamadı'; end if;
  for l in select * from jsonb_array_elements(p->'lines') loop
    v_pid := (l->>'product_id')::uuid;
    select qty into cur from vehicle_stock where vehicle_id = v_veh and product_id = v_pid;
    d := (l->>'qty')::numeric - coalesce(cur, 0);
    if d <> 0 then
      perform _vstock(v_veh, v_pid, d, 'sayim', v_gid, null, 'Araç sayımı');
      perform _stock(v_pid, d, 'arac_sayim', null, vname || ' sayım farkı', now());
      diffs := diffs || jsonb_build_object('product_id', v_pid, 'diff', d);
    end if;
  end loop;
  return jsonb_build_object('id', v_gid, 'diffs', diffs);
end $$;

create or replace function public.save_document(p_doc jsonb, p_lines jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_id uuid := coalesce((p_doc->>'id')::uuid, gen_random_uuid());
  v_type text := p_doc->>'type';
  v_kind text := coalesce(p_doc->>'doc_kind','fis');
  v_date timestamptz := coalesce((p_doc->>'date')::timestamptz, now());
  v_party uuid := nullif(p_doc->>'party_id','')::uuid;
  v_pay text := coalesce(p_doc->>'pay_method','nakit');
  v_acc uuid := nullif(p_doc->>'account_id','')::uuid;
  v_veh uuid := nullif(p_doc->>'vehicle_id','')::uuid;
  v_disc numeric := coalesce((p_doc->>'discount')::numeric, 0);
  v_gross numeric := 0; v_total numeric; v_vat numeric := 0; v_paid numeric; v_credit numeric;
  v_no text := nullif(p_doc->>'no','');
  v_party_snap jsonb;
  v_sign int;
  v_line jsonb; v_i int := 0; v_cost numeric; v_lt numeric; v_ratio numeric;
  v_cm uuid; s jsonb;
begin
  if not public.is_member() then raise exception 'Yetkisiz'; end if;
  if exists (select 1 from documents where id = v_id) then
    return (select jsonb_build_object('id', id, 'no', no, 'duplicate', true) from documents where id = v_id);
  end if;
  if v_type not in ('satis','alis','satis_iade','alis_iade') then raise exception 'Geçersiz belge tipi'; end if;
  if v_type not in ('satis','satis_iade') then v_veh := null; end if;
  if v_veh is not null and not exists (select 1 from vehicles where id = v_veh) then v_veh := null; end if;
  v_sign := case v_type when 'satis' then -1 when 'alis_iade' then -1 else 1 end;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_gross := v_gross + round((v_line->>'qty')::numeric * (v_line->>'price')::numeric, 2);
  end loop;
  v_disc := least(v_disc, v_gross);
  v_total := v_gross - v_disc;
  v_ratio := case when v_gross > 0 then v_total / v_gross else 1 end;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_lt := round((v_line->>'qty')::numeric * (v_line->>'price')::numeric, 2) * v_ratio;
    v_vat := v_vat + (v_lt - v_lt / (1 + coalesce((v_line->>'vat')::numeric,0)/100));
  end loop;
  v_vat := round(v_vat, 2);

  if v_pay = 'veresiye' then
    if v_party is null then raise exception 'Veresiye için cari seçilmeli'; end if;
    v_paid := least(greatest(coalesce((p_doc->>'paid')::numeric, 0), 0), v_total);
  else
    v_paid := v_total;
  end if;
  v_credit := v_total - v_paid;

  if v_acc is null and v_paid > 0 then
    select id into v_acc from accounts where active and type = case v_pay when 'kart' then 'pos' when 'havale' then 'banka' else 'kasa' end order by sort limit 1;
    if v_acc is null then select id into v_acc from accounts where active order by sort limit 1; end if;
  end if;

  s := (select data from settings where id = 1);
  if v_no is null then
    v_no := case
      when v_kind = 'earsiv' then next_doc_no('earsiv', upper(left(coalesce(nullif(s->>'serEarsiv',''),'EAR'),3)))
      when v_kind = 'efatura' then next_doc_no('efatura', upper(left(coalesce(nullif(s->>'serEfatura',''),'EFT'),3)))
      when v_type = 'satis' then next_doc_no('fis', 'F', 6)
      when v_type = 'satis_iade' then next_doc_no('satis_iade', 'SI', 6)
      when v_type = 'alis' then next_doc_no('alis', 'A', 6)
      else next_doc_no('alis_iade', 'AI', 6) end;
  end if;

  if v_party is not null then
    select to_jsonb(p) - 'created_at' - 'updated_at' into v_party_snap from parties p where id = v_party;
  end if;

  insert into documents(id, type, doc_kind, no, date, party_id, party, price_mode, gross, discount, vat_total, total, paid, credit,
                        pay_method, account_id, due_date, ettn, e_status, supplier_doc_no, ref_doc_id, note, vehicle_id)
  values (v_id, v_type, v_kind, v_no, v_date, v_party, v_party_snap, coalesce(p_doc->>'price_mode','perakende'),
          v_gross, v_disc, v_vat, v_total, v_paid, v_credit, v_pay, v_acc, nullif(p_doc->>'due_date','')::date,
          case when v_kind in ('earsiv','efatura') then coalesce(nullif(p_doc->>'ettn','')::uuid, gen_random_uuid()) end,
          case when v_kind in ('earsiv','efatura') then 'taslak' end,
          nullif(p_doc->>'supplier_doc_no',''), nullif(p_doc->>'ref_doc_id','')::uuid, nullif(p_doc->>'note',''), v_veh);

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_i := v_i + 1;
    v_cost := null;
    select cost into v_cost from products where id = nullif(v_line->>'product_id','')::uuid;
    if v_type = 'alis' then v_cost := (v_line->>'price')::numeric; end if;
    insert into document_lines(document_id, product_id, name, barcode, unit, qty, price, vat, line_total, cost, sort)
    values (v_id, nullif(v_line->>'product_id','')::uuid, v_line->>'name', v_line->>'barcode', v_line->>'unit',
            (v_line->>'qty')::numeric, (v_line->>'price')::numeric, coalesce((v_line->>'vat')::int, 20),
            round((v_line->>'qty')::numeric * (v_line->>'price')::numeric, 2), coalesce(v_cost, 0), v_i);
    if nullif(v_line->>'product_id','') is not null then
      perform _stock((v_line->>'product_id')::uuid, v_sign * (v_line->>'qty')::numeric, v_type, v_id, v_no, v_date);
      if v_veh is not null then
        perform _vstock(v_veh, (v_line->>'product_id')::uuid, v_sign * (v_line->>'qty')::numeric, v_type, null, v_id, v_no);
      end if;
      if v_type = 'alis' and coalesce((p_doc->>'update_cost')::boolean, true) then
        update products set cost = (v_line->>'price')::numeric where id = (v_line->>'product_id')::uuid;
      end if;
    end if;
  end loop;

  if v_party is not null then
    if v_type in ('satis','alis_iade') then
      insert into ledger(party_id, date, debit, kind, document_id, due_date, note) values (v_party, v_date, v_total, v_type, v_id, nullif(p_doc->>'due_date','')::date, v_no);
    else
      insert into ledger(party_id, date, credit, kind, document_id, due_date, note) values (v_party, v_date, v_total, v_type, v_id, nullif(p_doc->>'due_date','')::date, v_no);
    end if;
    -- müşteriye özel son fiyat
    if v_type = 'satis' then
      insert into party_prices(party_id, product_id, price, base, updated_at)
      select v_party, (x->>'product_id')::uuid, (x->>'price')::numeric, pr.retail, now()
      from jsonb_array_elements(p_lines) x join products pr on pr.id = nullif(x->>'product_id','')::uuid
      on conflict (party_id, product_id) do update set price = excluded.price, base = excluded.base, updated_at = now();
    end if;
  end if;

  if v_paid > 0 then
    insert into cash_moves(date, account_id, amount, kind, party_id, document_id, note)
    values (v_date, v_acc, case when v_type in ('satis','alis_iade') then v_paid else -v_paid end,
            case when v_type = 'satis' then 'satis' when v_type = 'alis' then 'alis' else 'iade' end, v_party, v_id, v_no)
    returning id into v_cm;
    if v_party is not null then
      if v_type in ('satis','alis_iade') then
        insert into ledger(party_id, date, credit, kind, document_id, cash_move_id, note) values (v_party, v_date, v_paid, 'odeme_alindi', v_id, v_cm, v_no || ' peşin');
      else
        insert into ledger(party_id, date, debit, kind, document_id, cash_move_id, note) values (v_party, v_date, v_paid, 'odeme_yapildi', v_id, v_cm, v_no || ' peşin');
      end if;
    end if;
  end if;

  return jsonb_build_object('id', v_id, 'no', v_no, 'total', v_total, 'paid', v_paid, 'credit', v_credit);
end $function$;

create or replace function public.cancel_document(p_id uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare d documents; l document_lines; v_sign int;
begin
  if not public.is_member() then raise exception 'Yetkisiz'; end if;
  select * into d from documents where id = p_id for update;
  if not found then raise exception 'Belge bulunamadı'; end if;
  if d.status = 'iptal' then return; end if;
  v_sign := case d.type when 'satis' then 1 when 'alis_iade' then 1 else -1 end;
  for l in select * from document_lines where document_id = p_id loop
    if l.product_id is not null then
      perform _stock(l.product_id, v_sign * l.qty, 'iptal', p_id, d.no || ' iptal', now());
      if d.vehicle_id is not null then perform _vstock(d.vehicle_id, l.product_id, v_sign * l.qty, 'iptal', null, p_id, d.no || ' iptal'); end if;
    end if;
  end loop;
  delete from ledger where document_id = p_id;
  delete from cash_moves where document_id = p_id;
  update documents set status = 'iptal' where id = p_id;
end $function$;

revoke execute on function public.vehicle_transfer(jsonb), public.vehicle_count(jsonb) from public, anon;
grant execute on function public.vehicle_transfer(jsonb), public.vehicle_count(jsonb) to authenticated;
