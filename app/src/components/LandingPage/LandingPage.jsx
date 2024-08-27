import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';

const LandingPage = () => {

  useEffect(() => {
    document.title = "HulkChat";
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = '/chat.png';
    document.head.appendChild(favicon);
  }, []);

  return (
    <div className={styles.landingContainer}>
      <header className={styles.header}>
        <h1 className={styles.logo}>HulkChat</h1>
        <nav className={styles.nav}>
          <Link to='/login' className={styles.link}>Login</Link>
          <Link to='/register' className={styles.link}>Register</Link>
        </nav>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.description}>
          <h2>Welcome to HulkChat – Your Ultimate Real-Time Communication Platform</h2>
          <p>HulkChat is a powerful, secure, and user-friendly real-time chat application designed to keep you connected with your friends, family, and colleagues, no matter where you are.</p>
          <p>Whether you're looking to engage in group conversations or private messaging, HulkChat has everything you need to stay in touch.</p>
        </div>
        <br></br>
        <div className={styles.image}>
          <img src="/chat.png" alt="Chat Illustration" />
        </div>
        <br></br>
      </main>

      <section className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>HulkChat Features</h2>
        <div className={styles.featuresList}>
          <div className={styles.featureItem}>
            <h3>User Authentication</h3>
            <p>Join HulkChat by creating an account in seconds. Our secure login system ensures that your data remains protected with JWT-based authentication.</p>
          </div>
          <div className={styles.featureItem}>
            <h3>Real-Time Messaging</h3>
            <p>Experience the power of real-time communication. Join chat rooms, send messages instantly, and see them appear live for all participants in the room.</p>
          </div>
          <div className={styles.featureItem}>
            <h3>Persistent Message Storage</h3>
            <p>Never miss a message. All chat histories are stored securely, allowing you to catch up on past conversations at any time.</p>
          </div>
          <div className={styles.featureItem}>
            <h3>Rate Limiting</h3>
            <p>HulkChat protects your chat experience with smart rate limiting to prevent spam and maintain a healthy conversation flow.</p>
          </div>
          <div className={styles.featureItem}>
            <h3>Rate Limiting Protection</h3>
            <p>Responsive web application with real-time chat functionality, built using React.</p>
          </div>
          <div className={styles.featureItem}>
            <h3>Private Messaging</h3>
            <p>Keep the conversation personal by sending direct messages to other users.</p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <br></br>
        <p>&copy; 2024 HulkChat. All rights reserved.</p>
        <br></br>
      </footer>
    </div>
  );
}

export default LandingPage;
