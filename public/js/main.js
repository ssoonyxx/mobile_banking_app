const CURRENT_USER_ID = 1; // Завантажиться перша картка (Марія)
let currentAccountId = null;

async function loadAccountData() {
    try {
        const response = await fetch(`/api/account/${CURRENT_USER_ID}`);
        const data = await response.json();

        if (response.ok) {
            document.getElementById('user-name').innerText = data.full_name;
            // Показуємо номер картки з БД
            document.getElementById('card-number').innerText = data.card_number;
            document.getElementById('card-balance').innerText = `${data.balance} ${data.currency}`;
            currentAccountId = data.account_id;
            
            loadTransactions(currentAccountId);
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Помилка завантаження даних:', error);
    }
}

async function loadTransactions(accountId) {
    try {
        const response = await fetch(`/api/transactions/${accountId}`);
        const transactions = await response.json();

        const list = document.getElementById('transactions-list');
        list.innerHTML = '';

        transactions.forEach(tx => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <strong>${tx.description || 'Переказ'}</strong><br>
                    <small>${new Date(tx.transaction_date).toLocaleString('uk-UA')}</small>
                </div>
                <span style="font-weight: bold; color: #333;">${tx.amount} ₴</span>
            `;
            list.appendChild(li);
        });
    } catch (error) {
        console.error('Помилка завантаження транзакцій:', error);
    }
}

document.getElementById('transfer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const receiverAccountNumber = document.getElementById('receiver-card').value; // Сюди вводимо номер рахунку отримувача
    const amount = document.getElementById('amount').value;
    const statusMsg = document.getElementById('status-message');

    try {
        const response = await fetch('/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderAccountId: currentAccountId,
                receiverAccountNumber: receiverAccountNumber,
                amount: amount,
                description: 'Мобільний переказ'
            })
        });

        const data = await response.json();
        statusMsg.innerText = data.message;

        if (response.ok) {
            statusMsg.style.color = 'green';
            document.getElementById('transfer-form').reset();
            loadAccountData();
        } else {
            statusMsg.style.color = 'red';
        }
    } catch (error) {
        statusMsg.innerText = 'Помилка мережі';
        statusMsg.style.color = 'red';
    }
});

loadAccountData();