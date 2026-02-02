'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SecretLogoButton() {
  const router = useRouter();
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleLogoClick = (e: React.MouseEvent) => {
    const now = Date.now();
    
    // Reset counter if more than 2 seconds between clicks
    if (now - lastClickTime > 2000) {
      setClickCount(1);
    } else {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      
      // Easter egg: 5 clicks opens pasjans!
      if (newCount === 5) {
        e.preventDefault();
        router.push('/pasjans');
        setClickCount(0);
        return;
      }
    }
    setLastClickTime(now);
  };

  return (
    <Link
      href="/"
      onClick={handleLogoClick}
      className="text-base font-semibold tracking-tight cursor-pointer sm:text-lg hover:text-blue-600 transition-colors"
    >
      CRiIM Mapa
    </Link>
  );
}
