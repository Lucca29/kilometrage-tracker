document.addEventListener('DOMContentLoaded', function() {
    const calendar = document.getElementById('calendar');
    let currentDate = new Date();
    const sheetsManager = new SheetsManager();
    let releves = [];
    
    async function init() {
        try {
            await sheetsManager.init();
            await loadData();
            generateCalendar(currentDate);
        } catch (error) {
            console.error('Erreur d\'initialisation:', error);
        }
    }
    
    async function loadData() {
        try {
            const response = await sheetsManager.getSheetData();
            if (response && response.result && response.result.values) {
                // Convertir les données du tableau en objets
                releves = response.result.values.slice(1).map(row => ({
                    date: row[0],
                    kilometrage: parseFloat(row[1]),
                    difference: parseFloat(row[2] || 0)
                }));
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
        }
    }
    
    function getKilometrageForDay(date) {
        const dateStr = date.toISOString().split('T')[0];
        const relevesForDay = releves.filter(r => r.date === dateStr);
        
        if (relevesForDay.length > 0) {
            // Calculer la différence de kilométrage pour ce jour
            const kilometrage = relevesForDay.reduce((total, releve) => total + (releve.difference || 0), 0);
            return kilometrage;
        }
        return null;
    }
    
    function generateCalendar(date) {
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
    init();
});
