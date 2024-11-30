// Configuration Google Sheets API
const SPREADSHEET_ID = '1WHMvUFZo-ATU-qN9CUwDTPKil9pP5qyqXvdQSKFlgQo';
const CLIENT_ID = '843479043399-21s3fodbqe5npek3ist8ef1lmo7cmo2v.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAb6ienYvLlVz6UxxmIaiuNt4HdkUCDVSI';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

class SheetsManager {
    constructor() {
        this.isInitialized = false;
        this.loadGoogleSheetsAPI();
    }

    loadGoogleSheetsAPI() {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            gapi.load('client:auth2', this.initClient.bind(this));
        };
        document.body.appendChild(script);
    }

    async initClient() {
        try {
            await gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                scope: SCOPES,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
            });

            // Écouter les changements d'état de connexion
            gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSigninStatus.bind(this));
            
            // Gérer l'état de connexion initial
            this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
            
            this.isInitialized = true;
            console.log('Google Sheets API initialized');
        } catch (error) {
            console.error('Error initializing Google Sheets API:', error);
            throw error;
        }
    }

    updateSigninStatus(isSignedIn) {
        if (isSignedIn) {
            console.log('User is signed in');
        } else {
            console.log('User is not signed in');
            this.signIn();
        }
    }

    async signIn() {
        try {
            await gapi.auth2.getAuthInstance().signIn();
        } catch (error) {
            console.error('Error signing in:', error);
        }
    }

    async signOut() {
        try {
            await gapi.auth2.getAuthInstance().signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    async waitForInitialization() {
        let attempts = 0;
        while (!this.isInitialized && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 250));
            attempts++;
        }
        if (!this.isInitialized) {
            throw new Error('Google Sheets API initialization timeout');
        }
    }

    async appendKilometrageData(date, kilometrage) {
        try {
            await this.waitForInitialization();
            
            // S'assurer que l'utilisateur est connecté
            if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
                await this.signIn();
            }
            
            // Formater la date pour le sheet
            const formattedDate = new Date(date).toLocaleDateString('fr-FR');
            
            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Feuille 1!A:B',
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [[formattedDate, kilometrage]]
                }
            });
            
            console.log('Data appended:', response.result);
            return true;
        } catch (error) {
            console.error('Error appending data:', error);
            throw error;
        }
    }

    async getAllKilometrageData() {
        try {
            await this.waitForInitialization();
            
            // S'assurer que l'utilisateur est connecté
            if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
                await this.signIn();
            }
            
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Feuille 1!A:B',
            });
            
            return response.result.values || [];
        } catch (error) {
            console.error('Error getting data:', error);
            throw error;
        }
    }
}
