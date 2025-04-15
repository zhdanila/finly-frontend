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
    updateTransaction,
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
    const [newBudget, setNewBudget] = useState({ currency: '', amount: '' });
    const [budgetHistory, setBudgetHistory] = useState([]);
    const [chartData, setChartData] = useState({});
    const [categories, setCategories] = useState([]);
    const [userInfo, setUserInfo] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [newTransaction, setNewTransaction] = useState({
        amount: '',
        category_id: '',
        budget_id: '',
        type: 'withdrawal',
        note: '',
    });
    const [editTransaction, setEditTransaction] = useState(null);
    const [showTransactionForm, setShowTransactionForm] = useState(false);
    const [showTransactions, setShowTransactions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const fetchCategories = async () => {
        try {
            const userInfoResponse = await getUserInfo(token);
            const userData = userInfoResponse.data;
            setUserInfo({
                firstName: userData.first_name,
                lastName: userData.last_name,
                email: userData.email,
            });
            const response = await getCategories(token, userData.id);
            setCategories(response.data.categories || []);
        } catch (err) {
            setError('Failed to load categories.');
        }
    };

    const fetchBudgetBalance = async (budgetId) => {
        try {
            const response = await getBalance(token, budgetId);
            const historyData = response.data.budget_history || [];
            const latestBalance = historyData.length > 0 ? historyData[historyData.length - 1].balance : 0;
            setBalance(latestBalance);
        } catch (err) {
            setError('Failed to load balance.');
        }
    };

    const fetchBudget = async () => {
        try {
            setIsLoading(true);
            const response = await getBudgetById(token);
            const data = response.data;

            if (data && Object.keys(data).length > 0) {
                setBudget(data);
                fetchBudgetHistory(data.id);
                fetchBudgetBalance(data.id);
                fetchTransactions();
                setNewTransaction((prev) => ({
                    ...prev,
                    budget_id: data.id,
                }));
            } else {
                setBudget(null);
                setBalance(null);
                setTransactions([]);
                setBudgetHistory([]);
            }
        } catch (err) {
            setError('Failed to load budget.');
            setBudget(null);
            setBalance(null);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            const response = await listTransactions(token);
            setTransactions(response.data.transactions || []);
        } catch (err) {
            setError('Failed to load transactions.');
        }
    };

    const fetchBudgetHistory = async (budgetId) => {
        try {
            const response = await getBudgetHistory(token, budgetId);
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
                        fill: true,
                        backgroundColor: (context) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                            gradient.addColorStop(0, 'rgba(52, 202, 165, 0.3)');
                            gradient.addColorStop(1, 'rgba(52, 202, 165, 0)');
                            return gradient;
                        },
                        borderColor: '#34CAA5',
                        borderWidth: 3,
                        tension: 0.5,
                        pointRadius: 0,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#34CAA5',
                        pointBorderWidth: 2,
                    },
                ],
            });
        } catch (err) {
            setError('Failed to load budget history.');
        }
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                titleFont: { size: 14, weight: '600', family: "'Inter', sans-serif" },
                bodyFont: { size: 12, family: "'Inter', sans-serif" },
                padding: 12,
                cornerRadius: 8,
                boxPadding: 6,
                callbacks: {
                    label: (context) => `Balance: ${context.parsed.y} ${budget?.currency || ''}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: 'var(--text-muted)',
                    font: { size: 12, family: "'Inter', sans-serif" },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 8,
                },
            },
            y: {
                grid: {
                    color: 'rgba(200, 200, 200, 0.2)',
                    drawBorder: false,
                },
                ticks: {
                    color: 'var(--text-muted)',
                    font: { size: 12, family: "'Inter', sans-serif" },
                    callback: (value) =>
                        value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K` : value,
                    maxTicksLimit: 6,
                    padding: 10,
                },
            },
        },
        elements: { line: { tension: 0.5 }, point: { radius: 0, hoverRadius: 8, hitRadius: 10 } },
        animation: { duration: 1200, easing: 'easeOutQuart' },
        hover: { mode: 'nearest', intersect: true },
    };

    useEffect(() => {
        if (token) {
            setIsLoading(true);
            Promise.all([fetchBudget(), fetchCategories()])
                .catch(() => setError('Failed to load initial data.'))
                .finally(() => setIsLoading(false));
        } else {
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
            setNewBudget({ currency: '', amount: '' });
            await fetchBudget();
        } catch (err) {
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
            fetchBudget();
            setShowTransactionForm(false);
        } catch (err) {
            setError('Failed to create transaction.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditTransaction = (transaction) => {
        setEditTransaction({
            id: transaction.id,
            amount: transaction.amount.toString(),
            category_id: transaction.category_id || '',
            budget_id: transaction.budget_id || budget?.id || '',
            type: transaction.type || 'withdrawal',
            note: transaction.note || '',
        });
        setShowTransactionForm(true);
    };

    const handleUpdateTransaction = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const transactionData = {
                amount: parseFloat(editTransaction.amount),
                category_id: editTransaction.category_id || undefined,
                budget_id: editTransaction.budget_id ? parseInt(editTransaction.budget_id) : undefined,
                type: editTransaction.type || undefined,
                note: editTransaction.note || undefined,
            };
            await updateTransaction(token, editTransaction.id, transactionData);
            setEditTransaction(null);
            setShowTransactionForm(false);
            fetchTransactions();
            fetchBudget();
        } catch (err) {
            setError('Failed to update transaction.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditTransaction(null);
        setShowTransactionForm(false);
    };

    return (
        <div className="budget-container">
            {isLoading && <div className="loader">Loading...</div>}
            {error && <div className="error-message">{error}</div>}

            {/* Header Section */}
            <header className="budget-header">
                {userInfo ? (
                    <div className="user-info">
                        <h1>
                            Hello, {userInfo.firstName} {userInfo.lastName}
                        </h1>
                        <p>{userInfo.email}</p>
                    </div>
                ) : (
                    <div className="user-info">
                        <h1>Loading user info...</h1>
                    </div>
                )}
            </header>

            {!isLoading && budget ? (
                <div className="budget-dashboard">
                    {/* Balance Card */}
                    <div className="balance-card">
                        <h2>Current Balance</h2>
                        <p className="balance-amount">
                            {balance !== null ? `${balance} ${budget.currency}` : 'Loading...'}
                        </p>
                    </div>

                    {/* Chart Section */}
                    <div className="budget-history-chart">
                        <h2>Balance History</h2>
                        {budgetHistory.length > 0 ? (
                            <div className="chart-wrapper">
                                <Line data={chartData} options={chartOptions} />
                            </div>
                        ) : (
                            <p className="empty-message">No history available.</p>
                        )}
                    </div>

                    {/* Transaction Form */}
                    <div className="transaction-section">
                        <button
                            className={`action-btn ${showTransactionForm ? 'cancel' : ''}`}
                            onClick={() => {
                                setEditTransaction(null);
                                setShowTransactionForm(!showTransactionForm);
                            }}
                        >
                            {showTransactionForm ? (
                                <span>Cancel</span>
                            ) : (
                                <span>Add Transaction</span>
                            )}
                        </button>

                        {showTransactionForm && (
                            <div className="transaction-form-card">
                                <h3>{editTransaction ? 'Edit Transaction' : 'New Transaction'}</h3>
                                <form
                                    onSubmit={editTransaction ? handleUpdateTransaction : handleCreateTransaction}
                                    className="transaction-form"
                                >
                                    <div className="form-group">
                                        <label htmlFor="transaction-type">Type</label>
                                        <select
                                            id="transaction-type"
                                            value={editTransaction ? editTransaction.type : newTransaction.type}
                                            onChange={(e) =>
                                                editTransaction
                                                    ? setEditTransaction({ ...editTransaction, type: e.target.value })
                                                    : setNewTransaction({ ...newTransaction, type: e.target.value })
                                            }
                                            required
                                        >
                                            <option value="withdrawal">Expense</option>
                                            <option value="deposit">Income</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="transaction-amount">Amount</label>
                                        <input
                                            id="transaction-amount"
                                            type="number"
                                            placeholder="0.00"
                                            value={editTransaction ? editTransaction.amount : newTransaction.amount}
                                            onChange={(e) =>
                                                editTransaction
                                                    ? setEditTransaction({ ...editTransaction, amount: e.target.value })
                                                    : setNewTransaction({ ...newTransaction, amount: e.target.value })
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
                                            value={
                                                editTransaction
                                                    ? editTransaction.category_id
                                                    : newTransaction.category_id
                                            }
                                            onChange={(e) =>
                                                editTransaction
                                                    ? setEditTransaction({
                                                        ...editTransaction,
                                                        category_id: e.target.value,
                                                    })
                                                    : setNewTransaction({
                                                        ...newTransaction,
                                                        category_id: e.target.value,
                                                    })
                                            }
                                            required
                                        >
                                            <option value="" disabled>
                                                Select category
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
                                            placeholder="Add a note..."
                                            value={editTransaction ? editTransaction.note : newTransaction.note}
                                            onChange={(e) =>
                                                editTransaction
                                                    ? setEditTransaction({ ...editTransaction, note: e.target.value })
                                                    : setNewTransaction({ ...newTransaction, note: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="form-actions">
                                        <button type="submit" className="submit-btn">
                                            {editTransaction ? 'Update' : 'Save'}
                                        </button>
                                        <button type="button" className="cancel-btn" onClick={handleCancelEdit}>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Transactions List */}
                    <div className="transaction-list">
                        <div className="transaction-header">
                            <h2>Recent Transactions</h2>
                            <button
                                className="toggle-btn"
                                onClick={() => setShowTransactions(!showTransactions)}
                            >
                                {showTransactions ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {showTransactions && (
                            <div className="transaction-table">
                                {transactions.length > 0 ? (
                                    transactions.map((transaction) => (
                                        <div key={transaction.id} className="transaction-row">
                                            <div className="transaction-type">
                                                {transaction.type === 'withdrawal' ? 'Expense' : 'Income'}
                                            </div>
                                            <div className="transaction-amount">
                                                {transaction.amount} {budget?.currency}
                                            </div>
                                            <div className="transaction-category">
                                                {categories.find((cat) => cat.id === transaction.category_id)?.name ||
                                                    'Unknown'}
                                            </div>
                                            <div className="transaction-note">{transaction.note || '-'}</div>
                                            <div className="transaction-date">
                                                {new Date(transaction.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="transaction-actions">
                                                <button
                                                    className="edit-btn"
                                                    onClick={() => handleEditTransaction(transaction)}
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="empty-message">No transactions yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                !isLoading && (
                    <div className="create-budget-card">
                        <h2>Create Your Budget</h2>
                        <form onSubmit={handleCreate} className="budget-form">
                            <div className="form-group">
                                <label htmlFor="currency">Currency</label>
                                <select
                                    id="currency"
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
                            </div>
                            <div className="form-group">
                                <label htmlFor="amount">Initial Amount</label>
                                <input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={newBudget.amount}
                                    onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <button type="submit" className="submit-btn">
                                Create Budget
                            </button>
                        </form>
                    </div>
                )
            )}
        </div>
    );
};

export default Budget;