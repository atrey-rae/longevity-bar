type DayQrRecord = { active: boolean; date: string } | null;

/**
 * Starý či budoucí známý denní QR slouží jako vstup do aplikace, ne jako
 * odložený pokus o razítko. Dnešní token pokračuje standardním scan flow.
 */
export function postLoginDestinationForDayQr(
  token: string,
  day: DayQrRecord,
  today: string,
): string {
  // Jakýkoli známý kód jiného dne je pouze vstup do aplikace. `active` se po
  // skončení dne běžně vypíná, takže na něm nesmí záviset registrace ze staré
  // vytištěné kartičky.
  if (day && day.date !== today) return "/";
  return `/scan/${encodeURIComponent(token)}`;
}
