import psycopg2
# Der DictCursor muss separat aus den Extras importiert werden
from psycopg2.extras import DictCursor
from datetime import datetime

def hole_spiele_web(cursor):
    query = """
    SELECT
        v_heim.vereinsname AS heimverein, 
        v_gast.vereinsname AS gastverein,
        v_heim.url as heim_url,
        v_gast.url as gast_url,
        s.score as score,
        s.datum as datum,
        s.zeit as zeit,
        s.kennung as kennung
    FROM spiele_web s
    JOIN vereine v_heim ON s.heimverein = v_heim.kurzname
    JOIN vereine v_gast ON s.gastverein = v_gast.kurzname
    ORDER BY s.id ASC;
    """
    cursor.execute(query)
    return cursor.fetchall()


def main():
    connection = None
    try:
        # Zentraler Aufbau der Verbindung
        connection = psycopg2.connect(
            user="postgres",
            password="6778",
            host="localhost",
            database="app14_db"
        )
        
        # AKTIVIERUNG DES DICT-CURSORS: 
        # Liefert alle Ergebnisse ab jetzt als Dictionary-Strukturen zurück
        cursor = connection.cursor(cursor_factory=DictCursor)

        spiele_web = hole_spiele_web(cursor)
        print("\n--- Aktuelle Spiele in spiele_web ---") 
        print(f"Anzahl gefundener Spiele: {len(spiele_web)}")
        
        spiele_neu = []
        spiele_update = []
        
        for spiel in spiele_web:
            # Zugriff erfolgt jetzt sauber über die Spaltennamen statt Zahlen-Indizes
            zeit_string = f"{spiel['datum']} {spiel['zeit']}"
            timestamp_obj = datetime.strptime(zeit_string, "%d.%m.%Y %H:%M")
            wochentag_index = timestamp_obj.weekday()
            anstoss = timestamp_obj
            
            sg = [
                "Montag", "Dienstag", "Mittwoch", "Donnerstag", 
                "1_Freitagsspiele", "2_Samstagspiele", "3_Sonntagsspiele"
            ]
            spielgruppe = sg[wochentag_index]
            score = spiel['score']
            
            # Auswertung des Scores und setzen der neuen Statuswörter
            if score == "-:-":
                statuswort = 'geplant'
                heimtore = 0
                gasttore = 0
            else:
                heimtore = int(score.split(':')[0])
                gasttore = int(score.split(':')[1])    
                statuswort = 'ausgewertet'

            # Variablen aus dem Dict-Spiel-Objekt zuweisen
            heimverein = spiel['heimverein']
            gastverein = spiel['gastverein']
            heimbild = spiel['heim_url']
            gastbild = spiel['gast_url']
            kennung = spiel['kennung']

            # Terminal-Ausgabe für das Protokoll
            print(f"{heimverein} - {gastverein}, {heimtore} : {gasttore}, {anstoss}")
            print(f"{heimbild}")
            print(f"{gastbild}")
            print(f"{spielgruppe}, {statuswort}, {kennung}, {score}\n")     
            
            # Da 'spiel' dank DictCursor bereits ein Dictionary ist, 
            # erstellen wir eine Kopie und modifizieren nur die berechneten Werte
            spiel_kopie = dict(spiel)
            
            # Schlüssel an die Ziel-Tabelle 'spiele' anpassen
            spiel_kopie['heimbild'] = spiel_kopie.pop('heim_url')
            spiel_kopie['gastbild'] = spiel_kopie.pop('gast_url')
            spiel_kopie['spielgruppe'] = spielgruppe
            spiel_kopie['statuswort'] = statuswort
            spiel_kopie['heimtore'] = heimtore
            spiel_kopie['gasttore'] = gasttore
            spiel_kopie['anstoss'] = anstoss  # Schreibt den berechneten Zeitstempel sauber rein

            # Nicht benötigte Spalten aus dem SELECT entfernen (da sie nicht in 'spiele' existieren)
            spiel_kopie.pop('datum', None)
            spiel_kopie.pop('zeit', None)
            spiel_kopie.pop('score', None)

            # Aufteilung in die passenden Listen für die Datenbank
            if statuswort == 'ausgewertet':
                spiele_update.append(spiel_kopie)
            else:
                spiele_neu.append(spiel_kopie)

        # --- DATENBANK-VERARBEITUNG ---
        print("--- Starte Datenbank-Übertragung ---")

        # 1. Befehl: Neue Spiele anlegen (Konflikt ignorieren, falls schon da)
        if len(spiele_neu) > 0:
            insert_query = """
            INSERT INTO spiele (heimverein, gastverein, heimtore, gasttore, anstoss, heimbild, gastbild, spielgruppe, statuswort, kennung)
            VALUES (%(heimverein)s, %(gastverein)s, %(heimtore)s, %(gasttore)s, %(anstoss)s, %(heimbild)s, %(gastbild)s, %(spielgruppe)s, %(statuswort)s, %(kennung)s)
            ON CONFLICT (kennung) DO NOTHING;
            """
            cursor.executemany(insert_query, spiele_neu)
            print(f"{len(spiele_neu)} Spiele als 'planung_neu' verarbeitet.")

        # 2. Befehl: Bestehende Spiele mit Toren aktualisieren
        if len(spiele_update) > 0:
            update_query = """
            INSERT INTO spiele (heimverein, gastverein, heimtore, gasttore, anstoss, heimbild, gastbild, spielgruppe, statuswort, kennung)
            VALUES (%(heimverein)s, %(gastverein)s, %(heimtore)s, %(gasttore)s, %(anstoss)s, %(heimbild)s, %(gastbild)s, %(spielgruppe)s, %(statuswort)s, %(kennung)s)
            ON CONFLICT (kennung) DO UPDATE SET
                heimtore = EXCLUDED.heimtore,
                gasttore = EXCLUDED.gasttore,
                statuswort = EXCLUDED.statuswort;
            """
            cursor.executemany(update_query, spiele_update)
            print(f"{len(spiele_update)} Spiele mit Toren aktualisiert.")

        # Änderungen dauerhaft in der Datenbank speichern
        connection.commit()
        print("Verarbeitung erfolgreich abgeschlossen und gespeichert.")

    except Exception as e:
        # Korrektes Auffangen und Anzeigen von Fehlern im Hauptprogramm
        print("Fehler im Hauptprogramm:", e)

    finally:
        # Zentrales Schließen der Ressourcen
        if connection:
            cursor.close()
            connection.close()
            print("Verbindung sicher geschlossen.")
            
if __name__ == "__main__":
    main()

