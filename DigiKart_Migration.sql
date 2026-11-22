-- Digi Kart Digitals Mini Live migration (reviewed draft)
-- Built against DigiKart_Schema_Only.sql supplied on 2026-11-21.
-- Does NOT run automatically. Apply to a BACKUP/TEST project first.
-- No service-role key or credentials are required in the browser.

begin;

-- Helper: a lead remains owned by its original owner. An employee may access
-- another employee's lead only when explicitly assigned a follow-up.
create or replace function public.dk_can_access_lead(p_lead_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.leads l
    where l.id = p_lead_id
      and (
        l.original_lead_owner_id = public.current_employee_id()
        or public.has_permission('leads.manage')
        or public.has_permission('employees.manage')
        or exists (
          select 1 from public.lead_followups f
          where f.lead_id = l.id
            and f.task_assignee_id = public.current_employee_id()
        )
      )
  );
$$;
revoke all on function public.dk_can_access_lead(uuid) from public;
grant execute on function public.dk_can_access_lead(uuid) to authenticated;

-- Atomic Lead creation keeps customer + lead rows together.
create or replace function public.dk_create_lead(
  p_customer_name text,
  p_mobile_number text,
  p_address text,
  p_product_category text,
  p_brand_model text,
  p_requirement_details text,
  p_lead_source text,
  p_expected_purchase_date date,
  p_approximate_budget numeric,
  p_priority text,
  p_employee_remarks text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_id uuid := public.current_employee_id();
  v_customer_id uuid;
  v_lead_id uuid;
  v_lead_code text;
begin
  if v_employee_id is null then raise exception 'Active employee profile is required'; end if;
  if not (
    public.has_permission('leads.view_assigned')
    or public.has_permission('leads.manage')
    or public.has_permission('employees.manage')
  ) then raise exception 'You do not have permission to create a lead'; end if;
  if coalesce(trim(p_customer_name), '') = '' then raise exception 'Customer name is required'; end if;
  if coalesce(trim(p_product_category), '') = '' then raise exception 'Product category is required'; end if;
  if p_lead_source not in ('field_visit','reference','whatsapp','phone_call','outside_lead','other') then
    raise exception 'Invalid lead source';
  end if;
  if p_priority not in ('high','medium','low') then raise exception 'Invalid priority'; end if;
  if p_approximate_budget is not null and p_approximate_budget < 0 then raise exception 'Budget cannot be negative'; end if;

  insert into public.customers(
    full_name, mobile_number, address, assigned_employee_id, created_by, customer_source
  ) values (
    trim(p_customer_name), nullif(trim(p_mobile_number), ''), nullif(trim(p_address), ''),
    v_employee_id, v_employee_id, p_lead_source
  ) returning id into v_customer_id;

  insert into public.leads(
    customer_id, product_category, product_brand_model, requirement_details,
    expected_purchase_date, approximate_budget, lead_source, employee_remarks,
    original_lead_owner_id, created_by, priority, status
  ) values (
    v_customer_id, trim(p_product_category), nullif(trim(p_brand_model), ''),
    nullif(trim(p_requirement_details), ''), p_expected_purchase_date,
    p_approximate_budget, p_lead_source, nullif(trim(p_employee_remarks), ''),
    v_employee_id, v_employee_id, p_priority, 'new'
  ) returning id, lead_code into v_lead_id, v_lead_code;

  return jsonb_build_object('customer_id', v_customer_id, 'lead_id', v_lead_id, 'lead_code', v_lead_code);
end;
$$;
revoke all on function public.dk_create_lead(text,text,text,text,text,text,text,date,numeric,text,text) from public;
grant execute on function public.dk_create_lead(text,text,text,text,text,text,text,date,numeric,text,text) to authenticated;

-- Customer access is owner/assignee scoped. A generic customers.view grant
-- does NOT expose every customer's personal data.
drop policy if exists dk_employee_customer_select on public.customers;
create policy dk_employee_customer_select on public.customers
for select to authenticated
using (
  created_by = public.current_employee_id()
  or assigned_employee_id = public.current_employee_id()
  or public.has_permission('customers.manage')
  or public.has_permission('employees.manage')
  or (public.has_permission('installation.manage') and exists (select 1 from public.installation_tasks it where it.customer_id = customers.id))
);
drop policy if exists dk_employee_customer_insert on public.customers;
create policy dk_employee_customer_insert on public.customers
for insert to authenticated
with check (
  created_by = public.current_employee_id()
  and assigned_employee_id = public.current_employee_id()
);
drop policy if exists dk_employee_customer_update on public.customers;
create policy dk_employee_customer_update on public.customers
for update to authenticated
using (
  created_by = public.current_employee_id()
  or assigned_employee_id = public.current_employee_id()
  or public.has_permission('customers.manage')
  or public.has_permission('employees.manage')
)
with check (
  created_by = public.current_employee_id()
  or assigned_employee_id = public.current_employee_id()
  or public.has_permission('customers.manage')
  or public.has_permission('employees.manage')
);

-- Leads: original owner retains ownership. Assistants get access only via an
-- explicitly assigned follow-up. Employee cannot change original owner.
drop policy if exists dk_employee_lead_select on public.leads;
create policy dk_employee_lead_select on public.leads
for select to authenticated using (public.dk_can_access_lead(id));
drop policy if exists dk_employee_lead_insert on public.leads;
create policy dk_employee_lead_insert on public.leads
for insert to authenticated
with check (
  original_lead_owner_id = public.current_employee_id()
  and created_by = public.current_employee_id()
  and exists (
    select 1 from public.customers c
    where c.id = customer_id
      and c.created_by = public.current_employee_id()
      and c.assigned_employee_id = public.current_employee_id()
  )
);
drop policy if exists dk_employee_lead_update on public.leads;
create policy dk_employee_lead_update on public.leads
for update to authenticated
using (
  original_lead_owner_id = public.current_employee_id()
  or public.has_permission('leads.manage')
  or public.has_permission('employees.manage')
)
with check (
  original_lead_owner_id = public.current_employee_id()
  or public.has_permission('leads.manage')
  or public.has_permission('employees.manage')
);

-- Follow-ups: lead owner or assigned helper may read; only creator may create
-- their own assigned follow-up. The original owner remains unchanged.
drop policy if exists dk_employee_followup_select on public.lead_followups;
create policy dk_employee_followup_select on public.lead_followups
for select to authenticated
using (
  public.dk_can_access_lead(lead_id)
  or public.has_permission('employees.manage')
);
drop policy if exists dk_employee_followup_insert on public.lead_followups;
create policy dk_employee_followup_insert on public.lead_followups
for insert to authenticated
with check (
  created_by = public.current_employee_id()
  and (task_assignee_id is null or task_assignee_id = public.current_employee_id())
  and public.dk_can_access_lead(lead_id)
);
drop policy if exists dk_employee_followup_update on public.lead_followups;
create policy dk_employee_followup_update on public.lead_followups
for update to authenticated
using (
  task_assignee_id = public.current_employee_id()
  or public.has_permission('leads.manage')
  or public.has_permission('employees.manage')
)
with check (
  task_assignee_id = public.current_employee_id()
  or public.has_permission('leads.manage')
  or public.has_permission('employees.manage')
);

-- Transactional sale entry: sale + item + service/installation details are
-- committed together, preventing half-saved sales from separate browser calls.
create or replace function public.dk_create_sale(
  p_lead_id uuid,
  p_product_category text,
  p_product_name text,
  p_brand text default null,
  p_model text default null,
  p_quantity integer default 1,
  p_unit_price numeric default 0,
  p_service_call_required boolean default false,
  p_installation_required boolean default false,
  p_serial_number text default null,
  p_order_reference text default null,
  p_customer_contact_number text default null,
  p_installation_address text default null,
  p_remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_id uuid := public.current_employee_id();
  v_customer_id uuid;
  v_sale_id uuid;
  v_sale_code text;
  v_sale_item_id uuid;
  v_task_install boolean := false;
  v_task_service boolean := false;
  v_incentive boolean := false;
begin
  if v_employee_id is null then
    raise exception 'Active employee profile is required';
  end if;
  if not (
    public.has_permission('sales.create_closing')
    or public.has_permission('sales.manage')
    or public.has_permission('employees.manage')
  ) then
    raise exception 'You do not have permission to create a sale';
  end if;
  if p_lead_id is null or not public.dk_can_access_lead(p_lead_id) then
    raise exception 'Selected lead is not assigned to you or accessible';
  end if;
  if coalesce(trim(p_product_category), '') = '' or coalesce(trim(p_product_name), '') = '' then
    raise exception 'Product category and product name are required';
  end if;
  if coalesce(p_quantity, 0) < 1 or coalesce(p_unit_price, -1) < 0 then
    raise exception 'Quantity and unit price are invalid';
  end if;
  if p_installation_required and (
    coalesce(trim(p_customer_contact_number), '') = ''
    or coalesce(trim(p_installation_address), '') = ''
  ) then
    raise exception 'Installation address and customer contact are required';
  end if;

  select l.customer_id into v_customer_id
  from public.leads l where l.id = p_lead_id;
  if v_customer_id is null then raise exception 'Lead customer was not found'; end if;

  insert into public.sales(customer_id, lead_id, sale_date, sale_closer_id, entered_by, status, remarks)
  values (v_customer_id, p_lead_id, current_date, v_employee_id, v_employee_id, 'completed', nullif(trim(p_remarks), ''))
  returning id, sale_code into v_sale_id, v_sale_code;

  insert into public.sale_items(
    sale_id, product_category, product_name, brand, model, quantity, unit_price,
    service_call_required, installation_required
  ) values (
    v_sale_id, trim(p_product_category), trim(p_product_name), nullif(trim(p_brand), ''),
    nullif(trim(p_model), ''), p_quantity, p_unit_price,
    coalesce(p_service_call_required, false), coalesce(p_installation_required, false)
  ) returning id into v_sale_item_id;

  if p_service_call_required then
    insert into public.sale_service_details(
      sale_item_id, serial_number, order_reference, purchase_date,
      customer_contact_number, remarks
    ) values (
      v_sale_item_id, nullif(trim(p_serial_number), ''), nullif(trim(p_order_reference), ''),
      current_date, nullif(trim(p_customer_contact_number), ''), nullif(trim(p_remarks), '')
    );
  end if;

  if p_installation_required then
    insert into public.sale_installation_details(
      sale_item_id, serial_number, order_reference, purchase_date,
      installation_address, customer_contact_number, remarks
    ) values (
      v_sale_item_id, nullif(trim(p_serial_number), ''), nullif(trim(p_order_reference), ''),
      current_date, trim(p_installation_address), trim(p_customer_contact_number), nullif(trim(p_remarks), '')
    );
  end if;

  select exists(select 1 from public.installation_tasks t where t.sale_item_id = v_sale_item_id) into v_task_install;
  select exists(select 1 from public.service_tasks t where t.sale_item_id = v_sale_item_id) into v_task_service;
  select exists(select 1 from public.incentive_records ir where ir.sale_item_id = v_sale_item_id) into v_incentive;

  return jsonb_build_object(
    'sale_id', v_sale_id,
    'sale_code', v_sale_code,
    'sale_item_id', v_sale_item_id,
    'installation_task_created', v_task_install,
    'service_task_created', v_task_service,
    'incentive_created', v_incentive
  );
end;
$$;
revoke all on function public.dk_create_sale(uuid,text,text,text,text,integer,numeric,boolean,boolean,text,text,text,text,text) from public;
grant execute on function public.dk_create_sale(uuid,text,text,text,text,integer,numeric,boolean,boolean,text,text,text,text,text) to authenticated;

-- On sale item insert, create service/install tasks and snapshot the product
-- incentive rate. For lead-originated sales, allocate 70% to original lead owner
-- and 30% to sale closer; approval remains pending. No rate means no incentive
-- record. Direct walk-in incentive logic is intentionally not inferred here.
create or replace function public.dk_after_sale_item_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_lead_id uuid;
  v_closer_id uuid;
  v_owner_id uuid;
  v_sale_date date;
  v_rate_id uuid;
  v_rate_amount numeric(12,2);
  v_total numeric(12,2);
  v_record_id uuid;
begin
  select s.customer_id, s.lead_id, s.sale_closer_id, s.sale_date
    into v_customer_id, v_lead_id, v_closer_id, v_sale_date
  from public.sales s where s.id = new.sale_id;

  if new.service_call_required then
    insert into public.service_tasks(sale_item_id, customer_id)
    values (new.id, v_customer_id)
    on conflict (sale_item_id) do nothing;
  end if;
  if new.installation_required then
    insert into public.installation_tasks(sale_item_id, customer_id)
    values (new.id, v_customer_id)
    on conflict (sale_item_id) do nothing;
  end if;

  if v_lead_id is not null then
    select l.original_lead_owner_id into v_owner_id
    from public.leads l where l.id = v_lead_id;

    select r.id, r.incentive_amount into v_rate_id, v_rate_amount
    from public.product_incentive_rates r
    where r.product_category = new.product_category
      and (r.product_name is null or lower(r.product_name) = lower(new.product_name))
      and r.effective_from <= v_sale_date
      and (r.effective_to is null or r.effective_to >= v_sale_date)
    order by (r.product_name is not null) desc, r.effective_from desc
    limit 1;

    if v_rate_id is not null and v_owner_id is not null then
      v_total := round(v_rate_amount * new.quantity, 2);
      insert into public.incentive_records(
        sale_item_id, rate_id, incentive_base, total_incentive,
        lead_owner_id, sale_closer_id, calculation_status, payment_status
      ) values (
        new.id, v_rate_id, new.line_amount, v_total,
        v_owner_id, v_closer_id, 'pending_approval', 'pending'
      ) returning id into v_record_id;

      insert into public.incentive_allocations(
        incentive_record_id, employee_id, allocation_type, percentage, amount
      ) values
        (v_record_id, v_owner_id, 'lead_owner', 70.00, round(v_total * 0.70, 2)),
        (v_record_id, v_closer_id, 'sale_closer', 30.00, v_total - round(v_total * 0.70, 2));
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.dk_after_sale_item_insert() from public;
drop trigger if exists dk_after_sale_item_insert on public.sale_items;
create trigger dk_after_sale_item_insert
after insert on public.sale_items
for each row execute function public.dk_after_sale_item_insert();

-- Employee read access to sales and child records is scoped to the closer or
-- original lead owner / assigned helper. Admin permissions remain available.
drop policy if exists dk_employee_sales_select on public.sales;
create policy dk_employee_sales_select on public.sales
for select to authenticated
using (
  sale_closer_id = public.current_employee_id()
  or (lead_id is not null and public.dk_can_access_lead(lead_id))
  or public.has_permission('sales.manage')
  or public.has_permission('employees.manage')
);
drop policy if exists dk_employee_sale_items_select on public.sale_items;
create policy dk_employee_sale_items_select on public.sale_items
for select to authenticated
using (exists (
  select 1 from public.sales s where s.id = sale_id
    and (s.sale_closer_id = public.current_employee_id()
      or (s.lead_id is not null and public.dk_can_access_lead(s.lead_id))
      or public.has_permission('sales.manage')
      or public.has_permission('employees.manage')
      or (public.has_permission('installation.manage') and exists (select 1 from public.installation_tasks it where it.sale_item_id = sale_items.id)))
));
drop policy if exists dk_employee_sale_service_details_select on public.sale_service_details;
create policy dk_employee_sale_service_details_select on public.sale_service_details
for select to authenticated
using (exists (
  select 1 from public.sale_items si join public.sales s on s.id = si.sale_id
  where si.id = sale_item_id
    and (s.sale_closer_id = public.current_employee_id()
      or (s.lead_id is not null and public.dk_can_access_lead(s.lead_id))
      or public.has_permission('sales.manage')
      or public.has_permission('employees.manage')
      or (public.has_permission('installation.manage') and exists (select 1 from public.installation_tasks it where it.sale_item_id = si.id)))
));
drop policy if exists dk_employee_sale_installation_details_select on public.sale_installation_details;
create policy dk_employee_sale_installation_details_select on public.sale_installation_details
for select to authenticated
using (exists (
  select 1 from public.sale_items si join public.sales s on s.id = si.sale_id
  where si.id = sale_item_id
    and (s.sale_closer_id = public.current_employee_id()
      or (s.lead_id is not null and public.dk_can_access_lead(s.lead_id))
      or public.has_permission('sales.manage')
      or public.has_permission('employees.manage')
      or (public.has_permission('installation.manage') and exists (select 1 from public.installation_tasks it where it.sale_item_id = si.id)))
));

-- Authorized installation/service employees can see their task queues. A claim is
-- serialized in SQL so two employees cannot claim the same pending installation.
drop policy if exists dk_employee_installation_tasks_select on public.installation_tasks;
create policy dk_employee_installation_tasks_select on public.installation_tasks
for select to authenticated
using (public.has_permission('installation.manage') or public.has_permission('employees.manage'));
drop policy if exists dk_employee_installation_assignments_select on public.installation_assignments;
create policy dk_employee_installation_assignments_select on public.installation_assignments
for select to authenticated
using (public.has_permission('installation.manage') or public.has_permission('employees.manage'));
drop policy if exists dk_employee_installation_history_select on public.installation_history;
create policy dk_employee_installation_history_select on public.installation_history
for select to authenticated
using (public.has_permission('installation.manage') or public.has_permission('employees.manage'));
drop policy if exists dk_employee_service_tasks_select on public.service_tasks;
create policy dk_employee_service_tasks_select on public.service_tasks
for select to authenticated
using (public.has_permission('service.manage') or public.has_permission('employees.manage'));

create or replace function public.dk_claim_installation_task(p_task_id uuid, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_id uuid := public.current_employee_id();
  v_task public.installation_tasks%rowtype;
begin
  if v_employee_id is null then raise exception 'Active employee profile is required'; end if;
  if not (public.has_permission('installation.manage') or public.has_permission('employees.manage')) then
    raise exception 'You do not have permission to claim installation tasks';
  end if;
  select * into v_task from public.installation_tasks where id = p_task_id for update;
  if not found then raise exception 'Installation task not found'; end if;
  if v_task.status = 'in_progress' and v_task.current_assignee_id = v_employee_id then
    return jsonb_build_object('task_id', p_task_id, 'status', 'in_progress', 'already_claimed', true);
  end if;
  if v_task.status <> 'pending' then raise exception 'Task is not pending'; end if;

  update public.installation_tasks
    set status = 'in_progress', current_assignee_id = v_employee_id
    where id = p_task_id;
  insert into public.installation_assignments(task_id, employee_id, claimed_at, notes)
    values (p_task_id, v_employee_id, now(), nullif(trim(p_notes), ''));
  insert into public.installation_history(task_id, action, details, performed_by)
    values (p_task_id, 'claimed', nullif(trim(p_notes), ''), v_employee_id);
  return jsonb_build_object('task_id', p_task_id, 'status', 'in_progress', 'claimed_by', v_employee_id);
end;
$$;
revoke all on function public.dk_claim_installation_task(uuid,text) from public;
grant execute on function public.dk_claim_installation_task(uuid,text) to authenticated;

-- Incentive amounts are readable only by their allocated employee or admin.
drop policy if exists dk_employee_incentive_allocations_select on public.incentive_allocations;
create policy dk_employee_incentive_allocations_select on public.incentive_allocations
for select to authenticated
using (employee_id = public.current_employee_id() or public.has_permission('employees.manage'));
drop policy if exists dk_employee_incentive_records_select on public.incentive_records;
create policy dk_employee_incentive_records_select on public.incentive_records
for select to authenticated
using (
  public.has_permission('employees.manage')
  or exists (
    select 1 from public.incentive_allocations ia
    where ia.incentive_record_id = id and ia.employee_id = public.current_employee_id()
  )
);

-- Grant SQL privileges; RLS still limits row access. RPC performs sale writes.
grant select, insert, update on public.customers to authenticated;
grant select, insert, update on public.leads to authenticated;
grant select, insert, update on public.lead_followups to authenticated;
grant select on public.sales, public.sale_items, public.sale_service_details, public.sale_installation_details to authenticated;
grant select on public.incentive_records, public.incentive_allocations to authenticated;
grant select on public.installation_tasks, public.installation_assignments, public.installation_history, public.service_tasks to authenticated;

commit;

-- IMPORTANT:
-- 1) Apply to a restored TEST database first, never directly to production initially.
-- 2) This migration is additive and retains existing policies. PostgreSQL permissive
--    policies combine with OR; review every existing policy before production rollout.
-- 3) The existing has_permission() implementation does not enforce explicit DENY
--    precedence for employee_permissions. This migration does not rewrite it globally.
-- 4) Product incentive rates must already be configured by Admin with correct category,
--    product name (optional), amount, and effective dates. Incentives remain pending approval.
-- 5) Direct walk-in incentive policy is not automated by this migration.
