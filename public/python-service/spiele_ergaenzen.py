from copy import error

import psycopg2
from psycopg2.extras import RealDictCursor
from tabulate import tabulate
from datetime import datetime
import json
# --- Unterprogramme (Funktionen) ---
def spiele_löschen_statuswort(cursor, connection, status_variable):
    delete_query = "DELETE FROM spiele WHERE statuswort = %s;"
    cursor.execute(delete_query, [status_variable])
    connection.commit()

def leeren_tabelle_spiele2(cursor):
    cursor.execute("TRUNCATE TABLE spiele2 RESTART IDENTITY;")
   
def hole_spiele2(cursor):
    cursor.execute("SELECT * FROM spiele2;")
    return cursor.fetchall()


def alle_spiele_holen(cursor):
    cursor.execute("SELECT * FROM spiele_web;")
    return cursor.fetchall()

def hole_spiele_alt(cursor):
    query = """
    SELECT
    v_heim.vereinsname AS heimverein,
    v_gast.vereinsname as gastverein,
    s.heimtore as heimtore,
    s.gasttore as gasttore,
    s.anstoss as anstoss,
    v_heim.url AS heimbild,
    v_gast.url AS gastbild,
    s.spielgruppe as spielgruppe,
    s.statuswort as statuswort, 
    s.kennung as kennung
    FROM spiele2 s
    JOIN vereine v_heim ON s.heim_id = v_heim.id
    JOIN vereine v_gast ON s.gast_id = v_gast.id;
    """
    cursor.execute(query)
    return cursor.fetchall()

def hole_vereine(cursor):
    cursor.execute("SELECT * FROM vereine")
    return cursor.fetchall()  


def hole_verein(cursor,verein):
    cursor.execute("select kurzname from vereine where kurzname = %s",[verein])
    row=cursor.fetchone()
    return row['kurzname'] if row else "??"


def hole_vereinsname(cursor,verein):
    cursor.execute("select vereinsname from vereine where kurzname = %s",[verein])
    row=cursor.fetchone()
    return row['vereinsname'] if row else "??"
def hole_url(cursor,verein):
    cursor.execute("select url from vereine where kurzname = %s",[verein])
    row=cursor.fetchone()
    return row['url'] if row else "??"

def hole_vereins_id(cursor, kurzname):
    cursor.execute("SELECT id FROM vereine WHERE kurzname = %s;", (kurzname,))
    return cursor.fetchone()

def create_table_spiele2(cursor):
    cursor.execute("DROP TABLE IF EXISTS spiele2;")
    # Nutze """ für mehrzeilige Strings
    # connection.commit()  # Änderungen speichern, im Hauptprogramm aufrufen
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS spiele2 (
            id SERIAL PRIMARY KEY,
            spieltag INTEGER NOT NULL,
            anstoss TIMESTAMPTZ NOT NULL, 
            heim_id INTEGER NOT NULL,       
            gast_id INTEGER NOT NULL, 
            heim_kurzname VARCHAR(255) NOT NULL,       
            gast_kurzname VARCHAR(255) NOT NULL,  
            heimtore INTEGER,
            gasttore INTEGER,                 
            spielgruppe VARCHAR(255) NOT NULL,
            statuswort VARCHAR(255) NOT NULL,
            kennung VARCHAR(255) NOT NULL UNIQUE
        );
    """)

def hole_spiel_nach_id(cursor, spiel_id):
    """Beispiel für eine Abfrage mit Parameter."""
    query = "SELECT * FROM spiele_web WHERE id = %s;"
    cursor.execute(query, (spiel_id,))
    return cursor.fetchone()



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
        # cursor = connection.cursor()
        cursor = connection.cursor(cursor_factory=RealDictCursor)

###########################################
        # create_table_spiele2(cursor)
        # connection.commit()  # Änderungen speichern

###########################################
        leeren_tabelle_spiele2(cursor)
        connection.commit()  # Änderungen speichern

        

###########################################
                # Fügen Sie diese Zeilen einmalig vor Ihrer Schleife ein, 
        # um den Datenbank-Zähler zu reparieren:
        repair_query = "SELECT setval(pg_get_serial_sequence('spiele', 'id'), COALESCE(MAX(id), 1)) FROM spiele;"
        cursor.execute(repair_query)
        connection.commit()
        print("Der automatische ID-Zähler der Datenbank wurde erfolgreich repariert!")

        

        spiele2= hole_spiele2(cursor)
        print("\n--- Aktuelle Spiele in spiele2 ---") 
        colnames = [desc[0] for desc in cursor.description]
        data_spiele2 = [spiel2.values() for spiel2 in spiele2]
        # print(tabulate(data_spiele2, headers=colnames, tablefmt='grid')) 
        if not spiele2:
            print("\n   Hinweis: Die Tabelle spiele2 enthält aktuell keine Datensätze.")

        spiele_web = alle_spiele_holen(cursor)
        print("\n--- Aktuelle Spiele in spiele_web ---") 
        colnames = [desc[0] for desc in cursor.description]
        data_spiele_web = [spiel.values() for spiel in spiele_web]
        # print(tabulate(data_spiele_web, headers=colnames, tablefmt='grid')) 
        if not spiele_web:
            print("\n   Hinweis: Die Tabelle spiele_web enthält aktuell keine Datensätze.")
      


        
        for spiel in spiele_web:    
            # print(f"\nVerarbeite Spiel mit Kennung: {spiel['kennung']}")
            zeit_string = f"{spiel['datum']} {spiel['zeit']}"
            timestamp_obj = datetime.strptime(zeit_string, "%d.%m.%Y %H:%M")
            wochentag_index = timestamp_obj.weekday()
            spielgruppen = [
            "Montag", "Dienstag", "Mittwoch", "Donnerstag", 
            "1_Freitagsspiele", "2_Samstagspiele", "3_Sonntagsspiele"
            ]
            sg=spielgruppen[wochentag_index]
            heim_id = hole_vereins_id(cursor, spiel['heimverein'])
            gast_id = hole_vereins_id(cursor, spiel['gastverein'])
            score = spiel['score']
            if score == "-:-":
                erg = "--"
                statuswort = 'planung'
                heimtore = 0
                gasttore = 0
            else:
                erg = score
                heimtore = int(spiel['score'].split(':')[0])
                gasttore = int(spiel['score'].split(':')[1])    
                statuswort = 'erhalten'
            # h_url = hole_url(cursor,spiel["heimverein"])
            # g_url = hole_url(cursor,spiel["gastverein"])
            # kennung=spiel['kennung']

            sql = """
                INSERT INTO spiele2 (spieltag,anstoss, heim_id, gast_id, heim_kurzname, gast_kurzname, heimtore, gasttore, spielgruppe, statuswort, kennung)
                VALUES (%s, %s,%s,%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (kennung) DO NOTHING;
            """

            daten = (
                int (spiel['spieltag']),  # Platzhalter für spieltag
                timestamp_obj, 
                heim_id['id'],  # Platzhalter für heim_id
                gast_id['id'],  # Platzhalter für gast_id
                spiel['heimverein'],  # Platzhalter für heim_kurzname
                spiel['gastverein'],  # Platzhalter für gast_kurzname
                heimtore,  
                gasttore, 
                spielgruppen[wochentag_index],  # Platzhalter für spielgruppe, hier als String des Wochentagsindex
                statuswort, 
                spiel['kennung']
            )
            cursor.execute(sql, daten)
            connection.commit()  # Änderungen speichern 


        print("neu")

        spiele_alt2 = hole_spiele_alt(cursor)
        spiele_zum_einfuegen = []

        for spiel in spiele_alt2:
    
            # --- PRÜFUNG 1: planung ---
            if spiel['statuswort'] == 'planung':
                spiel_kopie = dict(spiel)
                spiel_kopie.pop('id', None)
                spiel_kopie.pop('spiel_id', None)
                
                spiel_kopie['statuswort'] = 'geplant'
                spiele_zum_einfuegen.append(spiel_kopie)

            # --- PRÜFUNG 2: erhalten ---
            elif spiel['statuswort'] == 'erhalten':
                spiel_kopie = dict(spiel)
                spiel_kopie.pop('id', None)
                spiel_kopie.pop('spiel_id', None)
                
                spiel_kopie['statuswort'] = 'ausgewertet'
                spiele_zum_einfuegen.append(spiel_kopie)

# Verarbeitung in der Datenbank
        if len(spiele_zum_einfuegen) > 0:
            # Die Query nutzt nun DO UPDATE bei einem Konflikt mit der Kennung
            insert_query = """
            INSERT INTO spiele (heimverein, gastverein, heimtore, gasttore, anstoss, heimbild, gastbild, spielgruppe, statuswort, kennung)
            VALUES (%(heimverein)s, %(gastverein)s, %(heimtore)s, %(gasttore)s, %(anstoss)s, %(heimbild)s, %(gastbild)s, %(spielgruppe)s, %(statuswort)s, %(kennung)s)
            ON CONFLICT (kennung) DO UPDATE SET
                heimtore = EXCLUDED.heimtore,
                gasttore = EXCLUDED.gasttore,
                statuswort = EXCLUDED.statuswort;
            """
            cursor.executemany(insert_query, spiele_zum_einfuegen)
            connection.commit()
            print(f"Es wurden insgesamt {len(spiele_zum_einfuegen)} von {len(spiele_alt2)} Spielen verarbeitet (eingefügt oder aktualisiert).")
        else:
            print("Keine Datensätze erfüllten die Kriterien (weder 'planung' noch 'erhalten'). Nichts unternommen.")

##########################


        spiele_löschen_statuswort(cursor, connection, 'erhalten_neu') 
        spiele_löschen_statuswort(cursor, connection, 'planung_neu') 


########################################################################           
    except (Exception, psycopg2.Error) as error:
        print("Fehler im Hauptprogramm:", error)

    finally:
        # Zentrales Schließen der Ressourcen
        if connection:
            cursor.close()
            connection.close()
            print("\nVerbindung sicher geschlossen.")
            print("\033[91m⚠️  ALERT: statuswort noch ändern!\033[0m\a")

if __name__ == "__main__":
    main()
