document.addEventListener('DOMContentLoaded', function() {
  let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
  const transactionForm = document.getElementById('transaction-form');
  const descriptionInput = document.getElementById('description');
  const amountInput = document.getElementById('amount');
  const typeInput = document.getElementById('type');
  const categoryInput = document.getElementById('category');
  const dateInput = document.getElementById('date');
  const transactionsContainer = document.getElementById('transactions');
  const balanceElement = document.getElementById('balance');
  const totalIncomeElement = document.getElementById('total-income');
  const totalExpensesElement = document.getElementById('total-expenses');
  const spendingAnalysisElement = document.getElementById('spending-analysis');
  const savingsSuggestionsElement = document.getElementById('savings-suggestions');

  dateInput.valueAsDate = new Date();

  const ctx = document.getElementById('spending-chart').getContext('2d');
  let spendingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  const incomeCtx = document.getElementById('income-chart').getContext('2d');
  let incomeChart = new Chart(incomeCtx, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40'] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  transactionForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const transaction = {
      id: generateID(),
      description: descriptionInput.value,
      amount: parseFloat(amountInput.value),
      type: typeInput.value,
      category: categoryInput.value,
      date: dateInput.value
    };
    transactions.push(transaction);
    updateLocalStorage();
    addTransactionToDOM(transaction);
    updateSummary();
    updateChart();
    generateInsights();
    transactionForm.reset();
    dateInput.valueAsDate = new Date();
  });

  function generateID() { return Math.floor(Math.random() * 1000000000); }
  function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }

  function addTransactionToDOM(transaction) {
    const transactionElement = document.createElement('div');
    const sign = transaction.type === 'income' ? '+' : '-';
    const amountClass = transaction.type === 'income' ? 'positive' : 'negative';
    const transactionClass = transaction.type === 'income' ? 'transaction-income' : 'transaction-expense';

    transactionElement.classList.add('transaction', transactionClass);
    transactionElement.innerHTML = `
      <div>
        <div>${transaction.description}</div>
        <div class="transaction-category">${transaction.category}</div>
        <div class="transaction-date">${formatDate(transaction.date)}</div>
      </div>
      <div class="transaction-amount ${amountClass}">${sign}$${Math.abs(transaction.amount).toFixed(2)}</div>
      <button class="btn-danger delete-btn" data-id="${transaction.id}">❌</button>
    `;

    transactionsContainer.insertBefore(transactionElement, transactionsContainer.firstChild);

    transactionElement.querySelector('.delete-btn').addEventListener('click', () => {
      removeTransaction(transaction.id);
    });
  }

  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  function removeTransaction(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);
    updateLocalStorage();
    init();
  }

  function updateSummary() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expenses;

    totalIncomeElement.textContent = `$${income.toFixed(2)}`;
    totalExpensesElement.textContent = `$${expenses.toFixed(2)}`;
    balanceElement.textContent = `$${balance.toFixed(2)}`;
    balanceElement.className = balance >= 0 ? 'balance positive' : 'balance negative';

    // Add animation
    [totalIncomeElement, totalExpensesElement, balanceElement].forEach(el => {
      el.classList.remove('fade-animate');
      void el.offsetWidth; // trigger reflow
      el.classList.add('fade-animate');
    });
  }

  function updateChart() {
    // Expenses
    const expenseCategories = {};
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
      expenseCategories[transaction.category] = (expenseCategories[transaction.category] || 0) + transaction.amount;
    });
    spendingChart.data.labels = Object.keys(expenseCategories);
    spendingChart.data.datasets[0].data = Object.values(expenseCategories);
    spendingChart.update();

    // Income
    const incomeCategories = {};
    transactions.filter(t => t.type === 'income').forEach(transaction => {
      incomeCategories[transaction.category] = (incomeCategories[transaction.category] || 0) + transaction.amount;
    });
    incomeChart.data.labels = Object.keys(incomeCategories);
    incomeChart.data.datasets[0].data = Object.values(incomeCategories);
    incomeChart.update();
  }

  function generateInsights() {
    if (transactions.length === 0) return;
    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes = transactions.filter(t => t.type === 'income');
    if (expenses.length === 0) {
      spendingAnalysisElement.textContent = "You haven't recorded any expenses yet.";
      return;
    }
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
    const categorySpending = {};
    expenses.forEach(t => { categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount; });
    const topCategory = Object.entries(categorySpending).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const topCategoryPercent = (categorySpending[topCategory] / totalExpenses * 100).toFixed(1);
    const dates = expenses.map(t => new Date(t.date).toISOString().split('T')[0]);
    const uniqueDays = new Set(dates).size;
    const avgDailySpending = (totalExpenses / uniqueDays).toFixed(2);
    spendingAnalysisElement.innerHTML = `
      You've spent $${totalExpenses.toFixed(2)} this period.<br>
      Your top spending category is <strong>${topCategory}</strong>, accounting for ${topCategoryPercent}% of your expenses.<br>
      Average daily spending: $${avgDailySpending}.
    `;
    let suggestions = [];
    if (topCategoryPercent > 40) {
      suggestions.push(`Consider reducing your ${topCategory} spending as it's a large portion of your expenses.`);
    }
    if (totalIncome > 0 && (totalExpenses / totalIncome) > 0.8) {
      suggestions.push("You're spending a high percentage of your income. Try to increase savings by cutting non-essential expenses.");
    }
    if (suggestions.length === 0) {
      suggestions.push("Your spending looks balanced. Keep tracking to find more optimization opportunities!");
    }
    savingsSuggestionsElement.innerHTML = suggestions.join('<br>');
  }

  function init() {
    transactionsContainer.innerHTML = '';
    transactions.forEach(addTransactionToDOM);
    updateSummary();
    updateChart();
    generateInsights();
  }

  // ✅ Export CSV inside DOMContentLoaded
  function exportCSV() {
    if (transactions.length === 0) {
      alert("No transactions to export!");
      return;
    }
    const headers = ["Description","Amount","Type","Category","Date"];
    const rows = transactions.map(t => [
      `"${t.description}"`,
      t.amount,
      t.type,
      t.category,
      t.date
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  document.getElementById("export-btn").addEventListener("click", exportCSV);

  init();
});
