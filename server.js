require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = 'path';
const chatRoutes = require('./src/routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api/chat', chatRoutes);

// Rota para qualquer outra requisição, servir o index.html (para o React Router no futuro)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});