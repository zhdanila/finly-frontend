import React, { useEffect, useState } from 'react';
import {
    createBudget,
    createTransaction,
    getBudgetById,
    getBudgetHistory,
    getCategories,
    getUserInfo,
    listTransactions
} from '../../api/api.js';
import { Line } from 'react-chartjs-2';
import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip
} from 'chart.js';
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
    const [showTransactions, setShowTransactions] = useState(false); // New state to control transaction visibility

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
        try {
            const response = await listTransactions(token); // без userId
            console.log(response.data);  // Для перевірки структури відповіді
            setTransactions(response.data.transactions || []);
        } catch (err) {
            console.error('Error loading transactions:', err);
            setError('Failed to load transactions.');
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
            fetchTransactions();
        }
    }, [token]);

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
                    </div>

                    <div className="budget-history-chart">
                        <h3>Budget History</h3>
                        {budgetHistory.length > 0 ? (
                            <Line data={chartData} options={chartOptions} />
                        ) : (
                            <p>History is empty.</p>
                        )}
                    </div>

                    <div className="transaction-actions">
                        <button
                            className={`add-transaction-btn ${showTransactionForm ? 'cancel' : ''}`}
                            onClick={() => setShowTransactionForm(!showTransactionForm)}
                        >
                            <span className="icon">
                                {showTransactionForm ? '❌' : '➕'}
                            </span>
                            {showTransactionForm ? 'Cancel' : 'Add Transaction'}
                        </button>
                    </div>

                    {showTransactionForm && (
                        <div className="transaction-form-container">
                            <h4>New Transaction</h4>
                            <form onSubmit={handleCreateTransaction} className="transaction-form">
                                <div className="form-group">
                                    <label htmlFor="transaction-type">Transaction Type</label>
                                    <select
                                        id="transaction-type"
                                        value={newTransaction.type}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                                        required
                                    >
                                        <option value="withdrawal">Expense (Withdrawal)</option>
                                        <option value="deposit">Income (Deposit)</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="transaction-amount">Amount</label>
                                    <input
                                        id="transaction-amount"
                                        type="number"
                                        placeholder="Enter amount"
                                        value={newTransaction.amount}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                                        required
                                        min="0.01"
                                        step="0.01"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="transaction-category">Category</label>
                                    <select
                                        id="transaction-category"
                                        value={newTransaction.category_id}
                                        onChange={(e) =>
                                            setNewTransaction({ ...newTransaction, category_id: e.target.value })
                                        }
                                        required
                                    >
                                        <option value="" disabled>
                                            Select a category
                                        </option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="transaction-note">Note (Optional)</label>
                                    <input
                                        id="transaction-note"
                                        type="text"
                                        placeholder="Add a note"
                                        value={newTransaction.note}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, note: e.target.value })}
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="submit" className="submit-btn">
                                        Save Transaction
                                    </button>
                                    <button
                                        type="button"
                                        className="cancel-btn"
                                        onClick={() => setShowTransactionForm(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="transaction-list">
                        <h3>Recent Transactions</h3>
                        <button onClick={() => setShowTransactions(!showTransactions)}>
                            {showTransactions ? 'Hide Transactions' : 'Show Transactions'}
                        </button>
                        {showTransactions && (
                            <ul>
                                {transactions.map((transaction) => (
                                    <li key={transaction.id} className="transaction-item">
                                        <div className="transaction-type">
                                            <strong>{transaction.type === 'withdrawal' ? 'Expense' : 'Income'}</strong>
                                        </div>
                                        <div className="transaction-details">
                                            <span>{transaction.amount} {budget?.currency}</span>
                                            <span className="category-name">
                                                {categories.find(cat => cat.id === transaction.category_id)?.name}
                                            </span>
                                            {transaction.note && <span className="note">{transaction.note}</span>}
                                        </div>
                                        <div className="transaction-date">
                                            {new Date(transaction.created_at).toLocaleDateString()}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            ) : (
                <p>No budget available.</p>
            )}
        </div>
    );
};

export default Budget;
