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
