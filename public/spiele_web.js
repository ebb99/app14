document.addEventListener("DOMContentLoaded", () => {
    spiele_web_laden();
    ladeGruppen();
});

async function ladeGruppen() {
    try {
        const response = await fetch("/api/gruppen_sort");
        
        if (!response.ok) {
            throw new Error(`Fehler: ${response.status} ${response.statusText}`);
        }

        // 1. Daten als JSON parsen
        const gruppen = await response.json(); 
        console.log("Geladene Gruppen-Daten:", gruppen);

        // 2. Element mit exakt der richtigen ID holen (kleines l)
        const datalist = document.getElementById('gruppenliste'); 
        
        // Datalist leeren
        datalist.innerHTML = "";

        // 3. Nur EINE Schleife für das Befüllen nutzen
        gruppen.forEach(g => {
            const option = document.createElement("option");
            option.value = g.gruppenname;   // Sichtbarer Text im Dropdown
            option.dataset.id = g.id;       // Versteckte ID speichern
            datalist.appendChild(option);
        });




    } catch (error) {
        console.error("Fehler beim Laden:", error);
    }
    const gruppenSelect = document.getElementById('gruppenSelect');
const datalist = document.getElementById('gruppenliste');

gruppenSelect.addEventListener('input', () => {
    const eingabeWert = gruppenSelect.value;
    
    // Suche die Option in der Datalist, die zum eingegebenen Namen passt
    const passendeOption = Array.from(datalist.options).find(
        option => option.value === eingabeWert
    );

    if (passendeOption) {
        // ID erfolgreich gefunden!
        const ausgewaehlteId = passendeOption.dataset.id;
        console.log("Ausgewählte Gruppen-ID:", ausgewaehlteId);
        
        // Hier können Sie die ID weiterverarbeiten (z. B. in einer globalen Variable speichern)
    } else {
        // Der Text passt zu keiner Gruppe (Nutzer tippt noch oder hat Text gelöscht)
        console.log("Keine gültige Gruppe ausgewählt");
    }
});

}





// Spiele laden

async function spiele_web_laden() {
    try {
        const response = await fetch('/api/spiele_web');

        if (!response.ok) {
            throw new Error(`Server-Fehler: ${response.status}`);
        }

        const spiele = await response.json();
        console.log("Geladene Spiele:", spiele);

        // KORREKTUR: Jetzt greifen wir auf den Table-Body zu
        const tableBody = document.getElementById('SpieleTableBody');
        
        if (!tableBody) {
            console.error("Fehler: Das HTML-Element mit der ID 'SpieleTableBody' wurde nicht gefunden!");
            return; 
        }

        tableBody.innerHTML = '';

        spiele.forEach(spiel => {
            // Zeile erstellen
            const tr = document.createElement('tr');
            tr.dataset.id = spiel.id;

            // Spalten (Zellen) befüllen
            tr.innerHTML = `
                <td>${spiel.spieltag}</td>
                <td>${spiel.kennung}</td>
                <td>${spiel.score}</td>
                <td>
                    <button class="delete" onclick="zur_planung(${spiel.id})">zur Planung</button>
                </td>
                 <td>
                    <button class="delete" onclick="ergebniss(${spiel.id})">Ergebniss übernehmen</button>
                </td>
                       
            `;

            tableBody.appendChild(tr);
        });

    } catch (error) {
        console.error("Frontend-Fehler beim Laden:", error);
    }
}

