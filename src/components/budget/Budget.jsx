import React, { useEffect, useState } from 'react';
import {
    createBudget,
    createTransaction,
    getBalance,
    getBudgetById,
    getBudgetHistory,
    getCategories,
    getCustomCategories,
    getUserInfo,
    listTransactions,
    updateTransaction,
    deleteTransaction,
    createCategory,
    deleteCategory,
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
    const [errors, setErrors] = useState([]);
    const [newBudget, setNewBudget] = useState({ currency: '', amount: '' });
    const [budgetHistory, setBudgetHistory] = useState([]);
    const [chartData, setChartData] = useState({});
    const [categories, setCategories] = useState([]);
    const [customCategories, setCustomCategories] = useState([]);
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
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '' });
    const [showTransactions, setShowTransactions] = useState(false);
    const [showCustomCategories, setShowCustomCategories] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [displayedTransactionsCount, setDisplayedTransactionsCount] = useState(5);

    const addError = (message, id) => {
        setErrors((prev) => [...prev, { id, message }]);
        setTimeout(() => {
            setErrors((prev) => prev.filter((err) => err.id !== id));
        }, 5000);
    };

    const handleError = (err, defaultMessage) => {
        const errorId = Date.now();
        if (err.response && err.response.data && err.response.data.message) {
            addError(err.response.data.message, errorId);
        } else if (err.message) {
            addError(err.message, errorId);
        } else {
            addError(defaultMessage, errorId);
        }
    };

    const fetchCategories = async () => {
        try {
            const userInfoResponse = await getUserInfo(token);
            const userData = userInfoResponse.data;
            setUserInfo({
                firstName: userData.first_name,
                lastName: userData.last_name,
                email: userData.email,
            });
            const [categoriesResponse, customCategoriesResponse] = await Promise.all([
                getCategories(token),
                getCustomCategories(token),
            ]);
            setCategories(categoriesResponse.data.categories || []);
            setCustomCategories(customCategoriesResponse.data.categories || []);
        } catch (err) {
            handleError(err, 'Failed to load categories.');
        }
    };

    const fetchBudgetBalance = async (budgetId) => {
        try {
            const response = await getBalance(token, budgetId);
            const historyData = response.data.budget_history || [];
            const latestBalance = historyData.length > 0 ? historyData[historyData.length - 1].balance : 0;
            setBalance(latestBalance);
        } catch (err) {
            handleError(err, 'Failed to load balance.');
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
            handleError(err, 'Failed to load budget.');
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
            handleError(err, 'Failed to load transactions.');
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
                            gradient.addColorStop(0, 'rgba(92, 158, 173, 0.3)');
                            gradient.addColorStop(1, 'rgba(92, 158, 173, 0)');
                            return gradient;
                        },
                        borderColor: '#5C9EAD',
                        borderWidth: 3,
                        tension: 0.5,
                        pointRadius: 0,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#5C9EAD',
                        pointBorderWidth: 2,
                    },
                ],
            });
        } catch (err) {
            handleError(err, 'Failed to load budget history.');
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
                titleFont: { size: 12, weight: '600', family: "'Inter', sans-serif" },
                bodyFont: { size: 10, family: "'Inter', sans-serif" },
                padding: 8,
                cornerRadius: 6,
                boxPadding: 4,
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
                    font: { size: 10, family: "'Inter', sans-serif" },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 6,
                },
            },
            y: {
                grid: {
                    color: 'rgba(200, 200, 200, 0.2)',
                    drawBorder: false,
                },
                ticks: {
                    color: 'var(--text-muted)',
                    font: { size: 10, family: "'Inter', sans-serif" },
                    callback: (value) =>
                        value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K` : value,
                    maxTicksLimit: 5,
                    padding: 8,
                },
            },
        },
        elements: { line: { tension: 0.5 }, point: { radius: 0, hoverRadius: 6, hitRadius: 8 } },
        animation: { duration: 800, easing: 'easeOutQuart' },
        hover: { mode: 'nearest', intersect: true },
    };

    useEffect(() => {
        if (token) {
            setIsLoading(true);
            Promise.all([fetchBudget(), fetchCategories()])
                .catch((err) => handleError(err, 'Failed to load initial data.'))
                .finally(() => setIsLoading(false));
        } else {
            addError('Please log in to view your budget.', Date.now());
        }
    }, [token]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768 && (showTransactionForm || showCategoryForm)) {
                setShowTransactionForm(false);
                setShowCategoryForm(false);
                setEditTransaction(null);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [showTransactionForm, showCategoryForm]);

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
            handleError(err, 'Failed to create budget.');
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
            handleError(err, 'Failed to create transaction.');
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
            handleError(err, 'Failed to update transaction.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTransaction = async (transactionId) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            try {
                setIsLoading(true);
                await deleteTransaction(token, transactionId);
                fetchTransactions();
                fetchBudget();
            } catch (err) {
                handleError(err, 'Failed to delete transaction.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            await createCategory(token, { name: newCategory.name });
            setNewCategory({ name: '' });
            fetchCategories();
            setShowCategoryForm(false);
        } catch (err) {
            handleError(err, 'Failed to create category.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                setIsLoading(true);
                await deleteCategory(token, categoryId);
                fetchCategories();
            } catch (err) {
                handleError(err, 'Failed to delete category.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleCancelCategory = () => {
        setNewCategory({ name: '' });
        setShowCategoryForm(false);
    };

    const handleCancelEdit = () => {
        setEditTransaction(null);
        setShowTransactionForm(false);
    };

    const closeError = (id) => {
        setErrors((prev) => prev.filter((err) => err.id !== id));
    };

    const displayedTransactions = transactions.slice(0, displayedTransactionsCount);

    return (
        <div className="budget-container">
            {isLoading && <div className="loader">Loading...</div>}
            {errors.length > 0 && (
                <div className="error-container">
                    {errors.map((error) => (
                        <div key={error.id} className="error-message">
                            <span>{error.message}</span>
                            <button
                                className="error-close-btn"
                                onClick={() => closeError(error.id)}
                                aria-label="Close error message"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <header className="budget-header">
                {userInfo ? (
                    <div className="user-info">
                        <h1>
                            Welcome, {userInfo.firstName} {userInfo.lastName}
                        </h1>
                        <p>{userInfo.email}</p>
                    </div>
                ) : (
                    <div className="user-info">
                        <h1>Loading user data...</h1>
                    </div>
                )}
            </header>

            {!isLoading && budget ? (
                <div className="budget-dashboard">
                    <div className="balance-card">
                        <h2>Current Balance</h2>
                        <p className="balance-amount">
                            {balance !== null ? `${balance} ${budget.currency}` : 'Loading...'}
                        </p>
                    </div>

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

                    <div className="transaction-section">
                        <div className="action-buttons">
                            <button
                                className={`action-btn ${showTransactionForm ? 'cancel' : ''}`}
                                onClick={() => {
                                    setEditTransaction(null);
                                    setShowTransactionForm(!showTransactionForm);
                                }}
                                aria-label={showTransactionForm ? 'Cancel transaction form' : 'Add new transaction'}
                            >
                                {showTransactionForm ? <span>Cancel</span> : <span>Add Transaction</span>}
                            </button>
                            <button
                                className={`action-btn ${showCategoryForm ? 'cancel' : ''}`}
                                onClick={() => setShowCategoryForm(!showCategoryForm)}
                                aria-label={showCategoryForm ? 'Cancel category form' : 'Add new category'}
                            >
                                {showCategoryForm ? <span>Cancel</span> : <span>Add Category</span>}
                            </button>
                            <button
                                className="action-btn"
                                onClick={() => setShowCustomCategories(!showCustomCategories)}
                                aria-label={showCustomCategories ? 'Hide custom categories' : 'View custom categories'}
                            >
                                {showCustomCategories ? <span>Hide Categories</span> : <span>View Categories</span>}
                            </button>
                        </div>

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
                                            aria-label="Transaction type"
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
                                            aria-label="Transaction amount"
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
                                            aria-label="Transaction category"
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
                                        <label htmlFor="transaction-note">Note (optional)</label>
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
                                            aria-label="Transaction note"
                                        />
                                    </div>

                                    <div className="form-actions">
                                        <button
                                            type="submit"
                                            className="submit-btn"
                                            aria-label={editTransaction ? 'Update transaction' : 'Save transaction'}
                                        >
                                            {editTransaction ? 'Update' : 'Save'}
                                        </button>
                                        <button
                                            type="button"
                                            className="cancel-btn"
                                            onClick={handleCancelEdit}
                                            aria-label="Cancel transaction form"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {showCategoryForm && (
                            <div className="category-form-card">
                                <h3>New Category</h3>
                                <form onSubmit={handleCreateCategory} className="category-form">
                                    <div className="form-group">
                                        <label htmlFor="category-name">Name</label>
                                        <input
                                            id="category-name"
                                            type="text"
                                            placeholder="Enter name..."
                                            value={newCategory.name}
                                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                            required
                                            aria-label="Category name"
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button
                                            type="submit"
                                            className="submit-btn"
                                            aria-label="Save category"
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            className="cancel-btn"
                                            onClick={handleCancelCategory}
                                            aria-label="Cancel category form"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {showCustomCategories && (
                            <div className="category-list">
                                <div className="category-header">
                                    <h2>Custom Categories</h2>
                                </div>
                                <div className="category-table-wrapper">
                                    <div className="category-table">
                                        {customCategories.length > 0 ? (
                                            customCategories.map((category) => (
                                                <div key={category.id} className="category-row">
                                                    <div className="category-name">{category.name}</div>
                                                    <div className="category-actions">
                                                        <button
                                                            className="delete-btn"
                                                            onClick={() => handleDeleteCategory(category.id)}
                                                            aria-label={`Delete category ${category.name}`}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="empty-message">No custom categories available.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="transaction-list">
                        <div className="transaction-header">
                            <h2>Recent Transactions</h2>
                            <button
                                className="toggle-btn"
                                onClick={() => setShowTransactions(!showTransactions)}
                                aria-label={showTransactions ? 'Hide transactions' : 'Show transactions'}
                            >
                                {showTransactions ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <div className="transaction-table-wrapper">
                            <div className={`transaction-table ${showTransactions ? 'visible' : 'hidden'}`}>
                                {displayedTransactions.length > 0 ? (
                                    displayedTransactions.map((transaction) => (
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
                                                    aria-label={`Edit transaction ${transaction.id}`}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => handleDeleteTransaction(transaction.id)}
                                                    aria-label={`Delete transaction ${transaction.id}`}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="empty-message">No transactions available.</p>
                                )}
                            </div>
                            {window.innerWidth < 768 && transactions.length > displayedTransactionsCount && (
                                <button
                                    className="action-btn"
                                    onClick={() => setDisplayedTransactionsCount((prev) => prev + 5)}
                                    aria-label="Load more transactions"
                                >
                                    Load More
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                !isLoading && (
                    <div className="create-budget-card">
                        <h2>Create Budget</h2>
                        <form onSubmit={handleCreate} className="budget-form">
                            <div className="form-group">
                                <label htmlFor="currency">Currency</label>
                                <select
                                    id="currency"
                                    value={newBudget.currency}
                                    onChange={(e) => setNewBudget({ ...newBudget, currency: e.target.value })}
                                    required
                                    aria-label="Budget currency"
                                >
                                    <option value="" disabled>
                                        Select currency
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
                                    aria-label="Initial budget amount"
                                />
                            </div>
                            <button
                                type="submit"
                                className="submit-btn"
                                aria-label="Create budget"
                            >
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
