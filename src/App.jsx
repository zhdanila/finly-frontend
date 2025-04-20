import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getUserInfo } from './api/api.js';
import Login from './components/auth/Login.jsx';
import Register from './components/auth/Register.jsx';
import Budget from './components/budget/Budget.jsx';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [isLoading, setIsLoading] = useState(!!localStorage.getItem('token'));

    useEffect(() => {
        const verifyToken = async () => {
            if (token) {
                try {
                    await getUserInfo(token);
                    setIsLoading(false);
                } catch (err) {
                    console.error('Token verification failed:', err);
                    localStorage.removeItem('token');
                    setToken(null);
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };
        verifyToken();
    }, [token]);

    const handleLoginSuccess = (t) => {
        localStorage.setItem('token', t);
        setToken(t);
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={
                        token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/login"
                    element={
                        token ? (
                            <Navigate to="/dashboard" />
                        ) : (
                            <Login onLoginSuccess={handleLoginSuccess} />
                        )
                    }
                />
                <Route
                    path="/register"
                    element={
                        token ? (
                            <Navigate to="/dashboard" />
                        ) : (
                            <Register onRegisterSuccess={handleLoginSuccess} />
                        )
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        token ? (
                            <Budget token={token} setToken={setToken} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />
            </Routes>
        </Router>
    );
}

export default App;