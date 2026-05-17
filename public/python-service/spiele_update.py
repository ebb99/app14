from copy import error
import psycopg2
from datetime import datetime





def hole_spiele_web(cursor):
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
    FROM spiele_web s
    JOIN vereine v_heim ON s.heim_id = v_heim.id
    JOIN vereine v_gast ON s.gast_id = v_gast.id;
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
        # cursor = connection.cursor()
        cursor = connection.cursor()
        


        # Fügen Sie diese Zeilen einmalig vor Ihrer Schleife ein, 
        # um den Datenbank-Zähler zu reparieren:
        repair_query = "SELECT setval(pg_get_serial_sequence('spiele', 'id'), COALESCE(MAX(id), 1)) FROM spiele;"
        cursor.execute(repair_query)
        connection.commit()
        print("Der automatische ID-Zähler der Datenbank wurde erfolgreich repariert!")

        spiele_web = hole_spiele_web(cursor)
        print("\n--- Aktuelle Spiele in spiele_web ---") 
        
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

            # sql = """
            #     INSERT INTO spiele2 (spieltag,anstoss, heim_id, gast_id, heim_kurzname, gast_kurzname, heimtore, gasttore, spielgruppe, statuswort, kennung)
            #     VALUES (%s, %s,%s,%s, %s, %s, %s, %s, %s, %s, %s)
            #     ON CONFLICT (kennung) DO NOTHING;
            # """

            # daten = (
            #     int (spiel['spieltag']),  # Platzhalter für spieltag
            #     timestamp_obj, 
            #     heim_id['id'],  # Platzhalter für heim_id
            #     gast_id['id'],  # Platzhalter für gast_id
            #     spiel['heimverein'],  # Platzhalter für heim_kurzname
            #     spiel['gastverein'],  # Platzhalter für gast_kurzname
            #     heimtore,  
            #     gasttore, 
            #     spielgruppen[wochentag_index],  # Platzhalter für spielgruppe, hier als String des Wochentagsindex
            #     statuswort, 
            #     spiel['kennung']
            # )
            # cursor.execute(sql, daten)
            # connection.commit()  # Änderungen speichern 


        print("neu")

#         spiele_alt2 = hole_spiele_alt(cursor)
#         spiele_zum_einfuegen = []

#         for spiel in spiele_alt2:
    
#             # --- PRÜFUNG 1: planung ---
#             if spiel['statuswort'] == 'planung':
#                 spiel_kopie = dict(spiel)
#                 spiel_kopie.pop('id', None)
#                 spiel_kopie.pop('spiel_id', None)
                
#                 spiel_kopie['statuswort'] = 'geplant'
#                 spiele_zum_einfuegen.append(spiel_kopie)

#             # --- PRÜFUNG 2: erhalten ---
#             elif spiel['statuswort'] == 'erhalten':
#                 spiel_kopie = dict(spiel)
#                 spiel_kopie.pop('id', None)
#                 spiel_kopie.pop('spiel_id', None)
                
#                 spiel_kopie['statuswort'] = 'ausgewertet'
#                 spiele_zum_einfuegen.append(spiel_kopie)

# # Verarbeitung in der Datenbank
#         if len(spiele_zum_einfuegen) > 0:
#             # Die Query nutzt nun DO UPDATE bei einem Konflikt mit der Kennung
#             insert_query = """
#             INSERT INTO spiele (heimverein, gastverein, heimtore, gasttore, anstoss, heimbild, gastbild, spielgruppe, statuswort, kennung)
#             VALUES (%(heimverein)s, %(gastverein)s, %(heimtore)s, %(gasttore)s, %(anstoss)s, %(heimbild)s, %(gastbild)s, %(spielgruppe)s, %(statuswort)s, %(kennung)s)
#             ON CONFLICT (kennung) DO UPDATE SET
#                 heimtore = EXCLUDED.heimtore,
#                 gasttore = EXCLUDED.gasttore,
#                 statuswort = EXCLUDED.statuswort;
#             """
#             cursor.executemany(insert_query, spiele_zum_einfuegen)
#             connection.commit()
#             print(f"Es wurden insgesamt {len(spiele_zum_einfuegen)} von {len(spiele_alt2)} Spielen verarbeitet (eingefügt oder aktualisiert).")
#         else:
#             print("Keine Datensätze erfüllten die Kriterien (weder 'planung' noch 'erhalten'). Nichts unternommen.")

########################################################################           
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
  
