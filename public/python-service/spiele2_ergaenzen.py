from copy import error

import psycopg2
from psycopg2.extras import RealDictCursor
from tabulate import tabulate
from datetime import datetime

# --- Unterprogramme (Funktionen) ---

def leeren_tabelle_spiele2(cursor):
    cursor.execute("TRUNCATE TABLE spiele2 RESTART IDENTITY;")
   
def hole_spiele2(cursor):
    cursor.execute("SELECT * FROM spiele2;")
    return cursor.fetchall()


def alle_spiele_holen(cursor):
    cursor.execute("SELECT * FROM spiele_web;")
    return cursor.fetchall()

def hole_geplante_spiele(cursor):
    cursor.execute("SELECT * FROM spiele_web WHERE score = '-:-';")
    return cursor.fetchall()
def hole_beendete_spiele(cursor):
    cursor.execute("SELECT * FROM spiele_web WHERE score != '-:-';")
    return cursor.fetchall()

# def hole_vereine(cursor):
#     cursor.execute("SELECT * FROM vereine;")
#     return cursor.fetchall()
def hole_verein(cursor,verein):
    cursor.execute("select kurzname from vereine where kurzname = %s",[verein])
    row=cursor.fetchone()
    return row['kurzname'] if row else "??"

def hole_vereinsname(cursor,verein):
    cursor.execute("select vereinsname from vereine where kurzname = %s",[verein])
    row=cursor.fetchone()
    return row['vereinsname'] if row else "??"


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
        # leeren_tabelle_spiele2(cursor)
        # connection.commit()  # Änderungen speichern
       
###########################################
        

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
        print(tabulate(data_spiele_web, headers=colnames, tablefmt='grid')) 
        if not spiele_web:
            print("\n   Hinweis: Die Tabelle spiele_web enthält aktuell keine Datensätze.")


        for spiel in spiele_web:    
            print(f"\nVerarbeite Spiel mit Kennung: {spiel['kennung']}")
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
            h_verein= hole_verein(cursor,spiel['heimverein'])
            g_verein = hole_verein(cursor,spiel['gastverein'])
            h_name=hole_vereinsname(cursor,spiel["heimverein"])
            g_name=hole_vereinsname(cursor,spiel["gastverein"]) 
            score = spiel['score']
            if score == "-:-":
                erg = "--"
            else:
                erg = score

            print(f"{sg} ,{timestamp_obj} ,{heim_id['id']} ,{gast_id['id']} ,{h_verein} ,{g_verein}, {erg}, {h_name}, {g_name}  ")
            
            # print(f"   Heimverein: {spiel['heimverein']} (ID: {heim_id['id']})")
            # print(f"   Gastverein: {spiel['gastverein']} (ID: {gast_id['id']})")
            
        #     sql = """
        #         INSERT INTO spiele2 (spieltag,anstoss, heim_id, gast_id, heim_kurzname, gast_kurzname, heimtore, gasttore, spielgruppe, statuswort, kennung)
        #         VALUES (%s, %s,%s,%s, %s, %s, %s, %s, %s, %s, %s)
        #         ON CONFLICT (kennung) DO NOTHING;
        #     """

        #     daten = (
        #         int (spiel['spieltag']),  # Platzhalter für spieltag
        #         timestamp_obj, 
        #         heim_id['id'],  # Platzhalter für heim_id
        #         gast_id['id'],  # Platzhalter für gast_id
        #         spiel['heimverein'],  # Platzhalter für heim_kurzname
        #         spiel['gastverein'],  # Platzhalter für gast_kurzname
        #         0,  # Platzhalter für heimtore
        #         0,  # Platzhalter für gasttore
        #         spielgruppen[wochentag_index],  # Platzhalter für spielgruppe, hier als String des Wochentagsindex
        #         'geplant', 
        #         spiel['kennung']
        #     )
        #     cursor.execute(sql, daten)
        #     connection.commit()  # Änderungen speichern 

        #     spiele = hole_beendete_spiele(cursor)
            # print("\n--- beendete Spiele     ---")  
            # colnames = [desc[0] for desc in cursor.description]
            # data = [spiel.values() for spiel in spiele]
            # print(tabulate(data, headers=colnames, tablefmt='grid'))
            # if not spiele:
            #     print("\n   Hinweis: Die Tabelle beendete_spiele enthält aktuell keine Datensätze.")

            # for spiel in spiele:
            #     kennung =spiel['kennung']
            #     heimtore = int(spiel['score'].split(':')[0])
            #     gasttore = int(spiel['score'].split(':')[1])    
                
            #     # print (f"\nVerarbeite Spiel mit Kennung: {kennung_beendet}")
                
            #     sql = """
            #         UPDATE spiele2 
            #         SET heimtore = %s, 
            #         gasttore = %s, 
            #         statuswort = %s
            #         WHERE kennung = %s;
            #         """
            #     cursor.execute(sql, (heimtore, gasttore, 'beendet', kennung))
            #     connection.commit()  # Änderungen speichern 


###################################



    except (Exception, psycopg2.Error) as error:
        print("Fehler im Hauptprogramm:", error)

    finally:
        # Zentrales Schließen der Ressourcen
        if connection:
            cursor.close()
            connection.close()
            print("\nVerbindung sicher geschlossen.")

if __name__ == "__main__":
    main()
