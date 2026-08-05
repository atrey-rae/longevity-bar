# Decisions

- Telefon je autoritativně mapovaný v `phone_identities`; nečistý
  `profiles.phone` nedostává unikátní constraint.
- Čtyřmístný kód ani e-mailový aktivační token se neukládají čitelně.
- Nové telefonní identity používají interní Supabase auth alias. Trigger,
  `ensureProfile` i kontaktní action jej nesmí propsat do `profiles.email`.
- Starý Google a e-mailový OTP login zůstávají jako sekundární recovery/admin
  cesta; hlavní UI začíná telefonem.
- Bez potvrzeného kontaktního e-mailu lze razítka sbírat a prohlížet, ale
  všechny zákaznické i administrátorské reward mutace jsou blokované.
- Po deseti minutách může reward pokus atomicky nárokovat právě jedno nové
  odeslání aktivačního e-mailu.
