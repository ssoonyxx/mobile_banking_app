const express = require('express');
const path = require('path');
const bankRoutes = require('./routes/bankRoutes');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', bankRoutes);

app.listen(PORT, () => {
    console.log(`Сервер працює на http://localhost:${PORT}`);
});