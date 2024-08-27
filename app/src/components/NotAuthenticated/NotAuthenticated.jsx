import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './NotAuthenticated.module.css'; // Importovanje CSS modula

const NotAuthenticated = () => {

    useEffect(() => {
        document.title = "HulkChat - NotAuthenticated";
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.href = '/chat.png';
        document.head.appendChild(favicon);
    }, []);

    return (
        <div className={styles.container}>
            <h2 className={styles.heading}>Not Authenticated</h2>
            <p className={styles.message}>You need to log in to access this page.</p>
            <div className={styles.links}>
                <Link to='/login' className={styles.link}>Login</Link>
                <Link to='/register' className={styles.link}>Register</Link>
            </div>
        </div>
    );
};

export default NotAuthenticated;
