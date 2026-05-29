console.log("✅ admin_dashboard.js geladen");
// ===============================
// Helper
// ===============================
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
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function speicherProzess() {
    $("meldung").textContent = "Spiel gespeichert";
    $("meldung").style.color = "green";

    // Jetzt funktioniert der Aufruf, da die Funktion oben definiert wurde
    await sleep(1000);

    $("meldung").textContent = "";
}






// ===============================
// INIT
// ===============================

// ===============================
document.addEventListener("DOMContentLoaded", () => {
    ladeGruppen();
    ladeVereine();
    ladeUser();
    ladeSpiele();

    // KORREKTUR: Alle Zuweisungen mit ?. abgesichert, damit fehlende HTML-Elemente das Skript nicht stoppen
    $("logoutBtn")?.addEventListener("click", logout);

    $("saveVerein")?.addEventListener("click", vereinSpeichern);
    $("deleteVerein")?.addEventListener("click", vereinLoeschen);

    $("saveGruppe")?.addEventListener("click", gruppeSpeichern);
    $("deleteGruppe")?.addEventListener("click", gruppeLoeschen);

    $("saveSpiel")?.addEventListener("click", spielSpeichern);
    $("deleteSpiel")?.addEventListener("click", spielLoeschen);
    $("saveErgebnis")?.addEventListener("click", ergebnisSpeichernUndAuswerten);
    
    // KORREKTUR: Hier fehlte das Fragezeichen vor dem Punkt!
    $("userForm")?.addEventListener("submit", userSpeichern); 
    
    // Jetzt läuft der Code sicher bis hierhin durch:
      ladeSortierGruppen(); 
    
    const addBtn = document.getElementById('gruppeHinzufuegenBtn');
    if (addBtn) {
        addBtn.addEventListener('click', dragGruppeHinzufuegen);
    }
});


// ===============================
// Logout
// ===============================
async function logout() {
    await api("/api/logout", { method: "POST" });
    location.href = "/";
}

function $(id) {
    return document.getElementById(id);
}

// Überschreibt oder erweitert Ihre bisherige ladeGruppen-Funktion
async function ladeSortierGruppen() {
    try {
        // KORREKTUR: Nutzt jetzt Ihre sichere api()-Funktion für die Abfrage
        const gruppen = await api("/api/gruppen_sort");
        console.log("Geladene Gruppen-Daten für Drag & Drop (sort):", gruppen);

        const sortListe = document.getElementById('gruppenSortierenListe');
        if (sortListe) {
            sortListe.innerHTML = '';
            gruppen.forEach(g => {
                const li = document.createElement('li');
                li.dataset.id = g.id;
                
                li.style.padding = "15px";
                li.style.border = "1px solid #ddd";
                li.style.borderRadius = "5px";
                li.style.marginBottom = "10px";
                li.style.background = "#eaeaea";
                li.style.display = "flex";
                li.style.justifyContent = "space-between";
                li.style.alignItems = "center";

                li.innerHTML = `
                    <div style="display: flex; align-items: center;">
                        <span class="handle" style="cursor: grab; margin-right: 15px; font-size: 20px; font-weight: bold;">☰</span>
                        <span style="font-family: sans-serif; font-size: 16px; font-weight: bold;">${g.gruppenname}</span>
                    </div>
                    <button class="delete-gruppe-btn" onclick="dragGruppeLoeschen(${g.id})" style="color: white; background: red; border: none; font-weight: bold; border-radius: 4px; padding: 5px 10px; cursor: pointer;">✕</button>
                `;
                sortListe.appendChild(li);
            });

            sortableAktivieren();
        }
    } catch (error) {
        console.error("Fehler beim Laden der Gruppen im Dashboard:", error);
    }
}

function sortableAktivieren() {
    const sortListe = document.getElementById('gruppenSortierenListe');
    if (!sortListe) return;

    if (typeof Sortable !== 'undefined') {
        // Zerstört eine eventuell alte Sortable-Instanz, um Klick-Dopplungen zu vermeiden
        if (sortListe.sortable) {
            sortListe.sortable.destroy();
        }

        sortListe.sortable = new Sortable(sortListe, {
            animation: 150,
            ghostClass: 'dragging', 
            handle: '.handle',      
            onEnd: function() {
                console.log("🖱️ Maus losgelassen! Neue Reihenfolge wird gespeichert...");
                gruppenReihenfolgeSpeichern();
            }
        });
        console.log("✅ SortableJS erfolgreich auf der Liste aktiviert.");
    } else {
        console.error("❌ SortableJS ist nicht geladen! Überprüfen Sie den <head> Ihrer HTML-Datei.");
    }
}

async function gruppenReihenfolgeSpeichern() {
    const sortListe = document.getElementById('gruppenSortierenListe');
    if (!sortListe) return;

    const ids = [...sortListe.children].map(el => parseInt(el.dataset.id, 10));
    console.log("Sende neue ID-Reihenfolge an Server:", ids);

    try {
        // KORREKTUR: Auf sichere api() Funktion mit POST umgestellt
        await api('/api/gruppen_sort/sortieren', {
            method: 'POST',
            body: JSON.stringify(ids)
        });

        console.log("💾 Reihenfolge erfolgreich in DB gespeichert!");
        await ladeSortierGruppen();
    } catch (error) {
        console.error("Fehler beim Speichern der Reihenfolge:", error);
        alert("Speichern der Reihenfolge fehlgeschlagen: " + error.message);
    }
}

async function dragGruppeHinzufuegen() {
    const input = document.getElementById('neuerGruppenNameInput');
    if (!input) return;
    const name = input.value.trim();

    if (!name) return;

    try {
        // KORREKTUR: Auf sichere api() Funktion umgestellt, um Admin-Rechte mitzusenden
        await api('/api/gruppen_sort', {
            method: 'POST',
            body: JSON.stringify({ name })
        });

        input.value = '';
        await ladeSortierGruppen(); 
        console.log("➕ Neue Gruppe erfolgreich hinzugefügt!");
    } catch (error) {
        console.error("Fehler beim Hinzufügen der Gruppe:", error);
        alert("Hinzufügen fehlgeschlagen: " + error.message);
    }
}

async function dragGruppeLoeschen(id) {
    if (!confirm("Möchten Sie diese Gruppe wirklich löschen?")) return;

    try {
        // KORREKTUR: Auf sichere api() Funktion mit DELETE umgestellt
        await api(`/api/gruppen_sort/${id}`, {
            method: 'DELETE'
        });

        await ladeSortierGruppen();
        console.log("🗑️ Gruppe erfolgreich gelöscht!");
    } catch (error) {
        console.error("Fehler beim Löschen der Gruppe:", error);
        alert("Löschen fehlgeschlagen: " + error.message);
    }
}

// ===============================
// Gruppen
// ===============================

async function ladeGruppen() {
    const gruppen = await api("/api/gruppen");
    $("allegruppen").innerHTML = "";
    const datalist = $("gruppenliste");
    datalist.innerHTML = "";

    gruppen.forEach(g => {
        $("allegruppen").appendChild(new Option(g.gruppenname, g.id));
        $("gruppeSelect").appendChild(new Option(g.gruppenname, g.id));    
    });

    gruppen.forEach(g => {
        const option = document.createElement("option");
        option.value = g.gruppenname;   // angezeigter Text
        option.dataset.id = g.id;       // Gruppen-ID speichern
        datalist.appendChild(option);
    });
}



async function gruppeSpeichern() {
    // alert("Gruppe speichern: " + $("gruppeInput").value); 
       const name = $("gruppeInput").value.trim();
    if (!name) return alert("Name fehlt"); 
    alert("Speichere Gruppe: " + name); 
    await api("/api/gruppen", {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
         body: JSON.stringify({ gruppenname: name })
    });
    // alert("✅ Gruppe gespeichert");
    $("gruppeInput").value = "";
    ladeGruppen();
}

function getGruppeId(inputId) {
    const value = $(inputId).value;
    const option = [...$("gruppenliste").options]
        .find(o => o.value === value);
    return option ? option.dataset.id : null;
}

async function gruppeLoeschen() {
    // const id = $("gruppenSelect").value;
    const id = getGruppeId("gruppenSelect");
    const name = $("gruppenSelect").value;
    alert(`Lösche Gruppe "${name}" (ID: ${id})`);
//   console.log("Lösche Gruppe mit ID:", id);
    if (!id) return; 
    await api(`/api/gruppen/${id}`, { method: "DELETE" });
    ladeGruppen();       
}








async function vereinSpeichern() {
    const name = $("vereinInput").value.trim();
    const logo = $("logoInput").value.trim();
    if (!name) return alert("Name fehlt");

    await api("/api/vereine", {
        method: "POST",
         body: JSON.stringify({ vereinsname: name, url: logo })
    });
    alert("✅ Verein gespeichert");
    $("vereinInput").value = "";
    $("logoInput").value = "";
    ladeVereine();
}

function getHeimId(inputId) {
    const value = $(inputId).value;
    const option = [...$("heimselect").options]
        .find(o => o.value === value);
    return option ? option.dataset.id : null;
}
 
function getGastId(inputId) {
    const value = $(inputId).value;
    const option = [...$("gastselect").options]
        .find(o => o.value === value);
    return option ? option.dataset.id : null;
}


async function ladeVereine() {
    const vereine = await api("/api/vereine");

    const datalist = $("vereineList");
    datalist.innerHTML = "";

    vereine.forEach(v => {
        const option = document.createElement("option");
        option.value = v.vereinsname;   // angezeigter Text
        option.dataset.id = v.id;       // Vereins-ID speichern
        datalist.appendChild(option);
    });


        $("allevereine").innerHTML = "";
    vereine.forEach(v => {
        $("allevereine").appendChild(new Option(v.vereinsname, v.id));
    });
}

function getVereinId(inputId) {
    const value = $(inputId).value;
    const option = [...$("vereineList").options]
        .find(o => o.value === value);
    return option ? option.dataset.id : null;
}

async function vereinLoeschen() {
    // const id = $("gruppenSelect").value;
    const id = getVereinId("vereineselect");
    const name = $("vereineselect").value;
    alert(`Lösche Verein "${name}" (ID: ${id})`);
//   console.log("Lösche Verein mit ID:", id);
    if (!id) return; 
    await api(`/api/vereine/${id}`, { method: "DELETE" });
    ladeVereine();       
}


// ===============================
// Spiele
// ===============================
async function ladeSpiele() {
    const spiele = await api('/api/spiele');
    console.log("👂 /api/spiele - Spiele:", spiele);
    $("spieleSelect").innerHTML = "";
    spiele.forEach(s => {
    const text = `
    ${s.spielgruppe}:
    ${new Date(s.anstoss).toLocaleString("de-DE", {dateStyle: "short",timeStyle: "short",})}
     ${s.heimverein} : ${s.gastverein}, (${s.statuswort})

    `;
    $("spieleSelect").appendChild(new Option(text, s.id));
    });
}


async function spielSpeichern() {

    const heimName = $("heimInput").value;
    const gastName = $("gastInput").value;
    const gruppeName = $("gruppeSelect").selectedOptions[0]?.text;
    const gruppeId = $("gruppeSelect").value;
    const anstoss = $("anstosszeitInput").value;

    if (!heimName || !gastName) {
        return alert("Bitte Heim- und Gastverein wählen");
    }

    if (heimName === gastName) {
        return alert("Heim- und Gastverein dürfen nicht identisch sein");
    }

    // Vereine laden
    const vereine = await api("/api/vereine");

    const heimVerein = vereine.find(v => v.vereinsname === heimName);
    const gastVerein = vereine.find(v => v.vereinsname === gastName);

    if (!heimVerein || !gastVerein) {
        return alert("Verein nicht in der Liste gefunden");
    }

    const heimbild = heimVerein.url;
    const gastbild = gastVerein.url;

   
    
console.log({
    spielgruppe: gruppeName,
    anstoss,
    heimverein: heimName,
    gastverein: gastName,
    heimbild,
    gastbild
});


    await api("/api/spiele", {
        method: "POST",
        body: JSON.stringify({
            spielgruppe: gruppeName,
            anstoss,
            heimverein: heimName,
            gastverein: gastName,
            heimbild,
            gastbild,
            heimtore: 0,
            gasttore: 0,
            statuswort: "geplant"
        })
    });

    alert(`Spiel angelegt:\n${heimName} vs ${gastName}`);
    ladeSpiele();
}



async function spielLoeschen() {
    const id = $("spieleSelect").value;
    if (!id) return;
    console.log("Lösche Spiel mit ID:", id);
    await api(`/api/spiele/${id}`, { method: "DELETE" });
    ladeSpiele();
}

async function ergebnisSpeichernUndAuswerten() {
    const id = $("spieleSelect").value;
    if (!id) return alert("Spiel wählen");

    const heimtore = Number($("heimtoreInput").value);
    const gasttore = Number($("gasttoreInput").value);

    try {
        const res = await api(`/api/spiele/${id}/ergebnis`, {
            method: "PATCH",
            body: JSON.stringify({ heimtore, gasttore })
        });

        alert("✅ Ergebnis gespeichert & Punkte berechnet");
        ladeSpiele();

    } catch (err) {
        alert("❌ Fehler bei der Auswertung");
        console.error(err);
    }
}



/// ===============================
// Benutzerverwaltung
// ===============================
async function ladeUser() {
    try {
        const res = await fetch("/api/users", {
            credentials: "include"
        });

        if (!res.ok) {
            throw new Error("User laden fehlgeschlagen");
        }

        const users = await res.json();

        const tbody = $("userTable");
        tbody.innerHTML = "";

        users.forEach(u => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${u.name}</td>
                <td>${u.role}</td>
                <td>
                    <button class="editBtn">Bearbeiten</button>
                    <button class="deleteBtn">Löschen</button>
                </td>
            `;

            // ✏️ Bearbeiten
            tr.querySelector(".editBtn").addEventListener("click", () => {
                userBearbeiten(u);
            });

            // 🗑️ Löschen
            tr.querySelector(".deleteBtn").addEventListener("click", async () => {
                if (!confirm(`User ${u.name} löschen?`)) return;

                const delRes = await fetch(`/api/users/${u.id}`, {
                    method: "DELETE",
                    credentials: "include"
                });

                if (!delRes.ok) {
                    alert("Fehler beim Löschen");
                    return;
                }

                ladeUser();
            });

            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("❌ ladeUser:", err);
        alert("Benutzer konnten nicht geladen werden");
    }
}

async function userAnlegen(e) {
    e.preventDefault();

    const name = $("userName").value.trim();
    const password = $("userPassword").value;
    const role = $("userRole").value;

    if (!name || !password) {
        return alert("Name und Passwort erforderlich");
    }

    const res = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password, role })
    });

    if (!res.ok) {
        const t = await res.text();
        alert("Fehler: " + t);
        return;
    }

    $("userForm").reset();
    ladeUser();
}

function userFormReset() {
    $("userForm").reset();
    $("userId").value = "";
}

function userBearbeiten(u) {
    $("userId").value = u.id;
    $("userName").value = u.name;
    $("userRole").value = u.role;

    $("userPassword").value = ""; // wichtig!
}

async function userAendern(e) {
    e.preventDefault();

    const id = $("userId").value;        // wichtig: bestehende ID
    const name = $("userName").value.trim();
    const password = $("userPassword").value;

    if (!id || !name) {
        return alert("ID und Name erforderlich");
    }

    const res = await fetch(`/api/users/${id}`, {
        method: "PUT", // oder "PATCH" je nach API
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password })
    });

    if (!res.ok) {
        const t = await res.text();
        alert("Fehler: " + t);
        return;
    }

    $("userForm").reset();
    ladeUser();
}

async function userSpeichern(e) {
    e.preventDefault();

    const id = $("userId").value;
    const name = $("userName").value.trim();
    const password = $("userPassword").value;
    const role = $("userRole").value;

    if (!name) {
        return alert("Name erforderlich");
    }

    const body = {
        name,
        role,
        password // ⚠️ wird bewusst IMMER überschrieben
    };

    const url = id ? `/api/users/${id}` : "/api/users";
    const method = id ? "PUT" : "POST";

    const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const t = await res.text();
        alert("Fehler: " + t);
        return;
    }

    userFormReset();
    ladeUser();
}





async function ladeRangliste() {
    const daten = await api("/api/rangliste");

    const tbody = $("ranglisteBody");
    tbody.innerHTML = "";

    daten.forEach((u, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td>${u.name}</td>
                <td>tips ${u.punkte}</td>

            </tr>
        `;
    });
}
