import postgres from 'postgres';
import Database from 'better-sqlite3';

const USE_SQLITE = process.env.USE_SQLITE === 'true';

let sqliteDb: Database.Database | null = null;

function getSQLiteDB() {
  if (!sqliteDb) {
    const dbPath = process.env.AUTH_DB_PATH || './data/auth.db';
    sqliteDb = new Database(dbPath);
  }
  return sqliteDb;
}

function getDB() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('POSTGRES_URL is not set');
  }
  return postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

async function seedChangelog() {
  // Auto-generate version with timestamp to trigger on each deploy
  const now = new Date();
  const version = process.env.CHANGELOG_VERSION || `2.0.${Math.floor(now.getTime() / 1000)}`;
  
  const updateData = {
    version,
    title: 'Duża aktualizacja systemu',
    description: 'Dodałem nowe funkcje i ulepszenia, które ułatwiają codzienną pracę',
    features: JSON.stringify([
      {
        icon: '',
        title: 'Planowanie Patroli',
        description: 'Dodałem nową zakładkę „Plan Patrolu” w kategorii StreetWork, która pozwala tworzyć i zarządzać planami patroli. System automatycznie układa punkty w najkrótszą trasę i pokazuje całkowity dystans do pokonania.',
        badge: 'NOWE',
      },
      {
        icon: '',
        title: 'Dodawanie Punktów do Patrolu',
        description: 'Przy każdym punkcie na mapie dodałem przycisk „Dodaj na patrol”. Dzięki temu można szybko dodawać lokalizacje do planu bez przełączania zakładek.',
        badge: 'NOWE',
      },
      {
        icon: '',
        title: 'Dodawanie Zdjęć',
        description: 'Dodałem możliwość dodawania zdjęć do odwiedzin. Po kliknięciu „Dodaj zdjęcie” system automatycznie kompresuje obraz i przesyła go. Zdjęcia są widoczne w historii odwiedzin, kliknięcie na miniaturkę pokazuje pełny podgląd.',
        badge: 'NOWE',
      },
      {
        icon: '',
        title: 'Lepsza Mapa',
        description: 'Zamieniłem standardową mapę na specjalną mapę transportową, która wyraźniej pokazuje ulice, jak i linie autobusowe, przystanki i trasę autobusów.',
      },
      {
        icon: '',
        title: 'Dostosowanie do Telefonów',
        description: 'Dostosowałem aplikację do pracy na telefonach. Wszystkie przyciski i okna są teraz większe i wygodniejsze w obsłudze na małych ekranach.',
      },
      {
        icon: '',
        title: 'Nowy Wygląd',
        description: 'Wprowadziłem ciemny, profesjonalny design z lepszymi kolorami i układem. Aplikacja wygląda teraz spójnie na wszystkich zakładkach.',
      },
      {
        icon: '',
        title: 'Szybsze Działanie',
        description: 'Zoptymalizowałem sposób pobierania danych, dzięki czemu aplikacja działa płynniej i szybciej reaguje na kliknięcia.',
      },
    ]),
  };

  if (USE_SQLITE) {
    const db = getSQLiteDB();

    const existing = db
      .prepare('SELECT id FROM app_updates WHERE version = ?')
      .get(updateData.version);

    if (existing) {
      console.log(`✅ Changelog ${version} already exists`);
      return;
    }

    db.prepare(`
      INSERT INTO app_updates (version, title, description, features)
      VALUES (?, ?, ?, ?)
    `).run(updateData.version, updateData.title, updateData.description, updateData.features);

    console.log(`✅ Changelog ${version} seeded to SQLite!`);

  } else {
    const sql = getDB();

    const existing = await sql`
      SELECT id FROM app_updates WHERE version = ${updateData.version}
    `;

    if (existing.length > 0) {
      console.log(`✅ Changelog ${version} already exists`);
      await sql.end();
      return;
    }

    await sql`
      INSERT INTO app_updates (version, title, description, features)
      VALUES (${updateData.version}, ${updateData.title}, ${updateData.description}, ${updateData.features})
    `;

    await sql.end();
    console.log(`✅ Changelog ${version} seeded to PostgreSQL!`);
  }
}


seedChangelog().catch(console.error);
