import Link from "next/link";

export default function NenalezenoPage() {
  return (
    <div className="obal space-y-5 text-center">
      <p className="text-7xl" aria-hidden>
        🥥
      </p>
      <h1>Tady nic není</h1>
      <p className="text-base text-kokos-50/80">
        Stránka neexistuje nebo už neplatí. Zkus to od věrnostní karty.
      </p>
      <Link href="/" className="tlacitko-hlavni">
        Zpět na kartu
      </Link>
    </div>
  );
}
