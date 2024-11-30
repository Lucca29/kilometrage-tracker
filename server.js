const express = require('express');
const path = require('path');
const app = express();
const port = 5500;

// Middleware de sécurité de base
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Démarrage du serveur
app.listen(port, () => {
    console.log(`
    Server is running!
    
    Open your browser and go to:
    http://localhost:${port}
    
    Press Ctrl+C to stop the server.
    `);
});
