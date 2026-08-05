-- READ ONLY: spusť před migrací 005.
with normalized as (
  select id, phone,
    case
      when regexp_replace(phone, '[^0-9+]', '', 'g') ~ '^[0-9]{9}$'
        then '+420' || regexp_replace(phone, '[^0-9]', '', 'g')
      when regexp_replace(phone, '[^0-9+]', '', 'g') ~ '^\+[1-9][0-9]{7,14}$'
        then regexp_replace(phone, '[^0-9+]', '', 'g')
      else null
    end as e164
  from public.profiles where phone is not null
)
select
  'INVALID' as issue,
  phone,
  count(*) as profiles,
  array_agg(id order by id) as user_ids
from normalized
where e164 is null
group by phone
union all
select
  'DUPLICATE' as issue,
  e164 as phone,
  count(*) as profiles,
  array_agg(id order by id) as user_ids
from normalized
where e164 is not null
group by e164
having count(*) > 1
order by issue, phone;
