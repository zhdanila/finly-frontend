import React, { useEffect, useState } from 'react';
import {
    createBudget,
    createTransaction,
    getBalance,
    getBudgetById,
    getBudgetHistory,
    getCategories,
    getUserInfo,
    listTransactions,
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
    Tooltip,
} from 'chart.js';
import './Budget.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Budget = ({ token }) => {
    const [balance, setBalance] = useState(null);
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
        type: 'withdrawal',
        note: '',
    });
    const [showTransactionForm, setShowTransactionForm] = useState(false);
    const [showTransactions, setShowTransactions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const fetchCategories = async () => {
        try {
            const userInfo = await getUserInfo(token);
            const userId = userInfo.data.id;
            setUserId(userId);
            const response = await getCategories(token, userId);
            setCategories(response.data.categories || []);
            console.log('Categories fetched:', response.data);
        } catch (err) {
            console.error('Error loading categories:', err);
            setError('Failed to load categories.');
        }
    };

    const fetchBudgetBalance = async (budgetId) => {
        try {
            console.log('Fetching balance for budgetId:', budgetId);
            const response = await getBalance(token, budgetId);
            console.log('Balance response:', response.data);
            const historyData = response.data.budget_history || [];
            const latestBalance = historyData.length > 0 ? historyData[historyData.length - 1].balance : 0;
            setBalance(latestBalance);
        } catch (err) {
            console.error('Error loading balance:', err);
            setError('Failed to load balance.');
        }
    };

    const fetchBudget = async () => {
        try {
            setIsLoading(true);
            console.log('Fetching budget...');
            const response = await getBudgetById(token);
            console.log('Budget response:', response.data);
            const data = response.data;

            if (data && Object.keys(data).length > 0) {
                setBudget(data);
                // Only fetch related data if budget exists
                fetchBudgetHistory(data.id);
                fetchBudgetBalance(data.id);
                fetchTransactions();
                setNewTransaction((prev) => ({
                    ...prev,
                    budget_id: data.id,
                }));
            } else {
                console.warn('No budget data found');
                setBudget(null);
                setBalance(null);
                setTransactions([]); // Clear transactions for new users
                setBudgetHistory([]); // Clear history for new users
            }
        } catch (err) {
            console.error('Error loading budget:', err);
            setError('Failed to load budget.');
            setBudget(null);
            setBalance(null);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            console.log('Fetching transactions...');
            const response = await listTransactions(token);
            console.log('Transactions response:', response.data);
            setTransactions(response.data.transactions || []);
        } catch (err) {
            console.error('Error loading transactions:', err);
            setError('Failed to load transactions.');
        }
    };

    const fetchBudgetHistory = async (budgetId) => {
        try {
            console.log('Fetching budget history for budgetId:', budgetId);
            const response = await getBudgetHistory(token, budgetId);
            console.log('Budget history response:', response.data);
            const historyData = response.data.budget_history || [];
            setBudgetHistory(historyData);

            const labels = historyData.map((item) => {
                const date = new Date(item.created_at);
                return `${date.getDate()}.${date.getMonth() + 1}`;
            });

            const balances = historyData.map((item) => item.balance);

            setChartData({
                labels,
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
            console.error('Error loading budget history:', err);
            setError('Failed to load budget history.');
        }
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `Balance: ${context.formattedValue}`,
                },
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
                },
            },
            y: {
                grid: { display: false },
                ticks: {
                    color: '#666',
                    font: { size: 10 },
                    callback: (value) =>
                        value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K` : value,
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
            console.log('Token received:', token);
            setIsLoading(true);
            // Only fetch budget and categories initially
            Promise.all([fetchBudget(), fetchCategories()])
                .catch((err) => {
                    console.error('Error in initial fetch:', err);
                    setError('Failed to load initial data.');
                })
                .finally(() => setIsLoading(false));
        } else {
            console.warn('No token provided');
            setError('Please log in to view your budget.');
        }
    }, [token]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            await createBudget(token, {
                ...newBudget,
                amount: parseFloat(newBudget.amount) || 0,
            });
            setNewBudget({ currency: '', amount: '', categoryId: '' });
            // Fetch budget after creation to load new budget data
            await fetchBudget();
        } catch (err) {
            console.error('Error creating budget:', err);
            setError('Failed to create budget.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTransaction = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const transactionData = {
                ...newTransaction,
                amount: parseFloat(newTransaction.amount),
            };
            await createTransaction(token, transactionData);
            setNewTransaction({
                amount: '',
                category_id: '',
                budget_id: budget ? budget.id : '',
                type: 'withdrawal',
                note: '',
            });
            fetchTransactions();
            fetchBudget(); // Refreshes budget, balance, and history
            setShowTransactionForm(false);
        } catch (err) {
            console.error('Error creating transaction:', err);
            setError('Failed to create transaction.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="budget-container">
            <h2>My Budget</h2>

            {isLoading && <p>Loading...</p>}
            {error && <p className="error-message">{error}</p>}

            {!isLoading && budget ? (
                <div className="budget-card">
                    <div className="budget-info">
                        <h3>Main Budget</h3>
                        <p>{balance !== null ? `${balance} ${budget.currency}` : 'Loading balance...'}</p>
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
                            <span className="icon">{showTransactionForm ? '❌' : '➕'}</span>
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
                                        onChange={(e) =>
                                            setNewTransaction({ ...newTransaction, type: e.target.value })
                                        }
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
                                        onChange={(e) =>
                                            setNewTransaction({ ...newTransaction, amount: e.target.value })
                                        }
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
                                        onChange={(e) =>
                                            setNewTransaction({ ...newTransaction, note: e.target.value })
                                        }
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
                                            <strong>
                                                {transaction.type === 'withdrawal' ? 'Expense' : 'Income'}
                                            </strong>
                                        </div>
                                        <div className="transaction-details">
                                            <span>
                                                {transaction.amount} {budget?.currency}
                                            </span>
                                            <span className="category-name">
                                                {categories.find((cat) => cat.id === transaction.category_id)?.name ||
                                                    'Unknown'}
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
                !isLoading && (
                    <div className="modal-backdrop always-visible">
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <h3>Create a Budget</h3>
                            <form onSubmit={handleCreate} className="budget-form">
                                <select
                                    value={newBudget.currency}
                                    onChange={(e) => setNewBudget({ ...newBudget, currency: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>
                                        Select Currency
                                    </option>
                                    <option value="USD">USD — US Dollar</option>
                                    <option value="EUR">EUR — Euro</option>
                                    <option value="UAH">UAH — Ukrainian Hryvnia</option>
                                </select>

                                <input
                                    type="number"
                                    placeholder="Initial Amount"
                                    value={newBudget.amount}
                                    onChange={(e) =>
                                        setNewBudget({ ...newBudget, amount: e.target.value })
                                    }
                                    required
                                    min="0"
                                    step="0.01"
                                />

                                <button type="submit">Add</button>
                            </form>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

export default Budget;