// Initialisation de l'API Google Sheets
let gapiInited = false;
let gisInited = false;
let tokenClient;

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        maybeEnableButtons();
    } catch (err) {
        console.error('Erreur lors de l\'initialisation de GAPI client:', err);
    }
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // défini plus tard
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('calendar').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const calendar = document.getElementById('calendar');
    let currentDate = new Date();
    const sheetsManager = new SheetsManager();
    let releves = [];
    
    async function init() {
        try {
            console.log('Initialisation du calendrier...');
            await sheetsManager.init();
            console.log('SheetsManager initialisé');
            await loadData();
            console.log('Données chargées:', releves);
            generateCalendar(currentDate);
            // Afficher le calendrier une fois les données chargées
            calendar.style.display = 'block';
        } catch (error) {
            console.error('Erreur d\'initialisation:', error);
        }
    }
    
    async function loadData() {
        try {
            console.log('Chargement des données...');
            const response = await sheetsManager.getAllKilometrageData();
            console.log('Réponse de getAllKilometrageData:', response);
            if (response && response.length > 0) {
                // Convertir les données du tableau en objets
                releves = response.slice(1).map(row => {
                    const [dateStr, kilometrage] = row;
                    // Convertir la date du format "DD/MM/YYYY" en "YYYY-MM-DD"
                    const [day, month, year] = dateStr.split('/');
                    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    
                    const obj = {
                        date: date,
                        kilometrage: parseFloat(kilometrage),
                        difference: parseFloat(kilometrage)
                    };
                    console.log('Relevé traité:', obj);
                    return obj;
                });
            } else {
                console.warn('Pas de données dans la réponse:', response);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
        }
    }
    
    function getKilometrageForDay(date) {
        const dateStr = date.toISOString().split('T')[0];
        console.log('Recherche des relevés pour la date:', dateStr);
        const relevesForDay = releves.filter(r => r.date === dateStr);
        console.log('Relevés trouvés:', relevesForDay);
        
        if (relevesForDay.length > 0) {
            // Calculer la différence de kilométrage pour ce jour
            const kilometrage = relevesForDay.reduce((total, releve) => total + (releve.difference || 0), 0);
            console.log('Kilométrage calculé:', kilometrage);
            return kilometrage;
        }
        return null;
    }
    
    function generateCalendar(date) {
        console.log('Génération du calendrier pour:', date);
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <button class="btn btn-outline-primary" onclick="prevMonth()">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <h3 class="mb-0">${monthNames[month]} ${year}</h3>
                <button class="btn btn-outline-primary" onclick="nextMonth()">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Dim</th>
                        <th>Lun</th>
                        <th>Mar</th>
                        <th>Mer</th>
                        <th>Jeu</th>
                        <th>Ven</th>
                        <th>Sam</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        let day = 1;
        const rows = Math.ceil((daysInMonth + startingDay) / 7);
        
        for (let i = 0; i < rows; i++) {
            html += '<tr>';
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < startingDay) {
                    html += '<td></td>';
                } else if (day <= daysInMonth) {
                    const currentDay = new Date(year, month, day);
                    const kilometrage = getKilometrageForDay(currentDay);
                    console.log(`Jour ${day}:`, kilometrage);
                    
                    html += `<td class="position-relative" style="height: 100px;">
                        <span class="position-absolute top-0 start-0 p-2">${day}</span>
                        <div class="text-center mt-4" id="day-${day}">
                            ${kilometrage !== null ? 
                                `<span class="badge bg-success">${kilometrage} km</span>` : 
                                ''}
                        </div>
                    </td>`;
                    day++;
                } else {
                    html += '<td></td>';
                }
            }
            html += '</tr>';
        }
        
        html += '</tbody></table>';
        calendar.innerHTML = html;
    }
    
    window.prevMonth = async function() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        await loadData();
        generateCalendar(currentDate);
    };
    
    window.nextMonth = async function() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        await loadData();
        generateCalendar(currentDate);
    };
    
    // Démarrer l'initialisation
    gapiLoaded();
    gisLoaded();
    init();
});
