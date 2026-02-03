// --- Elementos do DOM ---
const themeToggleBtn = document.getElementById('theme-toggle');
const form = document.getElementById('transaction-form');
const tableBody = document.querySelector('#transaction-table tbody');
const emptyMsg = document.getElementById('empty-msg');
const filterMonth = document.getElementById('filter-month');
const filterYear = document.getElementById('filter-year');
const dateInput = document.getElementById('date-input');

// Elementos de Dashboard
const elTotalIncomes = document.getElementById('total-incomes');
const elTotalExpenses = document.getElementById('total-expenses');
const elBalance = document.getElementById('monthly-balance');
const elIncomeMaria = document.getElementById('income-maria');
const elIncomeLucas = document.getElementById('income-lucas');

// Selects do formulário
const typeSelect = document.getElementById('trans-type');
const categorySelect = document.getElementById('category');

// --- Configuração ---
const STORAGE_KEY = 'financasMariaLucas_v2'; // Chave nova para evitar conflito com versão anterior
const THEME_KEY = 'financasTheme';

let currentDate = new Date();
let selectedMonth = String(currentDate.getMonth() + 1);
let selectedYear = String(currentDate.getFullYear());

// Estrutura de dados: transactions[ano][mes] = []
let transactions = {}; 

// Categorias
const categoriesExpense = [
    "Contas Fixas (Luz/Água/Net)", "Alimentação / Mercado", "Gasolina / Transporte",
    "Educação", "Streaming / Assinaturas", "Lazer / Restaurante", 
    "Imprevistos", "Saúde / Farmácia", "Outros"
];
const categoriesIncome = [
    "Salário Mensal", "Vale Alimentação", "Freelance / Extra", 
    "Reembolso", "Investimentos", "Presente"
];

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadData();
    populateDateSelectors();
    updateCategories(); // Carrega categorias iniciais
    dateInput.valueAsDate = new Date(); // Data de hoje no form
    updateDashboard();
});

// --- Core Logic ---

function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    transactions = raw ? JSON.parse(raw) : {};
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function addTransaction(e) {
    e.preventDefault();

    const type = typeSelect.value; // 'income' ou 'expense'
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
    const monthKey = String(parseInt(month)); // Remove zero à esquerda se houver

    // Inicializa estrutura se não existir
    if (!transactions[year]) transactions[year] = {};
    if (!transactions[year][monthKey]) transactions[year][monthKey] = [];

    const newTrans = {
        id: Date.now(),
        type: type, // Guarda se é receita ou despesa
        date: dateValue,
        description: desc,
        value: amount,
        category: category,
        user: user
    };

    transactions[year][monthKey].push(newTrans);
    saveData();

    // Se lançou em data diferente da atual, pergunta se quer ir pra lá
    if (year !== selectedYear || monthKey !== selectedMonth) {
        if(confirm("Lançamento salvo em outro mês. Deseja visualizar o mês do lançamento?")) {
            filterYear.value = year;
            filterMonth.value = monthKey;
            handleDateChange();
            return;
        }
    }

    form.reset();
    dateInput.value = dateValue; // Mantém a data
    document.querySelector(`input[name="user"][value="${user}"]`).checked = true; // Mantém usuário
    updateCategories(); // Reseta categorias
    updateDashboard();
}

function deleteTransaction(id) {
    if(confirm("Deseja realmente apagar este item?")) {
        const list = transactions[selectedYear][selectedMonth];
        transactions[selectedYear][selectedMonth] = list.filter(item => item.id !== id);
        saveData();
        updateDashboard();
    }
}

// --- Interface e Dashboard ---

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
    // Limpa UI
    tableBody.innerHTML = '';
    
    const list = (transactions[selectedYear] && transactions[selectedYear][selectedMonth]) || [];

    // Variáveis de Cálculo
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeMaria = 0;
    let incomeLucas = 0;

    if (list.length === 0) {
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
        
        // Ordena por data (mais recente primeiro)
        list.sort((a, b) => new Date(b.date) - new Date(a.date));

        list.forEach(item => {
            // Cálculos
            if (item.type === 'income') {
                totalIncome += item.value;
                if (item.user === 'Maria') incomeMaria += item.value;
                if (item.user === 'Lucas') incomeLucas += item.value;
            } else {
                totalExpense += item.value;
            }

            // Renderiza Linha
            const row = document.createElement('tr');
            if(item.type === 'income') row.classList.add('row-income'); // Estilo verde

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

    // Atualiza Cards
    elTotalIncomes.textContent = formatCurrency(totalIncome);
    elTotalExpenses.textContent = formatCurrency(totalExpense);
    
    const balance = totalIncome - totalExpense;
    elBalance.textContent = formatCurrency(balance);
    
    // Cor do Saldo
    elBalance.className = '';
    if (balance > 0) elBalance.classList.add('positive-text');
    else if (balance < 0) elBalance.classList.add('negative-text');

    // Detalhe das Receitas
    elIncomeMaria.textContent = formatCurrency(incomeMaria);
    elIncomeLucas.textContent = formatCurrency(incomeLucas);
}

// --- Helpers ---

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

// Navegação de mês (botões setas)
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

// Listeners
form.addEventListener('submit', addTransaction);
filterMonth.addEventListener('change', handleDateChange);
filterYear.addEventListener('change', handleDateChange);
themeToggleBtn.addEventListener('click', toggleTheme);