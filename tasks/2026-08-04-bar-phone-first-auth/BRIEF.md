# Bar.app — phone-first loyalty auth

Primární přihlášení zákazníka je české telefonní číslo a čtyřmístný SMS kód.
Po přihlášení se vyžádá reálný e-mail a jeho potvrzení; bez potvrzení lze sbírat
a prohlížet razítka, ale nelze vybrat ani vydat odměnu.

Implementace nesmí přepsat staré identity, ukládat PIN v čitelné podobě ani
propsat interní přihlašovací alias do `profiles.email`.
