import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "HulkChat - Login";
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = '/chat.png';
    document.head.appendChild(favicon);

  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:4000/login', {
        username,
        password
      });

      if (response && response.data) {
        console.log('Login successful:', response.data.token);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('redirected', 'true');
        navigate('/chat');
      }
    } catch (error) {
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <p>{error}</p>}
    </div>
  );
};

export default Login;
