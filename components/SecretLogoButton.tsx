import Link from 'next/link';

export default function SecretLogoButton() {
  return (
    <Link
      href="/"
      className="text-base font-semibold tracking-tight cursor-pointer sm:text-lg hover:text-blue-600 transition-colors"
    >
      CRiIM Mapa
    </Link>
  );
}
