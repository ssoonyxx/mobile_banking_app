const sql = require('mssql');

const config = {
    server: '127.0.0.1',        // Локальна адреса
    database: 'bank_db',
    user: 'sa',                 // Ваш користувач
    password: '12345', // Сюди впишіть пароль, який ви дали користувачу sa в SSMS
    options: {
        trustServerCertificate: true, 
        enableArithAbort: true,
        instanceName: 'SQLEXPRESS' // Обовязково залишаємо цей рядок! Він автоматично знайде потрібний динамічний порт замість 1433
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Успішно підключено до реального локального MSSQL (bank_db)!');
        return pool;
    })
    .catch(err => {
        console.error('Помилка підключення до бази даних: ', err);
    });

module.exports = {
    sql,
    poolPromise
};