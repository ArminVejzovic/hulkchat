import React from 'react';
import styles from './Placeholder.module.css';

const Placeholder = () => {
  return (
    <div className={styles.placeholderContainer}>
      <img src={'./chat.png'} alt="Chat Placeholder" className={styles.placeholderImage} />
      <p className={styles.placeholderText}>Welcome to HulkChat</p>
      <p className={styles.placeholderText}>Click on a chat or room to start a conversation.</p>
    </div>
  );
};

export default Placeholder;
