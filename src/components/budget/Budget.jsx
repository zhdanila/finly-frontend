import React, { useEffect, useState } from 'react';
import { createBudget, getBudgetById, getBudgetHistory, getCategories, getUserInfo, createTransaction, listTransactions } from '../../api/api.js';
import { Line } from 'react-chartjs-2';
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from 'chart.js';
import './Budget.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Budget = ({ token }) => {
    const [budget, setBudget] = useState(null);
    const [error, setError] = useState('');
    const [newBudget, setNewBudget] = useState({ currency: '', amount: '', categoryId: '' });
    const [budgetHistory, setBudgetHistory] = useState([]);
    const [chartData, setChartData] = useState({});
    const [categories, setCategories] = useState([]);
    const [userId, setUserId] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [newTransaction, setNewTransaction] = useState({
        amount: '',
        category_id: '',
        budget_id: '',
        type: 'withdrawal', // Default to withdrawal (expense)
        note: ''
    });
    const [showTransactionForm, setShowTransactionForm] = useState(false);

    const fetchCategories = async () => {
        try {
            const userInfo = await getUserInfo(token);
            const userId = userInfo.data.id;
            setUserId(userId);
            const response = await getCategories(token, userId);
            setCategories(response.data.categories);
        } catch (err) {
            console.error('Error loading categories:', err);
        }
    };

    const fetchBudget = async () => {
        try {
            const response = await getBudgetById(token);
            const data = response.data;

            if (data && Object.keys(data).length > 0) {
                setBudget(data);
                fetchBudgetHistory(data.id);

                // Update the newTransaction with the budget ID
                setNewTransaction(prev => ({
                    ...prev,
                    budget_id: data.id
                }));
            } else {
                setBudget(null);
            }
        } catch (err) {
            setError('Failed to load budget.');
        }
    };

    const fetchTransactions = async () => {
        if (!userId) return;

        try {
            const response = await listTransactions(token, userId);
            setTransactions(response.data.transactions || []);
        } catch (err) {
            console.error('Error loading transactions:', err);
        }
    };

    const fetchBudgetHistory = async (budgetId) => {
        try {
            const response = await getBudgetHistory(token, budgetId);
            const historyData = response.data.budget_history;
            setBudgetHistory(historyData);

            const labels = historyData.map(item => {
                const date = new Date(item.created_at);
                return `${date.getDate()}.${date.getMonth() + 1}`;
            });

            const balances = historyData.map(item => item.balance);

            setChartData({
                labels: labels,
                datasets: [
                    {
                        label: 'Budget Balance',
                        data: balances,
                        fill: false,
                        borderColor: '#4bc0c0',
                        borderWidth: 2,
                        tension: 0.2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                    },
                ],
            });
        } catch (err) {
            setError('Failed to load budget history.');
        }
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `Balance: ${context.formattedValue}`;
                    }
                }
            },
            title: { display: false },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#666',
                    font: { size: 10 },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 6,
                }
            },
            y: {
                grid: { display: false },
                ticks: {
                    color: '#666',
                    font: { size: 10 },
                    callback: function (value) {
                        return value >= 1000 ? (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : value;
                    },
                    maxTicksLimit: 5,
                },
            },
        },
        elements: {
            line: { tension: 0.3 },
            point: { radius: 0, hoverRadius: 4 },
        },
    };

    useEffect(() => {
        if (token) {
            fetchBudget();
            fetchCategories();
        }
    }, [token]);

    useEffect(() => {
        if (userId) {
            fetchTransactions();
        }
    }, [userId]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createBudget(token, newBudget);
            setNewBudget({ currency: '', amount: '', categoryId: '' });
            fetchBudget();
        } catch (err) {
            setError('Failed to create budget.');
        }
    };

    const handleCreateTransaction = async (e) => {
        e.preventDefault();
        try {
            const transactionData = {
                ...newTransaction,
                amount: parseFloat(newTransaction.amount)
            };

            // The API expects User-Id in the header, but createTransaction function should handle this
            await createTransaction(token, transactionData);

            setNewTransaction({
                amount: '',
                category_id: '',
                budget_id: budget ? budget.id : '',
                type: 'withdrawal',
                note: ''
            });

            fetchTransactions();
            fetchBudget(); // Refresh budget to show updated balance
            setShowTransactionForm(false);
        } catch (err) {
            setError('Failed to create transaction.');
            console.error('Transaction error:', err);
        }
    };

    return (
        <div className="budget-container">
            <h2>My Budget</h2>

            {error && <p className="error-message">{error}</p>}

            {budget ? (
                <div className="budget-card">
                    <div className="budget-info">
                        <h3>Main Budget</h3>
                        <p>{budget.amount} {budget.currency}</p>

                        <button
                            className="add-transaction-btn"
                            onClick={() => setShowTransactionForm(!showTransactionForm)}
                        >
                            {showTransactionForm ? 'Cancel' : 'Add Transaction'}
                        </button>

                        {showTransactionForm && (
                            <div className="transaction-form-container">
                                <h4>New Transaction</h4>
                                <form onSubmit={handleCreateTransaction} className="transaction-form">
                                    <select
                                        value={newTransaction.type}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                                        required
                                    >
                                        <option value="withdrawal">Expense (Withdrawal)</option>
                                        <option value="deposit">Income (Deposit)</option>
                                    </select>

                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={newTransaction.amount}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                                        required
                                        min="0.01"
                                        step="0.01"
                                    />

                                    <input
                                        type="text"
                                        placeholder="Note"
                                        value={newTransaction.note}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, note: e.target.value })}
                                    />

                                    <select
                                        value={newTransaction.category_id}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, category_id: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled>Select Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>

                                    <input type="hidden" value={budget.id} />

                                    <button type="submit">Save Transaction</button>
                                </form>
                            </div>
                        )}
                    </div>

                    <div className="budget-history-chart">
                        <h3>Budget History</h3>
                        {budgetHistory.length > 0 ? (
                            <Line data={chartData} options={chartOptions} />
                        ) : (
                            <p>History is empty.</p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="modal-backdrop always-visible">
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Create a Budget</h3>
                        <form onSubmit={handleCreate} className="budget-form">
                            <select
                                value={newBudget.currency}
                                onChange={(e) => setNewBudget({ ...newBudget, currency: e.target.value })}
                                required
                            >
                                <option value="" disabled>Select Currency</option>
                                <option value="USD">USD — US Dollar</option>
                                <option value="EUR">EUR — Euro</option>
                                <option value="UAH">UAH — Ukrainian Hryvnia</option>
                                {/* More currencies */}
                            </select>

                            <input
                                type="number"
                                placeholder="Initial Amount"
                                value={newBudget.amount}
                                onChange={(e) => setNewBudget({ ...newBudget, amount: parseFloat(e.target.value) || 0 })}
                                required
                                min="0"
                                step="100"
                            />

                            <select
                                value={newBudget.categoryId}
                                onChange={(e) => setNewBudget({ ...newBudget, categoryId: e.target.value })}
                                required
                            >
                                <option value="" disabled>Select Category</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>

                            <button type="submit">Add</button>
                        </form>
                    </div>
                </div>
            )}

            {budget && (
                <div className="transactions-section">
                    <h3>Recent Transactions</h3>

                    {transactions.length > 0 ? (
                        <div className="transactions-list">
                            {transactions.slice(0, 5).map((transaction) => {
                                const category = categories.find(c => c.id === transaction.category_id);
                                return (
                                    <div key={transaction.id} className={`transaction-item ${transaction.type}`}>
                                        <div className="transaction-details">
                                            <h4>{transaction.note || 'No description'}</h4>
                                            <p className="transaction-category">{category ? category.name : 'Unknown category'}</p>
                                            <p className="transaction-date">{new Date(transaction.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className={`transaction-amount ${transaction.type}`}>
                                            {transaction.type === 'deposit' ? '+' : '-'}
                                            {transaction.amount} {budget.currency}
                                        </div>
                                    </div>
                                );
                            })}
                            {transactions.length > 5 && (
                                <button className="view-all-btn">View All Transactions</button>
                            )}
                        </div>
                    ) : (
                        <p className="no-data">No transactions yet. Add your first transaction above.</p>
                    )}
                </div>
            )}

            <div className="category-list">
                <h3>Categories</h3>
                <div className="budget-grid">
                    {categories.map((cat) => (
                        <div className="budget-card" key={cat.id}>
                            <h4>{cat.name}</h4>
                            <p>{cat.description}</p>
                            {cat.is_user_category && <span className="badge">Your Category</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Budget;