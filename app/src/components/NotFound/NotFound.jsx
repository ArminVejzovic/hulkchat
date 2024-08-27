import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

const NotFound = () => {
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>404 - Not Found</h2>
      <p className={styles.message}>The page you're looking for does not exist.</p>
      <Link to="/" className={styles.link}>Go to Home</Link>
      <Link to="/login" className={styles.link}>Login</Link>
      <Link to="/register" className={styles.link}>Register</Link>
    </div>
  );
};

export default NotFound;
