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
    const [newBudget, setNewBudget] = useState({ currency: '', amount: '', categoryId: '' });
    const [budgetHistory, setBudgetHistory] = useState([]);
    const [chartData, setChartData] = useState({});
    const [categories, setCategories] = useState([]);
    const [userId, setUserId] = useState(null);
    const [userInfo, setUserInfo] = useState(null); // New state for user info
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
            setUserId(userData.id);
            const response = await getCategories(token, userData.id);
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
                setTransactions([]);
                setBudgetHistory([]);
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
            fetchBudget();
            setShowTransactionForm(false);
        } catch (err) {
            console.error('Error creating transaction:', err);
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
            console.error('Error updating transaction:', err);
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
            {/* User Info Section */}
            <div className="user-info">
                {isLoading ? (
                    <p>Loading user info...</p>
                ) : userInfo ? (
                    <>
                        <h3>Welcome, {userInfo.firstName} {userInfo.lastName}</h3>
                        <p>Email: {userInfo.email}</p>
                    </>
                ) : (
                    <p>Unable to load user info.</p>
                )}
            </div>

            {isLoading && <p>Loading...</p>}
            {error && <p className="error-message">{error}</p>}

            {!isLoading && budget ? (
                <div className="budget-card">
                    <div className="budget-info">
                        <p>Balance: {balance !== null ? `${balance} ${budget.currency}` : 'Loading balance...'}</p>
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
                            onClick={() => {
                                setEditTransaction(null);
                                setShowTransactionForm(!showTransactionForm);
                            }}
                        >
                            <span className="icon">{showTransactionForm ? '❌' : '➕'}</span>
                            {showTransactionForm ? 'Cancel' : 'Add Transaction'}
                        </button>
                    </div>

                    {showTransactionForm && (
                        <div className="transaction-form-container">
                            <h4>{editTransaction ? 'Edit Transaction' : 'New Transaction'}</h4>
                            <form
                                onSubmit={editTransaction ? handleUpdateTransaction : handleCreateTransaction}
                                className="transaction-form"
                            >
                                <div className="form-group">
                                    <label htmlFor="transaction-type">Transaction Type</label>
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
                                            editTransaction ? editTransaction.category_id : newTransaction.category_id
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
                                        {editTransaction ? 'Update Transaction' : 'Save Transaction'}
                                    </button>
                                    <button type="button" className="cancel-btn" onClick={handleCancelEdit}>
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
                                        <div className="transaction-actions">
                                            <button
                                                className="edit-btn"
                                                onClick={() => handleEditTransaction(transaction)}
                                            >
                                                Edit
                                            </button>
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