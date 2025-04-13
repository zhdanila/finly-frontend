import React, { useState, useEffect } from 'react';
// ✅ Імпортуємо функцію з API
import { getUserInfo } from '../../api/auth/authApi.js';
import './UserInfo.css';

const UserInfo = ({ token }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const response = await getUserInfo(token);
                setUserInfo(response.data);
            } catch (error) {
                setError('Не вдалося отримати інформацію про користувача.');
            }
        };

        if (token) {
            fetchUserInfo();
        }
    }, [token]);

    if (error) {
        return <p className="error-message">{error}</p>;
    }

    if (!userInfo) {
        return <p>Завантаження...</p>;
    }

    return (
        <div className="user-info-container">
            <h2>User Information</h2>
            <p>Email: {userInfo.email}</p>
            <p>First Name: {userInfo.first_name}</p>
            <p>Last Name: {userInfo.last_name}</p>
        </div>
    );
};

export default UserInfo;
