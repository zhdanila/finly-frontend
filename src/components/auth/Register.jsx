import React, { useState } from 'react';
import { register } from '../../api/auth/authApi.js';
import { Link } from 'react-router-dom';
import './Register.css';

const Register = ({ onRegisterSuccess }) => {
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await register({
                email,
                first_name: firstName,
                last_name: lastName,
                password,
            });

            onRegisterSuccess(response.data.token);
        } catch (error) {
            setIsLoading(false);
            if (error.response && error.response.data) {
                setError(error.response.data.message || 'Сталася помилка під час реєстрації.');
            } else {
                setError('Не вдалося з\'єднатися з сервером.');
            }
        }
    };

    return (
        <div className="register-container">
            <h2>Create an Account</h2>
            <form onSubmit={handleRegister}>
                <div>
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                    />
                </div>
                <div>
                    <label>First Name</label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter your first name"
                        required
                    />
                </div>
                <div>
                    <label>Last Name</label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter your last name"
                        required
                    />
                </div>
                <div>
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                    />
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Registering...' : 'Register'}
                </button>
                {error && <p className="error-message">{error}</p>}
            </form>

            <p className="switch-auth">
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
};

export default Register;
