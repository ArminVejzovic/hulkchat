import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Logout.module.css';

const Logout = ({ socket }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <button onClick={handleLogout} className={styles.logoutButton}>
      Logout
    </button>
  );
};

export default Logout;
