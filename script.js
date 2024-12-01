// Constantes
const OBJECTIF_ANNUEL = 20000;
const OBJECTIF_MENSUEL = OBJECTIF_ANNUEL / 12; // 1666.66 km par mois
const STORAGE_KEY = 'kilometrage_releves';
const DATE_DEBUT = new Date('2024-11-28');
const DATE_FIN = new Date('2025-11-28');

// Variables globales
let kmChart;
let releves = [];
let totalKm = 0;
let totalMoisCourant = 0;
let moisSelectionne = getMoisCourant();
let vueAnnuelle = false;

// Initialisation du gestionnaire Google Sheets
const sheetsManager = new SheetsManager();

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Application démarrée');
    
    // Initialiser Google Sheets
    try {
        await sheetsManager.init();
        console.log('Google Sheets initialisé');
    } catch (error) {
        console.error('Erreur d\'initialisation Google Sheets:', error);
    }
    
    // Charger les données sauvegardées
    chargerDonnees();
    
    // Initialiser le graphique
    initialiserGraphique();
    
    // Définir la date d'aujourd'hui comme valeur par défaut
    document.getElementById('dateInput').valueAsDate = new Date();
    
    // Initialiser le sélecteur de mois
    initialiserNavigationMois();
    
    // Ajouter l'entrée du 27 novembre
    ajouterReleve27Novembre();
    
    // Ajouter l'écouteur d'événements pour le formulaire
    document.getElementById('kmForm').addEventListener('submit', (e) => {
        e.preventDefault();
        ajouterReleve();
    });

    // Ajouter l'écouteur d'événements pour le bouton de réinitialisation
    document.getElementById('resetButton').addEventListener('click', () => {
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmationModal'));
        modal.show();
    });

    // Ajouter l'écouteur d'événements pour la confirmation de réinitialisation
    document.getElementById('confirmReset').addEventListener('click', () => {
        // Filtrer les relevés pour garder uniquement ceux des autres mois
        releves = releves.filter(releve => {
            const moisReleve = `${releve.date.getFullYear()}-${(releve.date.getMonth() + 1).toString().padStart(2, '0')}`;
            return moisReleve !== moisSelectionne;
        });

        // Sauvegarder les données mises à jour
        sauvegarderDonnees();

        // Mettre à jour l'interface
        mettreAJourInterface();

        // Fermer le modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
        modal.hide();

        // Afficher un message de confirmation
        const messageConfirmation = document.getElementById('messageConfirmation');
        messageConfirmation.textContent = `Les relevés du mois ${moisSelectionne} ont été réinitialisés.`;
        messageConfirmation.style.display = 'block';
        setTimeout(() => {
            messageConfirmation.style.display = 'none';
        }, 3000);
    });

    // Ajouter l'écouteur d'événements pour le bouton de vue annuelle
    document.getElementById('viewYearButton').addEventListener('click', basculerVueAnnuelle);

    // Initialisation des éléments UI
    const addDataBtn = document.getElementById('addDataBtn');
    const refreshDataBtn = document.getElementById('refreshDataBtn');

    // Fonction pour actualiser les données
    async function refreshData() {
        console.log('Début de refreshData');
        try {
            refreshDataBtn.disabled = true;
            refreshDataBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i> Actualisation...';
            
            const data = await sheetsManager.getKilometrageData();
            
            if (data && data.length > 0) {
                // Convertir les données avec la date en objet Date
                const formattedData = data.map(row => {
                    // Convertir la date (format "dd/mm/yyyy") en objet Date
                    const [day, month, year] = row[0].split('/').map(Number);
                    return {
                        date: new Date(year, month - 1, day), // month - 1 car les mois commencent à 0
                        kilometrage: parseFloat(row[1])
                    };
                });
                
                // Mettre à jour les données globales
                releves = formattedData;
                
                // Mettre à jour l'interface
                mettreAJourInterface();
            }
            
            refreshDataBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i> Actualiser';
            refreshDataBtn.disabled = false;
        } catch (error) {
            console.error('Erreur détaillée lors de l\'actualisation:', {
                message: error.message,
                stack: error.stack,
                error: error
            });
            alert('Erreur lors de l\'actualisation des données');
            refreshDataBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i> Actualiser';
            refreshDataBtn.disabled = false;
        }
    }

    // Ajouter l'écouteur d'événement pour le bouton d'actualisation
    refreshDataBtn.addEventListener('click', refreshData);

    // Mettre à jour l'interface initiale
    mettreAJourInterface();
});

function initialiserNavigationMois() {
    const monthSelector = document.getElementById('monthSelector');
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');

    // Définir le mois actuel comme sélectionné
    monthSelector.value = moisSelectionne;

    // Gestionnaire d'événements pour le sélecteur de mois
    monthSelector.addEventListener('change', (e) => {
        moisSelectionne = e.target.value;
        totalMoisCourant = calculerTotalMoisCourant();
        mettreAJourInterface();
    });

    // Gestionnaires d'événements pour les boutons de navigation
    prevMonth.addEventListener('click', () => {
        const index = monthSelector.selectedIndex;
        if (index > 0) {
            monthSelector.selectedIndex = index - 1;
            moisSelectionne = monthSelector.value;
            totalMoisCourant = calculerTotalMoisCourant();
            mettreAJourInterface();
        }
    });

    nextMonth.addEventListener('click', () => {
        const index = monthSelector.selectedIndex;
        if (index < monthSelector.options.length - 1) {
            monthSelector.selectedIndex = index + 1;
            moisSelectionne = monthSelector.value;
            totalMoisCourant = calculerTotalMoisCourant();
            mettreAJourInterface();
        }
    });

    // Limiter les dates possibles dans le datepicker
    const dateInput = document.getElementById('dateInput');
    dateInput.min = DATE_DEBUT.toISOString().split('T')[0];
    dateInput.max = DATE_FIN.toISOString().split('T')[0];
}

function getMoisCourant() {
    const date = new Date();
    // Si la date actuelle est avant la date de début, retourner le premier mois
    if (date < DATE_DEBUT) {
        return '2024-11';
    }
    // Si la date actuelle est après la date de fin, retourner le dernier mois
    if (date > DATE_FIN) {
        return '2025-11';
    }
    // Sinon, retourner le mois actuel
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function calculerTotalMoisCourant() {
    return releves
        .filter(releve => {
            const moisReleve = `${releve.date.getFullYear()}-${(releve.date.getMonth() + 1).toString().padStart(2, '0')}`;
            return moisReleve === moisSelectionne;
        })
        .reduce((sum, releve) => sum + releve.kilometrage, 0);
}

function calculerObjectifMensuel(mois) {
    // Cas spécial pour novembre 2024 (3 jours)
    if (mois === '2024-11') {
        return (OBJECTIF_MENSUEL / 30) * 3; // 3 jours sur 30
    }
    
    // Cas spécial pour novembre 2025 (28 jours)
    if (mois === '2025-11') {
        return (OBJECTIF_MENSUEL / 30) * 28; // 28 jours sur 30
    }
    
    // Pour les autres mois, retourner l'objectif mensuel normal
    return OBJECTIF_MENSUEL;
}

// Fonctions de gestion des données
function chargerDonnees() {
    const donneesStockees = localStorage.getItem(STORAGE_KEY);
    if (donneesStockees) {
        try {
            const donneesParsees = JSON.parse(donneesStockees);
            releves = donneesParsees.map(releve => {
                // Si la date est une chaîne au format dd/mm/yyyy
                if (typeof releve.date === 'string' && releve.date.includes('/')) {
                    const [day, month, year] = releve.date.split('/').map(Number);
                    return {
                        date: new Date(year, month - 1, day),
                        kilometrage: parseFloat(releve.kilometrage)
                    };
                }
                // Si c'est déjà un objet Date (stocké comme chaîne ISO)
                return {
                    date: new Date(releve.date),
                    kilometrage: parseFloat(releve.kilometrage)
                };
            });
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            releves = [];
        }
    } else {
        releves = [];
    }
}

function sauvegarderDonnees() {
    // Convertir les dates en chaînes avant la sauvegarde
    const relevesASauvegarder = releves.map(releve => ({
        ...releve,
        date: releve.date.toISOString()
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(relevesASauvegarder));
    console.log('Données sauvegardées:', relevesASauvegarder);
}

async function ajouterReleve() {
    const kmInput = document.getElementById('kmInput');
    const dateInput = document.getElementById('dateInput');
    
    const kilometrage = parseFloat(kmInput.value);
    const dateStr = dateInput.value;
    
    if (isNaN(kilometrage) || !dateStr) {
        alert('Veuillez remplir tous les champs correctement');
        return;
    }
    
    try {
        // Créer un objet Date à partir de la chaîne de date
        const date = new Date(dateStr);
        
        // Vérifier si la date est valide
        if (isNaN(date.getTime())) {
            throw new Error('Date invalide');
        }
        
        // Ajouter le relevé à la liste
        const releve = {
            date: date,
            kilometrage: kilometrage
        };
        
        releves.push(releve);
        
        // Trier les relevés par date
        releves.sort((a, b) => a.date - b.date);
        
        // Sauvegarder les données localement
        sauvegarderDonnees();
        
        // Synchroniser avec Google Sheets
        await sheetsManager.appendKilometrageData(dateStr, kilometrage)
            .then(() => {
                console.log('Données synchronisées avec Google Sheets');
                // Réinitialiser les champs
                kmInput.value = '';
                dateInput.value = '';
                // Mettre à jour l'interface
                mettreAJourInterface();
                // Afficher un message de succès
                afficherMessage('Relevé ajouté et synchronisé avec succès !', 'success');
            })
            .catch(error => {
                console.error('Erreur lors de la synchronisation:', error);
                afficherMessage('Relevé sauvegardé localement mais erreur de synchronisation', 'warning');
                // Mettre quand même à jour l'interface
                mettreAJourInterface();
            });
    } catch (error) {
        console.error('Erreur:', error);
        afficherMessage('Erreur lors de l\'ajout du relevé: ' + error.message, 'danger');
    }
}

function afficherMessage(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-fermeture après 5 secondes
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function initialiserGraphique() {
    const ctx = document.getElementById('kmChart').getContext('2d');
    kmChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Kilomètres parcourus',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'Objectif mensuel',
                    data: [],
                    borderColor: 'rgba(255, 99, 132, 0.5)',
                    borderDash: [5, 5],
                    fill: false
                },
                {
                    label: 'Prévision',
                    data: [],
                    borderColor: 'rgba(75, 192, 192, 0.5)',
                    borderDash: [5, 5],
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Kilomètres'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

function mettreAJourGraphique() {
    if (releves.length === 0) {
        console.log('Pas de relevés pour le graphique');
        return;
    }
    
    // Filtrer les relevés du mois sélectionné
    const relevesMois = releves.filter(releve => {
        const moisReleve = `${releve.date.getFullYear()}-${(releve.date.getMonth() + 1).toString().padStart(2, '0')}`;
        return moisReleve === moisSelectionne;
    });
    
    // Trier par date
    relevesMois.sort((a, b) => a.date - b.date);
    
    // Calculer les totaux cumulés pour le mois
    let totalCumule = 0;
    const donneesCumulees = relevesMois.map(releve => {
        totalCumule += releve.kilometrage;
        return totalCumule;
    });
    
    const labels = relevesMois.map(r => r.date.toLocaleDateString());
    
    // Créer la ligne d'objectif avec l'objectif mensuel ajusté
    const objectifMensuelAjuste = calculerObjectifMensuel(moisSelectionne);
    const objectifMensuel = Array(labels.length).fill(objectifMensuelAjuste);

    // Calculer la prévision
    if (relevesMois.length > 0) {
        // Obtenir le dernier jour du mois
        const [annee, mois] = moisSelectionne.split('-').map(Number);
        const dernierJourMois = new Date(annee, mois, 0).getDate();
        const dernierReleve = new Date(Math.max(...relevesMois.map(r => r.date)));
        
        // Pour novembre 2024, s'arrêter au 30
        let dateFin;
        if (moisSelectionne === '2024-11') {
            dateFin = new Date(2024, 10, 30); // Mois 10 = novembre (0-based)
        } else {
            dateFin = new Date(annee, mois - 1, dernierJourMois);
        }
        
        if (dateFin > dernierReleve) {
            const joursRestants = Math.ceil((dateFin - dernierReleve) / (1000 * 60 * 60 * 24));
            const moyenneJournaliere = totalCumule / relevesMois.length;
            
            labels.push(dateFin.toLocaleDateString());
            totalCumule += moyenneJournaliere * joursRestants;
            donneesCumulees.push(totalCumule);
            objectifMensuel.push(objectifMensuelAjuste);
        }
    }
    
    // Mettre à jour le graphique
    kmChart.data.labels = labels;
    kmChart.data.datasets[0].data = donneesCumulees.slice(0, relevesMois.length);
    kmChart.data.datasets[1].data = objectifMensuel;
    kmChart.data.datasets[2].data = donneesCumulees;
    kmChart.update();
}

function afficherStatistiquesAnnuelles() {
    vueAnnuelle = true;
    
    // Mettre à jour le titre de la progression
    document.querySelector('.card-title').textContent = 'Progression Annuelle';
    
    // Calculer le total annuel
    const totalAnnuel = releves.reduce((sum, releve) => sum + releve.kilometrage, 0);
    
    // Mettre à jour la barre de progression
    const pourcentageProgression = (totalAnnuel / OBJECTIF_ANNUEL) * 100;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = Math.min(100, pourcentageProgression) + '%';
    
    // Changer la couleur de la barre en fonction de la progression
    if (pourcentageProgression > 100) {
        progressBar.classList.remove('bg-warning');
        progressBar.classList.add('bg-danger');
    } else if (pourcentageProgression > 90) {
        progressBar.classList.remove('bg-danger');
        progressBar.classList.add('bg-warning');
    } else {
        progressBar.classList.remove('bg-warning', 'bg-danger');
    }
    
    // Mettre à jour l'affichage du kilométrage
    document.getElementById('currentKm').textContent = totalAnnuel.toFixed(1);
    document.getElementById('kilometrageInfo').innerHTML = `<span id="currentKm">${totalAnnuel.toFixed(1)}</span> / ${OBJECTIF_ANNUEL} km`;
    
    // Calculer les statistiques annuelles
    if (releves.length === 0) {
        document.getElementById('moyenneJour').textContent = '0 km/jour';
        document.getElementById('previsionMois').textContent = '0 km';
        document.getElementById('projectionAnnuelle').textContent = '0 km';
        document.getElementById('statut').textContent = 'Pas de données';
        return;
    }
    
    // Calculer la moyenne journalière sur toute l'année
    const premierReleve = new Date(Math.min(...releves.map(r => r.date)));
    const dernierReleve = new Date(Math.max(...releves.map(r => r.date)));
    const joursEcoules = Math.max(1, Math.ceil((dernierReleve - premierReleve) / (1000 * 60 * 60 * 24))) + 1;
    const moyenneJournaliere = totalAnnuel / joursEcoules;
    
    // Calculer la projection annuelle
    const maintenant = new Date();
    const joursRestants = Math.ceil((DATE_FIN - maintenant) / (1000 * 60 * 60 * 24));
    const projectionAnnuelle = totalAnnuel + (moyenneJournaliere * joursRestants);
    
    // Mettre à jour l'affichage des statistiques
    document.getElementById('moyenneJour').textContent = `${moyenneJournaliere.toFixed(1)} km/jour`;
    document.getElementById('previsionMois').textContent = 'N/A (vue annuelle)';
    document.getElementById('projectionAnnuelle').textContent = `${projectionAnnuelle.toFixed(0)} km`;
    
    // Mettre à jour le statut
    let statut = 'Dans les objectifs';
    const pourcentageObjectif = (projectionAnnuelle / OBJECTIF_ANNUEL) * 100;
    
    if (pourcentageObjectif < 90) {
        statut = 'En dessous des objectifs';
    } else if (pourcentageObjectif > 110) {
        statut = 'Au-dessus des objectifs';
    }
    
    document.getElementById('statut').textContent = statut;
    
    // Mettre à jour le graphique avec les données annuelles
    mettreAJourGraphiqueAnnuel();
}

function mettreAJourGraphiqueAnnuel() {
    if (releves.length === 0) return;
    
    // Trier les relevés par date
    const relevesTries = [...releves].sort((a, b) => a.date - b.date);
    
    // Calculer les totaux cumulés
    let totalCumule = 0;
    const donneesCumulees = relevesTries.map(releve => {
        totalCumule += releve.kilometrage;
        return totalCumule;
    });
    
    const labels = relevesTries.map(r => r.date.toLocaleDateString());
    
    // Créer la ligne d'objectif
    const objectifJournalier = OBJECTIF_ANNUEL / 365;
    const objectifCumule = labels.map((_, index) => objectifJournalier * (index + 1));
    
    // Mettre à jour le graphique
    kmChart.data.labels = labels;
    kmChart.data.datasets[0].data = donneesCumulees;
    kmChart.data.datasets[1].data = objectifCumule;
    kmChart.data.datasets[2].data = []; // Pas de prévision en vue annuelle
    kmChart.update();
}

function mettreAJourProgression() {
    const progressBar = document.getElementById('progressBar');
    const currentKm = document.getElementById('currentKm');
    
    // Calculer la progression annuelle
    const progressionAnnuelle = (totalKm / OBJECTIF_ANNUEL) * 100;
    progressBar.style.width = `${Math.min(progressionAnnuelle, 100)}%`;
    progressBar.className = `progress-bar ${progressionAnnuelle > 100 ? 'bg-danger' : 'bg-primary'}`;
    
    // Afficher le total annuel et mensuel
    currentKm.innerHTML = `${totalKm.toLocaleString()} km (${totalMoisCourant.toLocaleString()} km ce mois-ci)`;
}

function mettreAJourStatistiques() {
    if (vueAnnuelle) return;

    if (releves.length === 0) {
        document.getElementById('moyenneJour').textContent = '0 km/jour';
        document.getElementById('projectionAnnuelle').textContent = '0 km';
        document.getElementById('previsionMois').textContent = '0 km';
        document.getElementById('statut').textContent = 'Pas de données';
        return;
    }

    // Filtrer les relevés du mois sélectionné
    const relevesMois = releves.filter(releve => {
        const moisReleve = `${releve.date.getFullYear()}-${(releve.date.getMonth() + 1).toString().padStart(2, '0')}`;
        return moisReleve === moisSelectionne;
    });

    if (relevesMois.length === 0) {
        document.getElementById('moyenneJour').textContent = '0 km/jour';
        document.getElementById('projectionAnnuelle').textContent = '0 km';
        document.getElementById('previsionMois').textContent = '0 km';
        document.getElementById('statut').textContent = 'Pas de données ce mois';
        return;
    }

    // Calculer la moyenne journalière pour le mois en cours
    const premierReleve = new Date(Math.min(...relevesMois.map(r => r.date)));
    const dernierReleve = new Date(Math.max(...relevesMois.map(r => r.date)));
    const joursEcoules = Math.max(1, Math.ceil((dernierReleve - premierReleve) / (1000 * 60 * 60 * 24))) + 1;
    const moyenneJournaliere = totalMoisCourant / joursEcoules;

    // Calculer le nombre de jours dans le mois sélectionné
    const [annee, mois] = moisSelectionne.split('-').map(Number);
    const dernierJourMois = new Date(annee, mois, 0).getDate();
    
    // Calculer la prévision pour la fin du mois
    const joursRestants = dernierJourMois - new Date().getDate();
    const previsionMois = totalMoisCourant + (moyenneJournaliere * joursRestants);

    // Calculer la projection annuelle basée sur la moyenne journalière
    const projectionAnnuelle = (moyenneJournaliere * 365).toFixed(0);

    // Mettre à jour l'affichage
    document.getElementById('moyenneJour').textContent = `${moyenneJournaliere.toFixed(1)} km/jour`;
    document.getElementById('projectionAnnuelle').textContent = `${projectionAnnuelle} km`;
    document.getElementById('previsionMois').textContent = `${previsionMois.toFixed(0)} km`;

    // Mettre à jour le statut
    let statut = 'Dans les objectifs';
    const pourcentageObjectif = (previsionMois / OBJECTIF_MENSUEL) * 100;
    
    if (pourcentageObjectif < 90) {
        statut = 'En dessous des objectifs';
    } else if (pourcentageObjectif > 110) {
        statut = 'Au-dessus des objectifs';
    }
    
    document.getElementById('statut').textContent = statut;
}

function mettreAJourInterface() {
    // Si on est en vue annuelle, ne rien faire
    if (vueAnnuelle) return;

    // Calculer le total du mois courant
    totalMoisCourant = calculerTotalMoisCourant();
    
    // Mettre à jour le titre
    document.querySelector('.card-title').textContent = 'Progression Mensuelle';
    
    // Calculer l'objectif mensuel ajusté
    const objectifMensuelAjuste = calculerObjectifMensuel(moisSelectionne);
    
    // Mettre à jour la barre de progression mensuelle
    const pourcentageProgression = (totalMoisCourant / objectifMensuelAjuste) * 100;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = Math.min(100, pourcentageProgression) + '%';
    
    // Changer la couleur de la barre en fonction de la progression
    if (pourcentageProgression > 100) {
        progressBar.classList.remove('bg-warning');
        progressBar.classList.add('bg-danger');
    } else if (pourcentageProgression > 90) {
        progressBar.classList.remove('bg-danger');
        progressBar.classList.add('bg-warning');
    } else {
        progressBar.classList.remove('bg-warning', 'bg-danger');
    }
    
    // Mettre à jour l'affichage du kilométrage
    document.getElementById('kilometrageInfo').innerHTML = `<span id="currentKm">${totalMoisCourant.toFixed(1)}</span> / ${objectifMensuelAjuste.toFixed(2)} km`;
    
    // Mettre à jour les statistiques
    mettreAJourStatistiques();
    
    // Mettre à jour le graphique
    mettreAJourGraphique();
}

// Fonction pour réinitialiser le mois courant
function reinitialiserMoisCourant() {
    // Mettre à jour le texte du modal avec le mois sélectionné
    document.getElementById('confirmationModalBody').textContent = 
        `Êtes-vous sûr de vouloir réinitialiser tous les relevés du mois ${moisSelectionne} ?\nCette action est irréversible.`;
}

// Fonction pour réinitialiser les données
function reinitialiserDonnees() {
    localStorage.removeItem(STORAGE_KEY);
    releves = [];
    totalKm = 0;
    totalMoisCourant = 0;
    mettreAJourInterface();
}

function basculerVueAnnuelle() {
    const viewYearButton = document.getElementById('viewYearButton');
    const monthSelector = document.getElementById('monthSelector');
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');

    if (vueAnnuelle) {
        // Retour à la vue mensuelle
        vueAnnuelle = false;
        viewYearButton.textContent = "À l'année";
        viewYearButton.classList.remove('btn-success');
        viewYearButton.classList.add('btn-outline-success');
        
        // Réactiver la navigation par mois
        monthSelector.disabled = false;
        prevMonth.disabled = false;
        nextMonth.disabled = false;
        
        // Mettre à jour l'interface pour le mois sélectionné
        mettreAJourInterface();
    } else {
        // Passage à la vue annuelle
        vueAnnuelle = true;
        viewYearButton.textContent = "Au mois";
        viewYearButton.classList.remove('btn-outline-success');
        viewYearButton.classList.add('btn-success');
        
        // Désactiver la navigation par mois
        monthSelector.disabled = true;
        prevMonth.disabled = true;
        nextMonth.disabled = true;
        
        // Afficher les statistiques annuelles
        afficherStatistiquesAnnuelles();
    }
}

// Ajouter l'entrée du 27 novembre
function ajouterReleve27Novembre() {
    // Charger les données existantes
    chargerDonnees();
    
    // Créer le nouveau relevé pour le 27 novembre
    const releve = {
        date: new Date('2024-11-27'),
        kilometrage: 0  // Mettez ici le kilométrage souhaité
    };
    
    // Ajouter le relevé
    releves.push(releve);
    
    // Mettre à jour le total
    totalKm += releve.kilometrage;
    totalMoisCourant = calculerTotalMoisCourant();
    
    // Sauvegarder et mettre à jour l'interface
    sauvegarderDonnees();
    mettreAJourInterface();
}
