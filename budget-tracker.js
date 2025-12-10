// Budget Tracker Application
class BudgetTracker {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('btTransactions')) || [];
        this.categories = JSON.parse(localStorage.getItem('btCategories')) || this.initializeDefaultCategories();
        this.budgets = JSON.parse(localStorage.getItem('btBudgets')) || [];
        this.currency = localStorage.getItem('btCurrency') || 'USD';
        this.dateFormat = localStorage.getItem('btDateFormat') || 'MM/DD/YYYY';
        
        this.init();
    }

    initializeDefaultCategories() {
        return [
            { id: 1, name: 'Salary', icon: 'fa-briefcase', color: '#4a7c59', type: 'income' },
            { id: 2, name: 'Bonus', icon: 'fa-gift', color: '#2d5016', type: 'income' },
            { id: 3, name: 'Food & Dining', icon: 'fa-utensils', color: '#ff6b6b', type: 'expense' },
            { id: 4, name: 'Transportation', icon: 'fa-car', color: '#ff922b', type: 'expense' },
            { id: 5, name: 'Housing', icon: 'fa-home', color: '#ffd43b', type: 'expense' },
            { id: 6, name: 'Utilities', icon: 'fa-bolt', color: '#a78bfa', type: 'expense' },
            { id: 7, name: 'Entertainment', icon: 'fa-gamepad', color: '#ec4899', type: 'expense' },
            { id: 8, name: 'Health & Fitness', icon: 'fa-heartbeat', color: '#14b8a6', type: 'expense' },
            { id: 9, name: 'Shopping', icon: 'fa-shopping-cart', color: '#f87171', type: 'expense' },
            { id: 10, name: 'Education', icon: 'fa-book', color: '#60a5fa', type: 'expense' },
        ];
    }

    init() {
        this.setupEventListeners();
        this.renderDashboard();
        this.updateCategorySelects();
        this.updateAllDisplays();
    }

    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSection(e.target.closest('.sidebar-link').dataset.section);
            });
        });

        // Quick action buttons
        document.getElementById('addTransactionBtn').addEventListener('click', () => this.openTransactionModal());
        document.getElementById('addTransactionBtnHeader').addEventListener('click', () => this.openTransactionModal());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearAllData());

        // Categories
        document.getElementById('addCategoryBtn').addEventListener('click', () => this.openCategoryModal());
        document.getElementById('categoryForm').addEventListener('submit', (e) => this.saveCategory(e));

        // Transactions
        document.getElementById('transactionForm').addEventListener('submit', (e) => this.saveTransaction(e));
        document.getElementById('searchTransactions').addEventListener('input', () => this.renderTransactions());
        document.getElementById('filterCategory').addEventListener('change', () => this.renderTransactions());
        document.getElementById('filterType').addEventListener('change', () => this.renderTransactions());
        document.getElementById('dateRangeFilter').addEventListener('change', () => this.renderDashboard());

        // Budgets
        document.getElementById('addBudgetBtn').addEventListener('click', () => this.openBudgetModal());
        document.getElementById('budgetForm').addEventListener('submit', (e) => this.saveBudget(e));

        // Reports
        document.getElementById('generateReportBtn').addEventListener('click', () => this.generateReport());

        // Settings
        document.getElementById('currencySelect').addEventListener('change', (e) => {
            this.currency = e.target.value;
            localStorage.setItem('btCurrency', this.currency);
            this.updateAllDisplays();
        });
        document.getElementById('dateFormatSelect').addEventListener('change', (e) => {
            this.dateFormat = e.target.value;
            localStorage.setItem('btDateFormat', this.dateFormat);
            this.updateAllDisplays();
        });
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportAsJSON());
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportAsCSV());
        document.getElementById('clearAllDataBtn').addEventListener('click', () => this.confirmClearAllData());

        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal);
            });
        });

        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal);
            });
        });

        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('transDate');
        if (dateInput) dateInput.value = today;
    }

    switchSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.tracker-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active from all sidebar links
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected section
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
            
            // Mark sidebar link as active
            document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

            // Special renders for specific sections
            if (sectionId === 'transactions') {
                this.renderTransactions();
            } else if (sectionId === 'categories') {
                this.renderCategories();
            } else if (sectionId === 'budgets') {
                this.renderBudgets();
            } else if (sectionId === 'reports') {
                this.renderReports();
            }
        }
    }

    // Dashboard Functions
    renderDashboard() {
        const filtered = this.getFilteredTransactions();
        const totals = this.calculateTotals(filtered);

        const currencySymbol = this.getCurrencySymbol();
        document.getElementById('totalIncome').textContent = `${currencySymbol}${totals.income.toFixed(2)}`;
        document.getElementById('totalExpense').textContent = `${currencySymbol}${totals.expense.toFixed(2)}`;
        document.getElementById('netBalance').textContent = `${currencySymbol}${totals.balance.toFixed(2)}`;
        
        const savingsRate = totals.income > 0 ? ((totals.balance / totals.income) * 100).toFixed(2) : 0;
        document.getElementById('savingsRate').textContent = `${savingsRate}%`;

        this.renderDashboardCharts(filtered);
        this.renderRecentTransactions(filtered);
    }

    renderDashboardCharts(transactions) {
        // Category Chart
        const categoryData = this.getCategoryBreakdown(transactions);
        const categoryCtx = document.getElementById('categoryChart');
        if (categoryCtx) {
            if (this.categoryChart) this.categoryChart.destroy();
            this.categoryChart = new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(categoryData),
                    datasets: [{
                        data: Object.values(categoryData),
                        backgroundColor: this.getColors(Object.keys(categoryData)),
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Trend Chart
        const trendData = this.getTrendData(transactions);
        const trendCtx = document.getElementById('trendChart');
        if (trendCtx) {
            if (this.trendChart) this.trendChart.destroy();
            this.trendChart = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: trendData.labels,
                    datasets: [
                        {
                            label: 'Income',
                            data: trendData.income,
                            borderColor: '#4a7c59',
                            backgroundColor: 'rgba(74, 124, 89, 0.1)',
                            borderWidth: 2,
                            fill: true
                        },
                        {
                            label: 'Expenses',
                            data: trendData.expense,
                            borderColor: '#ff6b6b',
                            backgroundColor: 'rgba(255, 107, 107, 0.1)',
                            borderWidth: 2,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    renderRecentTransactions(transactions) {
        const recent = transactions.slice(0, 5).reverse();
        const container = document.getElementById('recentTransactions');
        const currencySymbol = this.getCurrencySymbol();

        if (recent.length === 0) {
            container.innerHTML = '<p class="empty-message">No transactions yet. Add one to get started!</p>';
            return;
        }

        container.innerHTML = recent.map(trans => {
            const category = this.getCategory(trans.categoryId);
            const date = this.formatDate(trans.date);
            const type = trans.type === 'income' ? '+' : '-';
            const sign = trans.type === 'income' ? 'income-text' : 'expense-text';
            
            return `
                <div class="recent-item">
                    <div class="recent-left">
                        <div class="recent-icon" style="background-color: ${category.color};">
                            <i class="fas ${category.icon}"></i>
                        </div>
                        <div class="recent-info">
                            <h4>${trans.description}</h4>
                            <p>${category.name} • ${date}</p>
                        </div>
                    </div>
                    <div class="recent-amount ${sign}">
                        ${type}${currencySymbol}${Math.abs(trans.amount).toFixed(2)}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Transaction Functions
    renderTransactions() {
        const search = document.getElementById('searchTransactions').value.toLowerCase();
        const categoryFilter = document.getElementById('filterCategory').value;
        const typeFilter = document.getElementById('filterType').value;

        let filtered = this.transactions;

        if (categoryFilter) {
            filtered = filtered.filter(t => t.categoryId === parseInt(categoryFilter));
        }
        if (typeFilter) {
            filtered = filtered.filter(t => t.type === typeFilter);
        }
        if (search) {
            filtered = filtered.filter(t => 
                t.description.toLowerCase().includes(search) ||
                t.notes.toLowerCase().includes(search)
            );
        }

        const tbody = document.getElementById('transactionsTableBody');
        const currencySymbol = this.getCurrencySymbol();

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No transactions found</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.reverse().map(trans => {
            const category = this.getCategory(trans.categoryId);
            const date = this.formatDate(trans.date);
            const type = trans.type === 'income' ? 'Income' : 'Expense';
            const amountClass = trans.type === 'income' ? 'income-text' : 'expense-text';
            
            return `
                <tr>
                    <td>${date}</td>
                    <td>${trans.description}</td>
                    <td>${category.name}</td>
                    <td><span class="type-badge ${trans.type}">${type}</span></td>
                    <td class="${amountClass}">${currencySymbol}${trans.amount.toFixed(2)}</td>
                    <td>
                        <button class="action-btn" onclick="budgetApp.editTransaction(${trans.id})">Edit</button>
                        <button class="action-btn delete" onclick="budgetApp.deleteTransaction(${trans.id})">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    editTransaction(transId) {
        const trans = this.transactions.find(t => t.id === transId);
        if (!trans) return;

        document.getElementById('transDate').value = trans.date;
        document.getElementById('transDescription').value = trans.description;
        document.getElementById('transCategory').value = trans.categoryId;
        document.getElementById('transType').value = trans.type;
        document.getElementById('transAmount').value = trans.amount;
        document.getElementById('transNotes').value = trans.notes;

        this.currentEditId = transId;
        this.openTransactionModal();
    }

    deleteTransaction(transId) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== transId);
            this.save();
            this.updateAllDisplays();
        }
    }

    openTransactionModal() {
        this.currentEditId = null;
        document.getElementById('transactionForm').reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('transDate').value = today;
        const modal = document.getElementById('transactionModal');
        modal.style.display = 'block';
    }

    saveTransaction(e) {
        e.preventDefault();

        const date = document.getElementById('transDate').value;
        const description = document.getElementById('transDescription').value;
        const categoryId = parseInt(document.getElementById('transCategory').value);
        const type = document.getElementById('transType').value;
        const amount = parseFloat(document.getElementById('transAmount').value);
        const notes = document.getElementById('transNotes').value;

        if (this.currentEditId) {
            const trans = this.transactions.find(t => t.id === this.currentEditId);
            if (trans) {
                trans.date = date;
                trans.description = description;
                trans.categoryId = categoryId;
                trans.type = type;
                trans.amount = amount;
                trans.notes = notes;
            }
        } else {
            this.transactions.push({
                id: Date.now(),
                date, description, categoryId, type, amount, notes,
                createdAt: new Date().toISOString()
            });
        }

        this.save();
        this.updateAllDisplays();
        this.closeModal(document.getElementById('transactionModal'));
    }

    // Category Functions
    renderCategories() {
        const container = document.getElementById('categoriesList');
        
        if (this.categories.length === 0) {
            container.innerHTML = '<p class="empty-message">No categories yet. Add one to get started!</p>';
            return;
        }

        container.innerHTML = this.categories.map(cat => `
            <div class="category-item">
                <div class="category-icon" style="background-color: ${cat.color};">
                    <i class="fas ${cat.icon}"></i>
                </div>
                <div class="category-info">
                    <h4>${cat.name}</h4>
                    <p>${cat.type === 'income' ? 'Income' : 'Expense'} Category</p>
                </div>
                <div class="category-actions">
                    <button class="action-btn" onclick="budgetApp.editCategory(${cat.id})">Edit</button>
                    <button class="action-btn delete" onclick="budgetApp.deleteCategory(${cat.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    editCategory(catId) {
        const cat = this.categories.find(c => c.id === catId);
        if (!cat) return;

        document.getElementById('categoryName').value = cat.name;
        document.getElementById('categoryIcon').value = cat.icon;
        document.getElementById('categoryColor').value = cat.color;

        this.currentEditId = catId;
        this.openCategoryModal();
    }

    deleteCategory(catId) {
        if (this.transactions.some(t => t.categoryId === catId)) {
            alert('Cannot delete category with existing transactions');
            return;
        }
        if (confirm('Are you sure you want to delete this category?')) {
            this.categories = this.categories.filter(c => c.id !== catId);
            this.save();
            this.updateAllDisplays();
        }
    }

    openCategoryModal() {
        this.currentEditId = null;
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryColor').value = '#4a7c59';
        const modal = document.getElementById('categoryModal');
        modal.style.display = 'block';
    }

    saveCategory(e) {
        e.preventDefault();

        const name = document.getElementById('categoryName').value;
        const icon = document.getElementById('categoryIcon').value;
        const color = document.getElementById('categoryColor').value;

        if (this.currentEditId) {
            const cat = this.categories.find(c => c.id === this.currentEditId);
            if (cat) {
                cat.name = name;
                cat.icon = icon;
                cat.color = color;
            }
        } else {
            const type = name.toLowerCase().includes('salary') || name.toLowerCase().includes('bonus') ? 'income' : 'expense';
            this.categories.push({
                id: Date.now(),
                name, icon, color, type
            });
        }

        this.save();
        this.updateAllDisplays();
        this.closeModal(document.getElementById('categoryModal'));
    }

    updateCategorySelects() {
        const selects = document.querySelectorAll('#transCategory, #budgetCategory');
        const options = this.categories.map(cat => 
            `<option value="${cat.id}">${cat.name}</option>`
        ).join('');

        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select a category</option>' + options;
            select.value = currentValue;
        });
    }

    // Budget Functions
    renderBudgets() {
        const container = document.getElementById('budgetsList');
        const currencySymbol = this.getCurrencySymbol();

        if (this.budgets.length === 0) {
            container.innerHTML = '<p class="empty-message">No budgets set yet. Create one to start tracking!</p>';
            return;
        }

        container.innerHTML = this.budgets.map(budget => {
            const category = this.getCategory(budget.categoryId);
            const spent = this.calculateSpentAmount(budget.categoryId, budget.period);
            const percentage = (spent / budget.amount) * 100;
            const status = percentage >= 100 ? 'exceeded' : percentage >= budget.alertThreshold ? 'warning' : 'ok';

            return `
                <div class="budget-card ${status}">
                    <div class="budget-header">
                        <div class="budget-title">
                            <h4>${category.name}</h4>
                            <p>${budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}</p>
                        </div>
                        <div class="budget-actions">
                            <button class="action-btn" onclick="budgetApp.editBudget(${budget.id})">Edit</button>
                            <button class="action-btn delete" onclick="budgetApp.deleteBudget(${budget.id})">Delete</button>
                        </div>
                    </div>
                    <div class="budget-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                        </div>
                        <div class="progress-info">
                            <span>${currencySymbol}${spent.toFixed(2)} / ${currencySymbol}${budget.amount.toFixed(2)}</span>
                            <span>${Math.round(percentage)}%</span>
                        </div>
                    </div>
                    ${percentage >= 100 ? '<p class="budget-warning">Budget exceeded!</p>' : ''}
                </div>
            `;
        }).join('');
    }

    editBudget(budgetId) {
        const budget = this.budgets.find(b => b.id === budgetId);
        if (!budget) return;

        document.getElementById('budgetCategory').value = budget.categoryId;
        document.getElementById('budgetAmount').value = budget.amount;
        document.getElementById('budgetPeriod').value = budget.period;
        document.getElementById('budgetAlert').value = budget.alertThreshold;

        this.currentEditId = budgetId;
        this.openBudgetModal();
    }

    deleteBudget(budgetId) {
        if (confirm('Are you sure you want to delete this budget?')) {
            this.budgets = this.budgets.filter(b => b.id !== budgetId);
            this.save();
            this.updateAllDisplays();
        }
    }

    openBudgetModal() {
        this.currentEditId = null;
        document.getElementById('budgetForm').reset();
        document.getElementById('budgetAlert').value = 80;
        const modal = document.getElementById('budgetModal');
        modal.style.display = 'block';
    }

    saveBudget(e) {
        e.preventDefault();

        const categoryId = parseInt(document.getElementById('budgetCategory').value);
        const amount = parseFloat(document.getElementById('budgetAmount').value);
        const period = document.getElementById('budgetPeriod').value;
        const alertThreshold = parseFloat(document.getElementById('budgetAlert').value);

        if (this.currentEditId) {
            const budget = this.budgets.find(b => b.id === this.currentEditId);
            if (budget) {
                budget.categoryId = categoryId;
                budget.amount = amount;
                budget.period = period;
                budget.alertThreshold = alertThreshold;
            }
        } else {
            this.budgets.push({
                id: Date.now(),
                categoryId, amount, period, alertThreshold,
                createdAt: new Date().toISOString()
            });
        }

        this.save();
        this.updateAllDisplays();
        this.closeModal(document.getElementById('budgetModal'));
    }

    calculateSpentAmount(categoryId, period) {
        let filtered = this.transactions.filter(t => 
            t.categoryId === categoryId && t.type === 'expense'
        );

        if (period === 'monthly') {
            const now = new Date();
            filtered = filtered.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
            });
        } else if (period === 'quarterly') {
            const now = new Date();
            const quarter = Math.floor(now.getMonth() / 3);
            filtered = filtered.filter(t => {
                const tDate = new Date(t.date);
                return Math.floor(tDate.getMonth() / 3) === quarter && tDate.getFullYear() === now.getFullYear();
            });
        } else if (period === 'yearly') {
            const now = new Date();
            filtered = filtered.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getFullYear() === now.getFullYear();
            });
        }

        return filtered.reduce((sum, t) => sum + t.amount, 0);
    }

    // Reports
    renderReports() {
        const reportContainer = document.querySelector('.reports-container');
        reportContainer.innerHTML = `
            <div class="report-card">
                <h3>Monthly Summary</h3>
                <div id="monthlySummary" class="report-content">
                    <p>Click "Generate Report" to create a report</p>
                </div>
            </div>
            <div class="report-card">
                <h3>Category Breakdown</h3>
                <div id="categoryBreakdown" class="report-content">
                    <p>Click "Generate Report" to create a report</p>
                </div>
            </div>
        `;
    }

    generateReport() {
        const dateRange = document.getElementById('reportDateRange').value;
        const filtered = this.getFilteredByDateRange(dateRange);
        const totals = this.calculateTotals(filtered);
        const currencySymbol = this.getCurrencySymbol();

        const monthlySummary = document.getElementById('monthlySummary');
        monthlySummary.innerHTML = `
            <div class="report-stats">
                <div class="stat-item">
                    <span>Total Income:</span>
                    <strong class="income-text">${currencySymbol}${totals.income.toFixed(2)}</strong>
                </div>
                <div class="stat-item">
                    <span>Total Expenses:</span>
                    <strong class="expense-text">${currencySymbol}${totals.expense.toFixed(2)}</strong>
                </div>
                <div class="stat-item">
                    <span>Net Balance:</span>
                    <strong>${currencySymbol}${totals.balance.toFixed(2)}</strong>
                </div>
                <div class="stat-item">
                    <span>Savings Rate:</span>
                    <strong>${totals.income > 0 ? ((totals.balance / totals.income) * 100).toFixed(2) : 0}%</strong>
                </div>
            </div>
        `;

        const categoryBreakdown = document.getElementById('categoryBreakdown');
        const categoryData = this.getCategoryBreakdown(filtered);
        
        categoryBreakdown.innerHTML = `
            <table class="breakdown-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(categoryData).map(([name, amount]) => {
                        const percentage = totals.expense > 0 ? ((amount / totals.expense) * 100).toFixed(2) : 0;
                        return `
                            <tr>
                                <td>${name}</td>
                                <td>${currencySymbol}${amount.toFixed(2)}</td>
                                <td>${percentage}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    // Helper Functions
    calculateTotals(transactions) {
        return {
            income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
            expense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
            balance: transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)
        };
    }

    getFilteredTransactions() {
        const range = document.getElementById('dateRangeFilter').value;
        return this.getFilteredByDateRange(range);
    }

    getFilteredByDateRange(range) {
        const now = new Date();
        let filtered = this.transactions;

        if (range === 'month') {
            filtered = filtered.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
            });
        } else if (range === 'quarter') {
            const quarter = Math.floor(now.getMonth() / 3);
            filtered = filtered.filter(t => {
                const tDate = new Date(t.date);
                return Math.floor(tDate.getMonth() / 3) === quarter && tDate.getFullYear() === now.getFullYear();
            });
        } else if (range === 'year') {
            filtered = filtered.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getFullYear() === now.getFullYear();
            });
        }

        return filtered;
    }

    getCategoryBreakdown(transactions) {
        const breakdown = {};
        
        transactions.filter(t => t.type === 'expense').forEach(trans => {
            const category = this.getCategory(trans.categoryId);
            if (!breakdown[category.name]) {
                breakdown[category.name] = 0;
            }
            breakdown[category.name] += trans.amount;
        });

        return breakdown;
    }

    getTrendData(transactions) {
        const data = {};
        transactions.forEach(trans => {
            const date = trans.date;
            if (!data[date]) {
                data[date] = { income: 0, expense: 0 };
            }
            if (trans.type === 'income') {
                data[date].income += trans.amount;
            } else {
                data[date].expense += trans.amount;
            }
        });

        const sortedDates = Object.keys(data).sort();
        return {
            labels: sortedDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            income: sortedDates.map(d => data[d].income),
            expense: sortedDates.map(d => data[d].expense)
        };
    }

    getCategory(id) {
        return this.categories.find(c => c.id === id) || this.categories[0];
    }

    getColors(labels) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
        return labels.map((_, i) => colors[i % colors.length]);
    }

    getCurrencySymbol() {
        const symbols = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
        return symbols[this.currency] || '$';
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        if (this.dateFormat === 'DD/MM/YYYY') {
            return date.toLocaleDateString('en-GB');
        } else if (this.dateFormat === 'YYYY-MM-DD') {
            return dateString;
        } else {
            return date.toLocaleDateString('en-US');
        }
    }

    closeModal(modal) {
        modal.style.display = 'none';
    }

    // Data Management
    exportData() {
        const dataStr = JSON.stringify({
            transactions: this.transactions,
            categories: this.categories,
            budgets: this.budgets
        }, null, 2);
        
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `budget-tracker-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportAsJSON() {
        this.exportData();
    }

    exportAsCSV() {
        let csv = 'Date,Description,Category,Type,Amount,Notes\n';
        
        this.transactions.forEach(trans => {
            const category = this.getCategory(trans.categoryId);
            csv += `"${trans.date}","${trans.description}","${category.name}","${trans.type}","${trans.amount}","${trans.notes}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `budget-tracker-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    clearAllData() {
        this.transactions = [];
        this.budgets = [];
        this.save();
        this.updateAllDisplays();
    }

    confirmClearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone!')) {
            if (confirm('Really sure? This will delete all transactions and budgets!')) {
                this.clearAllData();
            }
        }
    }

    save() {
        localStorage.setItem('btTransactions', JSON.stringify(this.transactions));
        localStorage.setItem('btCategories', JSON.stringify(this.categories));
        localStorage.setItem('btBudgets', JSON.stringify(this.budgets));
    }

    updateAllDisplays() {
        this.updateCategorySelects();
        this.renderDashboard();
        if (document.getElementById('transactionsTableBody')) this.renderTransactions();
        if (document.getElementById('categoriesList')) this.renderCategories();
        if (document.getElementById('budgetsList')) this.renderBudgets();
    }
}

// Initialize the app
let budgetApp;
document.addEventListener('DOMContentLoaded', () => {
    budgetApp = new BudgetTracker();
});
