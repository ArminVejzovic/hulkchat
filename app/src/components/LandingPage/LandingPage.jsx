import React from 'react'
import { Link } from 'react-router-dom'
import { useEffect } from 'react';

const LandingPage = () => {

  useEffect(() => {
    document.title = "HulkChat";
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = '/chat.png';
    document.head.appendChild(favicon);

  }, []);

  return (
    <div>LandingPage
        <br></br>
        <Link to='/login' className='link'>Login</Link>
        <br></br>
        <Link to='/register' className='link'>Register</Link>
    </div>
  )
}

export default LandingPage