const { Pool } = require('pg');

const dbConfig = {
    user: 'postgres', // Bitte anpassen
    host: 'localhost',
    database: 'app14_db', // Bitte anpassen
    password: '6778', // Bitte anpassen
    port: 5432, 
};

const pool = new Pool(dbConfig);

async function tabelleNeuErstellen() {
    try {
        console.log("Starte Datenbank-Operationen...");

        // 1. Alte Tabelle löschen
        console.log("Lösche alte Tabelle 'spiele_aktuell' falls vorhanden...");
        await pool.query("DROP TABLE IF EXISTS spiele_aktuell CASCADE;");

        // 2. Neue Tabelle erstellen
        console.log("Erstelle neue Tabelle 'spiele_aktuell'...");
        const createTableQuery = `
            CREATE TABLE spiele_aktuell (
                id SERIAL PRIMARY KEY,
                gruppen_id INTEGER,
                team_home VARCHAR(100) NOT NULL,
                team_away VARCHAR(100) NOT NULL,
                tore_home INTEGER DEFAULT 0,
                tore_away INTEGER DEFAULT 0,
                spiel_datum TIMESTAMP,
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pool.query(createTableQuery);

        console.log("Erfolgreich! Tabelle 'spiele_aktuell' wurde ohne Warnungen zurückgesetzt.");

    } catch (err) {
        console.error("Fehler beim Zurücksetzen der Tabelle:", err.message);
    } finally {
        // Pool sauber schließen
        await pool.end();
        console.log("Datenbankverbindung geschlossen.");
    }
}

tabelleNeuErstellen();
