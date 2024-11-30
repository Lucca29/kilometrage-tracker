// Configuration Google Sheets API
const SPREADSHEET_ID = '1WHMvUFZo-ATU-qN9CUwDTPKil9pP5qyqXvdQSKFlgQo';
const CLIENT_ID = '843479043399-21s3fodbqe5npek3ist8ef1lmo7cmo2v.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAb6ienYvLlVz6UxxmIaiuNt4HdkUCDVSI';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

class SheetsManager {
    constructor() {
        // Configuration de l'API Google
        this.CLIENT_ID = '843479043399-21s3fodbqe5npek3ist8ef1lmo7cmo2v.apps.googleusercontent.com';
        this.API_KEY = 'AIzaSyAb6ienYvLlVz6UxxmIaiuNt4HdkUCDVSI';
        this.SPREADSHEET_ID = '1WHMvUFZo-ATU-qN9CUwDTPKil9pP5qyqXvdQSKFlgQo';
        this.SCOPES = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file'
        ];
        
        // État de l'authentification
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
        this.isAuthenticated = false;

        // Debug info
        console.log('Environment:', {
            location: window.location.href,
            protocol: window.location.protocol,
            host: window.location.host
        });
        
        // Initialiser les écouteurs d'erreurs
        window.addEventListener('error', this.handleError.bind(this));
        window.addEventListener('unhandledrejection', this.handlePromiseError.bind(this));
    }

    handleError(event) {
        console.error('Erreur détectée:', {
            error: event.error,
            message: event.error?.message,
            stack: event.error?.stack
        });
        if (event.error && event.error.status === 401) {
            this.handleAuthError();
        }
    }

    handlePromiseError(event) {
        console.error('Promesse rejetée:', {
            reason: event.reason,
            message: event.reason?.message,
            stack: event.reason?.stack
        });
        if (event.reason && event.reason.status === 401) {
            this.handleAuthError();
        }
    }

    handleAuthError() {
        console.log('Erreur d\'authentification détectée, tentative de reconnexion...');
        this.isAuthenticated = false;
        localStorage.removeItem('gapi_token');
        this.initAuth();
    }

    async init() {
        try {
            console.log('Initialisation de Google Sheets API...');
            await this.loadGapiScript();
            console.log('Script GAPI chargé');
            
            await this.loadGisScript();
            console.log('Script GIS chargé');
            
            await this.initializeGapiClient();
            console.log('Client GAPI initialisé');
            
            await this.initializeGisClient();
            console.log('Client GIS initialisé');
            
            await this.initAuth();
            console.log('Authentification initialisée');
            
            console.log('Initialisation terminée avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', {
                error,
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async initAuth() {
        console.log('Vérification du token stocké...');
        const storedToken = localStorage.getItem('gapi_token');
        if (storedToken) {
            try {
                const tokenData = JSON.parse(storedToken);
                console.log('Token trouvé:', {
                    expiresAt: new Date(tokenData.expires_at),
                    isValid: this.isTokenValid(tokenData)
                });
                
                if (this.isTokenValid(tokenData)) {
                    console.log('Token valide, configuration du client');
                    this.isAuthenticated = true;
                    gapi.client.setToken(tokenData);
                    return;
                } else {
                    console.log('Token expiré ou invalide');
                }
            } catch (error) {
                console.warn('Erreur lors de la lecture du token:', error);
                localStorage.removeItem('gapi_token');
            }
        } else {
            console.log('Aucun token stocké trouvé');
        }
        
        console.log('Nouvelle authentification nécessaire');
        await this.requestAuth();
    }

    async requestAuth() {
        return new Promise((resolve, reject) => {
            try {
                console.log('Demande d\'authentification...');
                this.tokenClient.callback = (response) => {
                    if (response.error) {
                        console.error('Erreur d\'authentification:', response);
                        reject(response);
                        return;
                    }
                    console.log('Nouvelle authentification réussie');
                    this.isAuthenticated = true;
                    const tokenData = {
                        ...response,
                        expires_at: Date.now() + (response.expires_in * 1000)
                    };
                    localStorage.setItem('gapi_token', JSON.stringify(tokenData));
                    resolve();
                };
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            } catch (error) {
                console.error('Erreur lors de la demande d\'authentification:', error);
                reject(error);
            }
        });
    }

    loadGapiScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    loadGisScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    isTokenValid(tokenData) {
        if (!tokenData || !tokenData.access_token || !tokenData.expires_at) {
            return false;
        }
        // Ajouter une marge de 5 minutes
        return new Date(tokenData.expires_at).getTime() > (Date.now() + (5 * 60 * 1000));
    }

    async initializeGapiClient() {
        await new Promise((resolve, reject) => {
            gapi.load('client', { callback: resolve, onerror: reject });
        });

        await gapi.client.init({
            apiKey: this.API_KEY,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        });

        this.gapiInited = true;
        console.log('GAPI initialisé');
    }

    async initializeGisClient() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES.join(' '),
            callback: '', // Défini lors de l'appel
        });
        this.gisInited = true;
        console.log('GIS initialisé');
    }

    async ensureAuthenticated() {
        if (!this.isAuthenticated) {
            console.log('Authentication nécessaire');
            await this.requestAuth();
        }
    }

    async appendKilometrageData(date, kilometrage) {
        try {
            console.log('Tentative d\'ajout de données:', { date, kilometrage });
            await this.ensureAuthenticated();

            // Formater la date pour Google Sheets
            const dateFormatted = new Date(date).toLocaleDateString('fr-FR');
            const values = [[dateFormatted, kilometrage]];
            
            console.log('Envoi des données:', { dateFormatted, kilometrage });
            
            const result = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.SPREADSHEET_ID,
                range: 'Feuille 1!A:B',
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: { values }
            });

            console.log('Données ajoutées avec succès:', result);
            return result;
        } catch (error) {
            console.error('Erreur lors de l\'ajout des données:', {
                error,
                message: error.message,
                status: error.status,
                stack: error.stack
            });
            
            if (error.status === 401) {
                console.log('Erreur d\'authentification détectée, tentative de reconnexion...');
                await this.handleAuthError();
                // Réessayer une fois après la réauthentification
                return this.appendKilometrageData(date, kilometrage);
            }
            throw error;
        }
    }

    async getAllKilometrageData() {
        try {
            await this.ensureAuthenticated();

            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: 'Feuille 1!A:B',
            });
            
            return response.result.values || [];
        } catch (error) {
            console.error('Error getting data:', error);
            throw error;
        }
    }

    async handleSignoutClick() {
        try {
            const token = gapi.client.getToken();
            if (token !== null) {
                google.accounts.oauth2.revoke(token.access_token);
                gapi.client.setToken('');
                localStorage.removeItem('gapi_token');
                this.isAuthenticated = false;
                console.log('Déconnexion réussie');
            }
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            throw error;
        }
    }
}

let tokenClient;
let gapiInited = false;
let gisInited = false;

async function loadGoogleSheetsAPI() {
    const scriptGAPI = document.createElement('script');
    scriptGAPI.src = 'https://apis.google.com/js/api.js';
    scriptGAPI.onload = async () => await gapiLoaded();
    document.head.appendChild(scriptGAPI);

    const scriptGIS = document.createElement('script');
    scriptGIS.src = 'https://accounts.google.com/gsi/client';
    scriptGIS.onload = async () => await gisLoaded();
    document.head.appendChild(scriptGIS);
}

async function gapiLoaded() {
    try {
        await gapi.load('client', async () => {
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
        });
    } catch (err) {
        console.error('Error loading GAPI:', err);
    }
}

async function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Défini lors de l'appel
    });
    gisInited = true;
}

async function getAccessToken() {
    return new Promise((resolve, reject) => {
        try {
            tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) {
                    reject(resp);
                }
                resolve(resp);
            };
            tokenClient.requestAccessToken({ prompt: '' });
        } catch (err) {
            console.error('Error getting access token:', err);
            reject(err);
        }
    });
}
