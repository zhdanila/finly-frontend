import axios from 'axios';

const API_URL = "http://backend.finly.click";

// === Auth Endpoints ===
export const login = (credentials) =>
    axios.post(`${API_URL}/auth/login`, credentials);

export const logout = (token) =>
    axios.post(`${API_URL}/auth/logout`, {authToken: token});

export const refreshToken = (token) =>
    axios.post(`${API_URL}/auth/refresh`, {authToken: token});

export const register = (userDetails) =>
    axios.post(`${API_URL}/auth/register`, userDetails);

export const getUserInfo = (token) =>
    axios.post(`${API_URL}/auth/me`, {}, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });


// === Budget Endpoints ===
export const createBudget = (token, budgetData) =>
    axios.post(`${API_URL}/budget`, budgetData, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

export const getBudgetById = (token) =>
    axios.get(`${API_URL}/budget`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

export const getBudgetHistory = (token, budgetId) =>
    axios.get(`${API_URL}/budget/${budgetId}/history`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

export const getBalance = (token, budgetId) =>
    axios.get(`${API_URL}/budget/${budgetId}/history`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

// === Category Endpoints ===
export const getCategories = (token) =>
    axios.get(`${API_URL}/category`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

export const getCustomCategories = (token) =>
    axios.get(`${API_URL}/category/custom`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

export const createCategory = (token, categoryData) =>
    axios.post(`${API_URL}/category`, categoryData, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

export const deleteCategory = (token, categoryId) =>
    axios.delete(`${API_URL}/category/${categoryId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

// === Transaction Endpoints ===
export const createTransaction = (token, transactionData) =>
    axios.post(`${API_URL}/transaction`, transactionData, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

export const listTransactions = (token) => {
    return axios.get(`${API_URL}/transaction`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

export const updateTransaction = (token, transactionId, transactionData) =>
    axios.patch(`${API_URL}/transaction/${transactionId}`, transactionData, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

export const deleteTransaction = (token, transactionId) =>
    axios.delete(`${API_URL}/transaction/${transactionId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
