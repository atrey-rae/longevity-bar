#!/usr/bin/env python3
"""Zrcadlo přihlášených z Bar.app do Google Sheetu (zadal Atrey 5. 8. 2026).

Čte interní report endpoint Bar.app (service data ze Supabase), doplní stav
kreditu hostů z Healing D1 a přepíše list „Přihlášení" v cílovém Sheetu.

Spouštění:
  BAR_REPORT_SECRET=... SSL_CERT_FILE=/etc/ssl/cert.pem \
  .../workspace-assistant/.venv/bin/python scripts/sync_bar_users_report.py

Secret = HEALING_BRIDGE_SECRET (Cloudflare/Vercel); nikdy ho nedávej do repa.
"""
import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone, timedelta

from google.oauth2 import service_account
from googleapiclient.discovery import build

REPORT_URL = "https://bar.peaceandcoco.com/api/internal/report/users"
SHEET_ID = "115Rmz0yNIwK8v1cmm2i-TwPh7teKTcGkzxMMTHgsrrM"
TAB = "Přihlášení"
KEY = "/Users/atrey/Documents/Coding.AI/workspace-assistant/service-account.json"
SUBJECT = "atrey@wildandcoco.com"
HEALING_DIR = "/Users/atrey/Documents/Coding.AI/healing-festival-bar"
PRAHA = timezone(timedelta(hours=2))


def cas(iso):
    if not iso:
        return ""
    try:
        return (datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
                .astimezone(PRAHA).strftime("%d.%m. %H:%M"))
    except ValueError:
        return str(iso)


def hostovske_kredity():
    """host telefon → 'utraceno X / kredit Y Kč' z Healing D1."""
    try:
        out = subprocess.run(
            ["npx", "--no-install", "wrangler", "d1", "execute", "wc-festival-bar-orders",
             "--remote", "--json", "--command",
             "SELECT u.phone, COALESCE(SUM(o.total),0) AS spent FROM users u "
             "LEFT JOIN stravenky_orders o ON o.phone = u.phone "
             "WHERE u.role = 'host' GROUP BY u.phone"],
            capture_output=True, text=True, cwd=HEALING_DIR, timeout=180)
        rows = json.loads(out.stdout)[0]["results"]
    except Exception as e:  # noqa: BLE001 — report nesmí spadnout na D1 výpadku
        print(f"⚠️ D1 kredity nedostupné: {e}", file=sys.stderr)
        return {}
    # Výše kreditu drží stravenky.mjs; tady jen zrcadlíme útratu.
    limity = {"+420724890016": 500, "+420603266535": 250}
    return {r["phone"]: f"utraceno {int(r['spent'])} / {limity.get(r['phone'], 500)} Kč"
            for r in rows}


def main():
    secret = os.environ.get("BAR_REPORT_SECRET", "")
    if not secret:
        sys.exit("Chybí BAR_REPORT_SECRET (= HEALING_BRIDGE_SECRET).")

    req = urllib.request.Request(REPORT_URL, headers={
        "Authorization": f"Bearer {secret}",
        # CF WAF blokuje výchozí Python UA (403) — viz festival memory 5. 8.
        "User-Agent": "curl/8.6.0",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        lide = json.load(r)

    kredity = hostovske_kredity()
    ted = datetime.now(PRAHA).strftime("%d. %m. %Y %H:%M")
    values = [
        ["PŘIHLÁŠENÍ ZÁKAZNÍCI — bar.peaceandcoco.com"],
        [f"Aktualizováno {ted} · zdroj: Supabase (auth+profily+kvízy+věrnost) + Healing D1 (kredity)"],
        [],
        ["Signup", "Jméno", "Telefon", "E-mail", "Kvízy hotové", "Razítka",
         "Odměny (dostupné/vydané)", "Poslední použití", "Kredit", "Rozdaná QR (leady)", "Referral kód"],
    ]
    for l in lide:
        odmeny = l.get("odmeny") or {}
        values.append([
            cas(l.get("signup")), l.get("jmeno") or "", l.get("telefon") or "",
            l.get("email") or "", ", ".join(l.get("kvizy") or []) or "—",
            l.get("razitka") or 0,
            f"{odmeny.get('dostupne', 0)}/{odmeny.get('vydane', 0)}",
            cas(l.get("posledni")), kredity.get(l.get("telefon") or "", "—"),
            l.get("rozdane") or 0, l.get("referral_code") or "—",
        ])

    creds = service_account.Credentials.from_service_account_file(
        KEY, scopes=["https://www.googleapis.com/auth/drive"], subject=SUBJECT)
    sheets = build("sheets", "v4", credentials=creds)
    meta = sheets.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
    first = meta["sheets"][0]["properties"]
    reqs = []
    if first["title"] != TAB:
        reqs.append({"updateSheetProperties": {
            "properties": {"sheetId": first["sheetId"], "title": TAB}, "fields": "title"}})
    reqs += [
        {"repeatCell": {"range": {"sheetId": first["sheetId"], "startRowIndex": 3, "endRowIndex": 4},
                        "cell": {"userEnteredFormat": {"textFormat": {"bold": True}}},
                        "fields": "userEnteredFormat.textFormat.bold"}},
        {"updateSheetProperties": {"properties": {"sheetId": first["sheetId"],
                                                  "gridProperties": {"frozenRowCount": 4}},
                                   "fields": "gridProperties.frozenRowCount"}},
    ]
    sheets.spreadsheets().values().clear(spreadsheetId=SHEET_ID, range=f"'{first['title']}'").execute()
    sheets.spreadsheets().values().update(
        spreadsheetId=SHEET_ID, range=f"'{first['title']}'!A1",
        valueInputOption="RAW", body={"values": values}).execute()
    sheets.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={"requests": reqs}).execute()

    po = sheets.spreadsheets().values().get(
        spreadsheetId=SHEET_ID, range=f"'{TAB}'!A1:K").execute().get("values", [])
    assert len(po) == len(values), f"read-back nesedí: {len(po)} != {len(values)}"
    print(f"✅ zrcadleno {len(lide)} zákazníků do listu „{TAB}“ (read-back OK)")


if __name__ == "__main__":
    main()
