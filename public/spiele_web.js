document.addEventListener("DOMContentLoaded", () => {
    // 1. Alle initialen Ladevorgänge starten
    spiele_web_laden();
    spiele_aktuell_laden();
    ladeGruppen();
    setupGruppenEventListener();
    $("simAllBeendenBtn")?.addEventListener("click", simAllSpieleBeenden);
    // Im DOMContentLoaded-Block einfügen:
    $("simAllToreUebertragenBtn")?.addEventListener("click", simAllToreUebertragen);

    // 2. Zentraler Klick-Listener für die obere Tabelle (Spiele zur Planung)
    const tableBody = document.getElementById('SpieleTableBody');
    if (tableBody) {s
        tableBody.addEventListener('click', (event) => {
            if (event.target.classList.contains('planungs-btn')) {
                const btn = event.target;
                
                // Live-Wert aus dem Input-Feld holen
                const gruppenName = document.getElementById('gruppenSelect')?.value || 'Unbekannt';
                console.log("👂 Klick registriert! Übergebener Gruppenname:", gruppenName);

                // Daten aus den sicheren data-Attributen auslesen
                const spieltag = btn.dataset.spieltag;
                const kennung = btn.dataset.kennung;
                const datum = btn.dataset.datum;
                const zeit = btn.dataset.zeit;
                const home_id = btn.dataset.home;
                const gast_id = btn.dataset.gast;

                // Funktion aufrufen
                zur_planung(spieltag, kennung, datum, zeit, gruppenName, home_id, gast_id, 'geplant', 0, 0);
            }
        });
    }

    // 3. Zentraler Klick-Listener für die untere Tabelle (Geplante Spiele löschen)
    const tableBodyAktuell = document.getElementById('SpieleTableBodyAktuell');
    if (tableBodyAktuell) {
        tableBodyAktuell.addEventListener('click', async (event) => {
            if (event.target.classList.contains('delete-btn')) {
                const spielId = event.target.dataset.id;
                
                if (confirm("Möchten Sie dieses Spiel wirklich aus der Planung löschen?")) {
                    try {
                        const response = await fetch(`/api/spiele_aktuell/${spielId}`, {
                            method: 'DELETE'
                        });

                        if (!response.ok) {
                            throw new Error("Fehler beim Löschen auf dem Server");
                        }

                        // Liste sofort neu laden, damit die Zeile verschwindet
                        await spiele_aktuell_laden();
                    } catch (error) {
                        console.error("Fehler beim Löschen des Spiels:", error);
                        alert("Das Spiel konnte nicht gelöscht werden.");
                    }
                }
            }
        });
    }
});
async function api(url, options = {}) {
    const res = await fetch(url, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...options
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || res.statusText);
    }

    return res.status === 204 ? null : res.json();
}

function $(id) {
    return document.getElementById(id);
}

async function simAllToreUebertragen() {
    if (!confirm("Möchten Sie für alle beendeten Spiele die ECHTEN Tore übernehmen und den Status auf 'ausgewertet' setzen?")) return;

    // 1. Alle Zeilen aus der linken Tabelle ('spiele_web') holen
    const webZeilen = Array.from(document.querySelectorAll('#SpieleTableBody tr'));
    
    // 2. Alle Zeilen aus der rechten Tabelle ('spiele_aktuell') holen
    const aktuellZeilen = Array.from(document.querySelectorAll('#SpieleTableBodyAktuell tr'));

    try {
        // Wir gehen jede Zeile der aktuellen Spiele durch
        for (const zeileAktuell of aktuellZeilen) {
            const spielId = zeileAktuell.dataset.id;
            
            // Kennung aus der 3. Spalte (Index 2) auslesen
            const kennung = zeileAktuell.cells[2]?.textContent?.trim();
            const status = zeileAktuell.cells[5]?.textContent?.trim();

            // Nur Spiele verarbeiten, die im Status '(beendet)' stehen
            if (status && status.includes('beendet')) {
                
                // Suchen nach dem passenden Spiel in der linken Tabelle anhand der Kennung
                const passendeWebZeile = webZeilen.find(z => z.cells[1]?.textContent?.trim() === kennung);

                if (passendeWebZeile) {
                    // Score auslesen (z.B. "3.2" oder "3:1") aus der 3. Spalte (Index 2)
                    const scoreText = passendeWebZeile.cells[2]?.textContent?.trim();
                    
                    // Trennung bei Punkt oder Doppelpunkt erlauben
                    const trenner = scoreText.includes('.') ? '.' : ':';
                    const [toreHomeRaw, toreGastRaw] = scoreText.split(trenner);

                    const tore_home = parseInt(toreHomeRaw, 10);
                    const tore_gast = parseInt(toreGastRaw, 10);

                    if (!Number.isNaN(tore_home) && !Number.isNaN(tore_gast)) {
                        console.log(`🚀 Übertrage für ${kennung}: ${tore_home} zu ${tore_gast}`);
                        
                        // Einzelnes Update an die Server-Route schicken
                        await api(`/api/spiele_aktuell/ergebnis/${spielId}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                tore_home,
                                tore_gast,
                                statuswort: 'ausgewertet' // KORREKTUR: Status wird auf 'ausgewertet' gesetzt
                            })
                        });
                    }
                }
            }
        }

        alert("Erfolgreich: Alle echten Tore wurden übertragen und auf 'ausgewertet' gesetzt!");
        
        // Beide Tabellen im Dashboard neu laden
        if (typeof spiele_aktuell_laden === 'function') await spiele_aktuell_laden();
        if (typeof spiele_web_laden === 'function') await spiele_web_laden();

    } catch (error) {
        console.error("Fehler bei der echten Tor-Übertragung:", error);
        alert("Fehler bei der Datenübertragung: " + error.message);
    }
}



async function simAllSpieleBeenden() {
    if (!confirm("Möchten Sie wirklich ALLE Spiele mit dem Status 'geplant' auf 'beendet' setzen?")) return;

    try {
        // KORREKTUR: Der Pfad darf NUR die reine URL als Text enthalten
        await api('/api/spiele_aktuell/sim/alle_beenden', {
            method: 'PUT'
        });

        alert("Simulation erfolgreich: Alle geplanten Spiele sind nun beendet!");
        
        if (typeof spiele_aktuell_laden === 'function') {
            await spiele_aktuell_laden();
        }
    } catch (error) {
        console.error("Simulationsfehler:", error);
        alert("Fehler bei der Simulation: " + error.message);
    }
}

async function ladeGruppen() {
    try {
        const response = await fetch("/api/gruppen_sort");
        
        if (!response.ok) {
            throw new Error(`Fehler: ${response.status} ${response.statusText}`);
        }

        const gruppen = await response.json(); 
        console.log("Geladene Gruppen-Daten:", gruppen);

        const datalist = document.getElementById('gruppenliste'); 
        if (!datalist) return;
        
        datalist.innerHTML = "";

        gruppen.forEach(g => {
            const option = document.createElement("option");
            option.value = g.gruppenname;   
            option.dataset.id = g.id;       
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error("Fehler beim Laden der Gruppen:", error);
    }
}

// KORREKTUR: Aus der ladeGruppen-Funktion herausgelöst und sauber platziert
function setupGruppenEventListener() {
    const gruppenSelect = document.getElementById('gruppenSelect');
    const datalist = document.getElementById('gruppenliste');

    if (!gruppenSelect || !datalist) return;

    gruppenSelect.addEventListener('input', () => {
        const eingabeWert = gruppenSelect.value;
        const passendeOption = Array.from(datalist.options).find(
            option => option.value === eingabeWert
        );

        if (passendeOption) {
            const ausgewaehlteId = passendeOption.dataset.id;
            console.log("Ausgewählte Gruppen-ID:", ausgewaehlteId);
            // Kann hier bei Bedarf global zwischengespeichert werden
        } else {
            console.log("Keine gültige Gruppe ausgewählt");
        }
    });
}


async function spiel_aktuell_Speichern() {
    try {
        const gruppenSelect = $("gruppenSelect"); // KORREKTUR: ID angepasst
        const gruppeName = gruppenSelect?.selectedOptions[0]?.text;
        const gruppe_Id = gruppenSelect?.value;
        
        const vereine = await api("/api/vereine");

        // HINWEIS: Variablen wie heimName/gastName müssen global oder als Parameter existieren
        const heimVerein = vereine.find(v => v.kurzname === (typeof heimName !== 'undefined' ? heimName : ''));
        const gastVerein = vereine.find(v => v.kurzname === (typeof gastName !== 'undefined' ? gastName : ''));
        const anz_kennung = kennung
        console.log({anz_kennung});
        const aktuelleKennung = typeof kennung !== 'undefined' ? kennung : '';

        // NEU: Vorab-Anzeige für den Nutzer (Konsole + Alert)
        console.log("Übertragene Kennung:", aktuelleKennung);
     
        if (!heimVerein || !gastVerein) {
            return alert("Verein nicht in der Liste gefunden");
        }

        await api("/api/spiele_aktuell", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kennung: typeof kennung !== 'undefined' ? kennung : '',
                anstoss: typeof anstoss !== 'undefined' ? anstoss : '',
                gruppe_Id,
                home_id: heimVerein.id,
                gast_id: gastVerein.id,
                tore_home: typeof tore_home !== 'undefined' ? tore_home : 0,
                tore_gast: typeof tore_gast !== 'undefined' ? tore_gast : 0,          
                statuswort: 'geplant'
            })
        });

        alert("Spiel angelegt");
        spiele_aktuell_laden();
    } catch (error) {
        console.error("Fehler beim Speichern:", error);
    }
}

async function spiele_aktuell_laden() {
    try {
        const response = await fetch('/api/spiele_aktuell');
        if (!response.ok) throw new Error(`Server-Fehler: ${response.status}`);

        const spiele = await response.json();
        const tableBody = document.getElementById('SpieleTableBodyAktuell');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        spiele.forEach(spiel => {
            const anstossDatum = spiel.anstoss ? new Date(spiel.anstoss).toLocaleString('de-DE', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '-';

            // KORREKTUR: Letzte Spalte enthält nun den Lösch-Button mit der echten Datenbank-ID
            const zeile = `
                <tr data-id="${spiel.id}">
                    <td>${spiel.spieltag || '-'}</td>
                    <td>${spiel.g_name || '-'}</td>
                    <td>${spiel.kennung || '-'}</td>
                    <td>${anstossDatum} Uhr</td>
                    <td>${spiel.tore_home ?? 0} : ${spiel.tore_gast ?? 0}</td>
                    <td>(${spiel.statuswort || 'ohne'})</td>
                    <td>
                        <button class="delete-btn" data-id="${spiel.id}" style="color: red; cursor: pointer;">
                            ❌ Löschen
                        </button>
                    </td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', zeile);
        });

    } catch (error) {
        console.error("Frontend-Fehler beim Laden:", error);
    }
}


async function spiele_web_laden() {
    try {
        const response = await fetch('/api/spiele_web');
        if (!response.ok) throw new Error(`Server-Fehler: ${response.status}`);

        const spiele = await response.json();
        const tableBody = document.getElementById('SpieleTableBody');
        if (!tableBody) return; 

        tableBody.innerHTML = '';

        spiele.forEach(spiel => {
            const tr = document.createElement('tr');
            tr.dataset.id = spiel.id;

            tr.innerHTML = `
                <td>${spiel.spieltag || '-'}</td>
                <td>${spiel.kennung || '-'}</td>
                <td>${spiel.score || '0:0'}</td>
                <td>
                    <button class="button planungs-btn" 
                        data-spieltag="${spiel.spieltag || ''}"
                        data-kennung="${spiel.kennung || ''}"
                        data-datum="${spiel.datum || '27.05.2026'}"
                        data-zeit="${spiel.zeit || '15:30'}"
                        data-home="${spiel.home_id || 0}"
                        data-gast="${spiel.gast_id || 0}">
                        zur Planung
                    </button>
                </td>
                <td>
                    <button class="delete" onclick="ergebniss(${spiel.id})">Ergebnis übernehmen</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (error) {
        console.error("Frontend-Fehler beim Laden:", error);
    }
}

// NEUE HILFSFUNKTION: Fängt alle Klicks sauber ab und liest die Daten aus
function setupPlanungsButtons() {
    const tableBody = document.getElementById('SpieleTableBody');
    if (!tableBody) return;

    // Entfernt alte Event-Listener, um doppelte Klicks zu verhindern
    tableBody.removeAttribute('data-listener-active');

    tableBody.addEventListener('click', (event) => {
        // Prüfen, ob wirklich auf den Planungs-Button geklickt wurde
        if (event.target.classList.contains('planungs-btn')) {
            const btn = event.target;
            
            // Gruppennamen live aus dem Dropdown lesen
            const gruppenName = document.getElementById('gruppenSelect')?.value || 'Unbekannt';

            // Daten sicher aus den Daten-Attributen lesen
            const spieltag = btn.dataset.spieltag;
            const kennung = btn.dataset.kennung;
            const datum = btn.dataset.datum;
            const zeit = btn.dataset.zeit;
            const home_id = btn.dataset.home;
            const gast_id = btn.dataset.gast;
              // Funktion fehlerfrei aufrufen
            zur_planung(spieltag, kennung, datum, zeit, gruppenName, home_id, gast_id, 'geplant', 0, 0);
        }
    });
}


async function zur_planung(spieltag, kennung, datum, zeit, gruppen_id, h_id, g_id, statuswort, tore_home, tore_gast) {
    console.log("übergeben:", spieltag, kennung, statuswort, h_id, g_id );

    if (!datum || !zeit) {
        alert("Datum oder Zeit fehlt!");
        return;
    }
        const [date_k, heim_k, gast_k] = kennung.split('_');  
        // console.log(heim_k)  
        const vereine = await api("/api/vereine");
        const gefundenerHeimVerein = vereine.find(v => v.kurzname === heim_k);
        const gefundenerGastVerein = vereine.find(v => v.kurzname === gast_k);
        const home_id = gefundenerHeimVerein?.id || null;
        const gast_id = gefundenerGastVerein?.id || null;

    // const gefundenerHeimVerein = vereine.find(v => {
    //     if (!v.kurzname || !heim_k) return false;
    //     return v.kurzname.trim().toLowerCase() === heim_k.trim().toLowerCase();
    // });

    // console.log("Das komplette Vereins-Objekt aus der API:", gefundenerHeimVerein);

    // const heimvereinName = gefundenerHeimVerein?.vereinsname || gefundenerHeimVerein?.name || "Nicht gefunden";
   
        // Kontrollausgabe in der Konsole
        // console.log("Ergebnis:", {
        //     kurzname: heim_k,
        //     home_id: home_id,
        //     gast_id: gast_id,
        // });


    const [tag, monat, jahr] = datum.split('.');
    const dateObjekt = new Date(`${jahr}-${monat}-${tag}T${zeit}:00`);
    const anstoss = dateObjekt.toISOString(); 

    try {
        // KORREKTUR: fetch-Aufruf komplett geschlossen und await eingebaut
        const response = await fetch('/api/spiele_aktuell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                spieltag,
                kennung,
                statuswort,
                anstoss,
                gruppen_id,    
                home_id,
                gast_id,
                tore_home,
                tore_gast
            })
        });

        if (!response.ok) throw new Error("Fehler beim Speichern auf dem Server");

        await spiele_aktuell_laden(); 
        alert("Erfolgreich angelegt!");
    } catch (error) {
        console.error("Fehler beim Speichern:", error);
        alert("Fehler beim Speichern des Spiels!");
    }
}
