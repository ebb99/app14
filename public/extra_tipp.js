// Aktueller Benutzer (wird in einer echten App via Session/Auth gesetzt)
const CURRENT_USER = "MeinEigenerUsername"; 
const DEADLINE = new Date("2026-06-10T23:59:59");

document.addEventListener("DOMContentLoaded", () => {
    checkDeadline();
    loadTipps();
    
    document.getElementById("tipp-form").addEventListener("submit", saveTipp);
});

async function fetchCurrentUser() {
    try {
        // Übergibt "tipper" als erforderliche Rolle an Ihre Funktion
        const user = await checkSession("tipper");
        current_user = user.username;
    } catch (err) {
        // Fängt "Session-Fehler", "Nicht eingeloggt" und "Keine Berechtigung" ab
        showError(`Zugriff verweigert: ${err.message}`);
        disableForm();
        
        // Versteckt das Formular komplett bei fehlender Berechtigung
        const formContainer = document.getElementById("tipp-form-container");
        if (formContainer) formContainer.style.display = "none";
    }
}


function checkDeadline() {
    const jetzt = new Date();
    const msgEl = document.getElementById("deadline-msg");
    
    if (jetzt > DEADLINE) {
        msgEl.innerHTML = "🔒 <strong>Die Abgabefrist (10.06.2026) ist abgelaufen.</strong> Tipps können nicht mehr geändert werden.";
        disableForm();
        return true;
    } else {
        msgEl.innerHTML = "⏳ Abgabe möglich bis zum 10.06.2026.";
        return false;
    }
}

function disableForm() {
    document.getElementById("weltmeister").disabled = true;
    document.getElementById("torschuetzenkoenig").disabled = true;
    document.getElementById("submit-btn").disabled = true;
}

// Eigenen Tipp und alle Tipps laden
async function loadTipps() {
    try {
        const response = await fetch('/api/extratip');
        const daten = await response.json();
        
        const tabelle = document.getElementById("tipps-tabelle");
        tabelle.innerHTML = "";
        
        daten.forEach(tipp => {
            const row = document.createElement("tr");
            
            // Wenn es nicht der aktuelle User ist, Zeige die Zeile ausgegraut an
            if (tipp.username !== CURRENT_USER) {
                row.classList.add("disabled-view");
            } else {
                // Eigenen geladenen Tipp in die Input-Felder eintragen
                if (new Date() <= DEADLINE) {
                    document.getElementById("weltmeister").value = tipp.weltmeister;
                    document.getElementById("torschuetzenkoenig").value = tipp.torschuetzenkoenig;
                }
            }
            
            row.innerHTML = `
                <td><strong>${tipp.username}</strong> ${tipp.username === CURRENT_USER ? '(Du)' : ''}</td>
                <td>${tipp.weltmeister}</td>
                <td>${tipp.torschuetzenkoenig}</td>
            `;
            tabelle.appendChild(row);
        });
    } catch (err) {
        showError("Fehler beim Laden der Daten.");
    }
}

// Tipp absenden oder aktualisieren
async function saveTipp(e) {
    e.preventDefault();
    if (checkDeadline()) return;

    const weltmeister = document.getElementById("weltmeister").value.trim();
    const torschuetzenkoenig = document.getElementById("torschuetzenkoenig").value.trim();

    try {
        const response = await fetch('/api/extratip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: CURRENT_USER, // In Produktion serverseitig via Session lösen!
                weltmeister,
                torschuetzenkoenig
            })
        });

        const result = await response.json();
        if (response.ok) {
            alert("Tipp erfolgreich gespeichert!");
            loadTipps();
        } else {
            showError(result.error);
        }
    } catch (err) {
        showError("Server-Verbindungsfehler.");
    }
}

function showError(text) {
    document.getElementById("error-message").innerText = text;
}