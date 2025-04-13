import { useContext } from 'react';
import { AuthContext } from '../context/authContext';

export const useAuth = () => {
    const { authData, setAuthData } = useContext(AuthContext);

    return {
        authData,
        setAuthData,
    };
};
