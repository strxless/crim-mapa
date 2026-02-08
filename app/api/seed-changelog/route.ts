import { NextResponse } from 'next/server';
import postgres from 'postgres';
import Database from 'better-sqlite3';

const USE_SQLITE = process.env.USE_SQLITE === 'true';

export async function GET() {
  try {
    // Auto-generate version with timestamp to trigger on each deploy
    const now = new Date();
    const version = process.env.CHANGELOG_VERSION || `2.0.${Math.floor(now.getTime() / 1000)}`;
    
    const updateData = {
      version,
      title: 'Duża aktualizacja systemu',
      description: 'Nowe funkcje i ulepszenia ułatwiające codzienną pracę',
      features: JSON.stringify([
        {
          icon: '',
          title: 'Dodawanie Zdjęć',
          description: 'Dodałem możliwość dodawania zdjęć do odwiedzin. Po kliknięciu "Dodaj zdjęcie" system automatycznie kompresuje obraz i przesyła go. Zdjęcia są widoczne w historii odwiedzin — kliknięcie na miniaturkę pokazuje pełny podgląd.',
          badge: 'NOWE',
        },
        {
          icon: '',
          title: 'Planowanie Patroli',
          description: 'Nowa zakładka "Plan Patrolu" w kategorii Street pozwala tworzyć i zarządzać planami patroli. System automatycznie układa punkty w najkrótszą trasę i pokazuje całkowity dystans do pokonania.',
          badge: 'NOWE',
        },
        {
          icon: '',
          title: 'Dodawanie Punktów do Patrolu',
          description: 'Przy każdym punkcie na mapie pojawił się przycisk "Dodaj na patrol". Można szybko dodawać lokalizacje do planu bez przełączania zakładek.',
          badge: 'NOWE',
        },
        {
          icon: '',
          title: 'Lepsza Mapa',
          description: 'Zmieniłem standardową mapę na specjalną mapę transportową, która wyraźniej pokazuje ulice, linie autobusowe, przystanki i trasę autobusów.',
        },
        {
          icon: '',
          title: 'Dostosowanie do Telefonów',
          description: 'Aplikacja została przystosowana do pracy na telefonach. Wszystkie przyciski i okna są teraz większe i wygodniejsze w obsłudze na małych ekranach.',
        },
        {
          icon: '',
          title: 'Nowy Wygląd',
          description: 'Ciemny, profesjonalny design z lepszymi kolorami i układem. Aplikacja wygląda teraz spójnie na wszystkich zakładkach.',
        },
        {
          icon: '',
          title: 'Szybsze Działanie',
          description: 'Zoptymalizowałem sposób pobierania danych. Aplikacja działa teraz płynniej i szybciej reaguje na kliknięcia.',
        },
      ]),
    };

    if (USE_SQLITE) {
      const db = new Database(process.env.AUTH_DB_PATH || './data/auth.db');
      const existing = db.prepare('SELECT id FROM app_updates WHERE version = ?').get(updateData.version);

      if (existing) {
        return NextResponse.json({ message: `Changelog ${version} already exists`, version, success: true });
      }

      db.prepare(`
        INSERT INTO app_updates (version, title, description, features)
        VALUES (?, ?, ?, ?)
      `).run(updateData.version, updateData.title, updateData.description, updateData.features);

      return NextResponse.json({ message: `Changelog ${version} seeded to SQLite!`, version, success: true });
    } else {
      const sql = postgres(process.env.POSTGRES_URL!, { max: 1 });
      const existing = await sql`SELECT id FROM app_updates WHERE version = ${updateData.version}`;

      if (existing.length > 0) {
        await sql.end();
        return NextResponse.json({ message: `Changelog ${version} already exists`, version, success: true });
      }

      await sql`
        INSERT INTO app_updates (version, title, description, features)
        VALUES (${updateData.version}, ${updateData.title}, ${updateData.description}, ${updateData.features})
      `;

      await sql.end();
      return NextResponse.json({ message: `Changelog ${version} seeded to PostgreSQL!`, version, success: true });
    }
  } catch (error: any) {
    console.error('Error seeding changelog:', error);
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}
