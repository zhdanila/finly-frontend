import axios from 'axios';

const API_URL = 'http://localhost:8080';

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


// === Category Endpoints ===
export const getCategories = (token, userId) =>
    axios.get(`${API_URL}/category`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'User-Id': userId,
        },
    });


// === Transaction Endpoints ===
export const createTransaction = (token, transactionData) =>
    axios.post(`${API_URL}/transaction`, transactionData, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

export const listTransactions = (token, userId) =>
    axios.get(`${API_URL}/transaction`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'User-Id': userId,
        },
    });

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
