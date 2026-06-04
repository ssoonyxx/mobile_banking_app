const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');

// 1. Отримання даних користувача (user_id = 1)
router.get('/account/:userId', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, req.params.userId)
            .query(`
                SELECT 
                    u.first_name + ' ' + u.last_name as full_name,
                    a.account_id,
                    a.account_number,
                    a.balance,
                    a.currency,
                    c.card_number
                FROM users u
                JOIN accounts a ON u.user_id = a.user_id
                JOIN cards c ON a.account_id = c.account_id
                WHERE u.user_id = @userId
            `);
            
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Користувача не знайдено' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Історія транзакцій
router.get('/transactions/:accountId', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('accountId', sql.Int, req.params.accountId)
            .query(`
                SELECT 
                    t.transaction_id, 
                    t.amount, 
                    t.description, 
                    t.transaction_date,
                    a1.account_number as sender_acc, 
                    a2.account_number as receiver_acc
                FROM transactions t
                JOIN accounts a1 ON t.sender_account_id = a1.account_id
                JOIN accounts a2 ON t.receiver_account_id = a2.account_id
                WHERE t.sender_account_id = @accountId OR t.receiver_account_id = @accountId
                ORDER BY t.transaction_date DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Переказ коштів
router.post('/transfer', async (req, res) => {
    const { senderAccountId, receiverAccountNumber, amount, description } = req.body;
    const transferAmount = parseFloat(amount);

    if (!receiverAccountNumber || transferAmount <= 0) {
        return res.status(400).json({ message: 'Некоректні дані переказу' });
    }

    try {
        const pool = await poolPromise;

        const senderCheck = await pool.request()
            .input('senderId', sql.Int, senderAccountId)
            .query('SELECT balance FROM accounts WHERE account_id = @senderId');

        if (senderCheck.recordset.length === 0) {
            return res.status(404).json({ message: 'Рахунок відправника не знайдено' });
        }

        const senderBalance = parseFloat(senderCheck.recordset[0].balance);
        if (senderBalance < transferAmount) {
            return res.status(400).json({ message: 'Недостатньо коштів' });
        }

        const receiverCheck = await pool.request()
            .input('receiverAccNum', sql.VarChar, receiverAccountNumber)
            .query('SELECT account_id FROM accounts WHERE account_number = @receiverAccNum');

        if (receiverCheck.recordset.length === 0) {
            return res.status(404).json({ message: 'Рахунок отримувача не знайдено' });
        }

        const receiverAccountId = receiverCheck.recordset[0].account_id;

        if (senderAccountId == receiverAccountId) {
            return res.status(400).json({ message: 'Не можна переказувати собі' });
        }

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await transaction.request()
                .input('amount', sql.Decimal(18, 2), transferAmount)
                .input('id', sql.Int, senderAccountId)
                .query('UPDATE accounts SET balance = balance - @amount WHERE account_id = @id');

            await transaction.request()
                .input('amount', sql.Decimal(18, 2), transferAmount)
                .input('id', sql.Int, receiverAccountId)
                .query('UPDATE accounts SET balance = balance + @amount WHERE account_id = @id');

            await transaction.request()
                .input('senderId', sql.Int, senderAccountId)
                .input('receiverId', sql.Int, receiverAccountId)
                .input('amount', sql.Decimal(18, 2), transferAmount)
                .input('desc', sql.NVarChar, description || 'Переказ')
                .query(`
                    INSERT INTO transactions (sender_account_id, receiver_account_id, amount, description) 
                    VALUES (@senderId, @receiverId, @amount, @desc)
                `);

            await transaction.commit();
            res.json({ message: 'Переказ виконано успішно!' });
        } catch (txError) {
            await transaction.rollback();
            throw txError;
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;