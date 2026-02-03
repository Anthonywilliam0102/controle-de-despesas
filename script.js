// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDBWJ3Ld4ZaXSXTXN1Xi9zFfnCEt-vbaok",
    authDomain: "controle-despesas-4dd73.firebaseapp.com",
    databaseURL: "https://controle-despesas-4dd73-default-rtdb.firebaseio.com",
    projectId: "controle-despesas-4dd73",
    storageBucket: "controle-despesas-4dd73.firebasestorage.app",
    messagingSenderId: "882977986254",
    appId: "1:882977986254:web:890d62a1079962be34629f",
    measurementId: "G-4X6B2JQQHW"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- Elementos do DOM ---
const themeToggleBtn = document.getElementById('theme-toggle');
const form = document.getElementById('transaction-form');
const tableBody = document.querySelector('#transaction-table tbody');
const emptyMsg = document.getElementById('empty-msg');
const filterMonth = document.getElementById('filter-month');
const filterYear = document.getElementById('filter-year');
const dateInput = document.getElementById('date-input');

const elTotalIncomes = document.getElementById('total-incomes');
const elTotalExpenses = document.getElementById('total-expenses');
const elBalance = document.getElementById('monthly-balance');
const elIncomeMaria = document.getElementById('income-maria');
const elIncomeLucas = document.getElementById('income-lucas');

const typeSelect = document.getElementById('trans-type');
const categorySelect = document.getElementById('category');

// --- Configuração ---
const THEME_KEY = 'financasTheme';
let currentDate = new Date();
let selectedMonth = String(currentDate.getMonth() + 1);
let selectedYear = String(currentDate.getFullYear());

let transactions = {}; 

const categoriesExpense = [
    "Contas Fixas (Luz/Água/Net)", "Alimentação / Mercado", "Gasolina / Transporte",
    "Educação", "Streaming / Assinaturas", "Lazer / Restaurante", 
    "Imprevistos", "Saúde / Farmácia", "Poupança", "Outros"
];
const categoriesIncome = [
    "Salário Mensal", "Vale Alimentação", "Freelance / Extra", 
    "Reembolso", "Investimentos", "Presente"
];

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    startSync(); // Substitui o loadData antigo
    populateDateSelectors();
    updateCategories(); 
    dateInput.valueAsDate = new Date(); 
});

// --- Core Logic (FIREBASE) ---

function startSync() {
    // Escuta mudanças no Firebase em tempo real
    db.ref('transactions').on('value', (snapshot) => {
        transactions = snapshot.val() || {};
        updateDashboard();
    });
}

function saveData() {
    // Salva o objeto completo de transações no Firebase
    db.ref('transactions').set(transactions);
}

function addTransaction(e) {
    e.preventDefault();

    const type = typeSelect.value;
    const desc = document.getElementById('desc').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = categorySelect.value;
    const user = document.querySelector('input[name="user"]:checked').value;
    const dateValue = dateInput.value;

    if (!desc || isNaN(amount) || amount <= 0 || !dateValue) {
        alert("Preencha todos os campos!");
        return;
    }

    const [year, month, day] = dateValue.split('-');
    const monthKey = String(parseInt(month));

    if (!transactions[year]) transactions[year] = {};
    if (!transactions[year][monthKey]) transactions[year][monthKey] = [];

    const newTrans = {
        id: Date.now(),
        type: type,
        date: dateValue,
        description: desc,
        value: amount,
        category: category,
        user: user
    };

    transactions[year][monthKey].push(newTrans);
    saveData(); // Agora salva no Firebase

    if (year !== selectedYear || monthKey !== selectedMonth) {
        if(confirm("Lançamento salvo em outro mês. Deseja visualizar o mês do lançamento?")) {
            filterYear.value = year;
            filterMonth.value = monthKey;
            handleDateChange();
            return;
        }
    }

    form.reset();
    dateInput.value = dateValue;
    document.querySelector(`input[name="user"][value="${user}"]`).checked = true;
    updateCategories();
    updateDashboard();
}

function deleteTransaction(id) {
    if(confirm("Deseja realmente apagar este item?")) {
        const list = transactions[selectedYear][selectedMonth];
        transactions[selectedYear][selectedMonth] = list.filter(item => item.id !== id);
        saveData(); // Salva a exclusão no Firebase
    }
}

// --- Interface e Dashboard (Seu código original) ---

function updateCategories() {
    const isIncome = typeSelect.value === 'income';
    const list = isIncome ? categoriesIncome : categoriesExpense;
    categorySelect.innerHTML = '';
    list.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
    });
}

function updateDashboard() {
    tableBody.innerHTML = '';
    const list = (transactions[selectedYear] && transactions[selectedYear][selectedMonth]) || [];
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeMaria = 0;
    let incomeLucas = 0;

    if (list.length === 0) {
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
        list.sort((a, b) => new Date(b.date) - new Date(a.date));

        list.forEach(item => {
            if (item.type === 'income') {
                totalIncome += item.value;
                if (item.user === 'Maria') incomeMaria += item.value;
                if (item.user === 'Lucas') incomeLucas += item.value;
            } else {
                totalExpense += item.value;
            }

            const row = document.createElement('tr');
            if(item.type === 'income') row.classList.add('row-income');

            const [y, m, d] = item.date.split('-');
            const userClass = item.user === 'Maria' ? 'tag-maria' : 'tag-lucas';
            const signal = item.type === 'income' ? '+' : '-';

            row.innerHTML = `
                <td>${d}/${m}</td>
                <td>${item.description}</td>
                <td>${item.category}</td>
                <td><span class="tag ${userClass}">${item.user}</span></td>
                <td style="font-weight: bold;">${signal} ${formatCurrency(item.value)}</td>
                <td>
                    <button class="btn-delete" onclick="deleteTransaction(${item.id})">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    elTotalIncomes.textContent = formatCurrency(totalIncome);
    elTotalExpenses.textContent = formatCurrency(totalExpense);
    const balance = totalIncome - totalExpense;
    elBalance.textContent = formatCurrency(balance);
    elBalance.className = '';
    if (balance > 0) elBalance.classList.add('positive-text');
    else if (balance < 0) elBalance.classList.add('negative-text');
    elIncomeMaria.textContent = formatCurrency(incomeMaria);
    elIncomeLucas.textContent = formatCurrency(incomeLucas);
}

function populateDateSelectors() {
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    filterMonth.innerHTML = '';
    months.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i + 1;
        opt.textContent = m;
        if (i + 1 == selectedMonth) opt.selected = true;
        filterMonth.appendChild(opt);
    });
    const currYear = new Date().getFullYear();
    filterYear.innerHTML = '';
    for(let i = currYear - 2; i <= currYear + 2; i++){
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        if (i == selectedYear) opt.selected = true;
        filterYear.appendChild(opt);
    }
}

function handleDateChange() {
    selectedMonth = filterMonth.value;
    selectedYear = filterYear.value;
    updateDashboard();
}

document.getElementById('prev-month').addEventListener('click', () => {
    let m = parseInt(selectedMonth) - 1;
    if (m < 1) { m = 12; filterYear.value = parseInt(selectedYear) - 1; }
    filterMonth.value = m;
    handleDateChange();
});
document.getElementById('next-month').addEventListener('click', () => {
    let m = parseInt(selectedMonth) + 1;
    if (m > 12) { m = 1; filterYear.value = parseInt(selectedYear) + 1; }
    filterMonth.value = m;
    handleDateChange();
});

function formatCurrency(val) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem(THEME_KEY, document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    themeToggleBtn.querySelector('i').className = document.body.classList.contains('dark-mode') ? 'ph ph-sun' : 'ph ph-moon';
}

function loadTheme() {
    if (localStorage.getItem(THEME_KEY) === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleBtn.querySelector('i').className = 'ph ph-sun';
    }
}

form.addEventListener('submit', addTransaction);
filterMonth.addEventListener('change', handleDateChange);
filterYear.addEventListener('change', handleDateChange);
themeToggleBtn.addEventListener('click', toggleTheme);