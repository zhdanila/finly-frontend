import axios from 'axios';

const API_URL = 'http://localhost:8080';

export const login = (credentials) =>
    axios.post(`${API_URL}/auth/login`, credentials);

export const logout = (token) =>
    axios.post(`${API_URL}/auth/logout`, { authToken: token });

export const refreshToken = (token) =>
    axios.post(`${API_URL}/auth/refresh`, { authToken: token });

export const register = (userDetails) =>
    axios.post(`${API_URL}/auth/register`, userDetails);

export const getUserInfo = (token) =>
    axios.post(`${API_URL}/auth/me`, {}, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
