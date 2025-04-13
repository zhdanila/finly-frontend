import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './components/auth/Login.jsx';
import Register from './components/auth/Register.jsx';
import UserInfo from './components/auth/UserInfo.jsx';

function App() {
    const [token, setToken] = useState(null);

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
                            <Login onLoginSuccess={(t) => setToken(t)} />
                        )
                    }
                />
                <Route
                    path="/register"
                    element={
                        token ? (
                            <Navigate to="/dashboard" />
                        ) : (
                            <Register onRegisterSuccess={(t) => setToken(t)} />
                        )
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        token ? (
                            <UserInfo token={token} />
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
