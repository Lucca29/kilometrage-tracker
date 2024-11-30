// Configuration Google Sheets API
const SPREADSHEET_ID = '1WHMvUFZo-ATU-qN9CUwDTPKil9pP5qyqXvdQSKFlgQo';
const CLIENT_ID = '843479043399-21s3fodbqe5npek3ist8ef1lmo7cmo2v.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAb6ienYvLlVz6UxxmIaiuNt4HdkUCDVSI';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

class SheetsManager {
    constructor() {
        this.CLIENT_ID = '843479043399-21s3fodbqe5npek3ist8ef1lmo7cmo2v.apps.googleusercontent.com';
        this.API_KEY = 'AIzaSyAb6ienYvLlVz6UxxmIaiuNt4HdkUCDVSI';
        this.SPREADSHEET_ID = '1WHMvUFZo-ATU-qN9CUwDTPKil9pP5qyqXvdQSKFlgQo';
        this.SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
        this.isAuthenticated = false;
    }

    async init() {
        try {
            await this.loadGapiScript();
            await this.loadGisScript();
            await this.initializeGapiClient();
            await this.initializeGisClient();
            
            // Vérifier le token stocké
            const storedToken = localStorage.getItem('gapi_token');
            if (storedToken) {
                const tokenData = JSON.parse(storedToken);
                if (this.isTokenValid(tokenData)) {
                    this.isAuthenticated = true;
                    gapi.client.setToken(tokenData);
                    return;
                }
            }
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            throw error;
        }
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
        return new Date(tokenData.expires_at).getTime() > Date.now() + (5 * 60 * 1000);
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
    }

    async initializeGisClient() {
        return new Promise((resolve) => {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.SCOPES,
                callback: (response) => {
                    if (response.error) {
                        console.error('Erreur de token:', response);
                        return;
                    }
                    this.isAuthenticated = true;
                    const tokenData = {
                        ...response,
                        expires_at: Date.now() + (response.expires_in * 1000)
                    };
                    localStorage.setItem('gapi_token', JSON.stringify(tokenData));
                    resolve();
                },
            });
            this.gisInited = true;
            resolve();
        });
    }

    async ensureAuthenticated() {
        if (!this.isAuthenticated) {
            return new Promise((resolve, reject) => {
                try {
                    this.tokenClient.callback = (response) => {
                        if (response.error) {
                            reject(response);
                            return;
                        }
                        this.isAuthenticated = true;
                        const tokenData = {
                            ...response,
                            expires_at: Date.now() + (response.expires_in * 1000)
                        };
                        localStorage.setItem('gapi_token', JSON.stringify(tokenData));
                        resolve();
                    };
                    this.tokenClient.requestAccessToken({ prompt: '' });
                } catch (error) {
                    reject(error);
                }
            });
        }
    }

    async appendKilometrageData(date, kilometrage) {
        try {
            await this.ensureAuthenticated();

            const values = [[date, kilometrage]];
            const resource = { values };
            
            const result = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.SPREADSHEET_ID,
                range: 'Feuille 1!A:B',
                valueInputOption: 'USER_ENTERED',
                resource: resource,
            });

            console.log('Données ajoutées:', result);
            return result;
        } catch (err) {
            console.error('Erreur lors de l\'ajout des données:', err);
            throw err;
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
            }
        } catch (err) {
            console.error('Erreur de déconnexion:', err);
            throw err;
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
