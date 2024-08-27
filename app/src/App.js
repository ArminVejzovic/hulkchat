import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Register from './components/Register/Register.jsx';
import Login from './components/Login/Login.jsx';
import LandingPage from './components/LandingPage/LandingPage.jsx';
import NotAuthenticated from './components/NotAuthenticated/NotAuthenticated.jsx';
import Chat from './components/Chat/Chat.jsx';
import NotFound from './components/NotFound/NotFound.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/chat" element={<Chat />} />
        <Route path='/notauthenticated' element={<NotAuthenticated />} />
        <Route path='/chat' element={<Chat />} />
        <Route path='*' element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
