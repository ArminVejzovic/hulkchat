import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../SocketContext.js';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Logout from '../Logout/Logout.jsx';
import { useNavigate } from 'react-router-dom';
import moment from 'moment-timezone';
import RoomList from '../RoomList/RoomList.jsx';
import UserList from '../UserList/UserList.jsx';
import Messages from '../Messages/Messages.jsx';
import MessageInput from '../MessageInput/MessageInput.jsx';
import RoomCreation from '../RoomCreation/RoomCreation.jsx';
import RateLimitNotification from '../RateLimitNotification/RateLimitNotification.jsx';
import styles from './Chat.module.css';
import Placeholder from '../Placeholder/Placeholder.jsx';


const Chat = () => {
  const socket = useSocket();
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [rateLimitedRooms, setRateLimitedRooms] = useState([]);
  const [rateLimitedPrivateChats, setRateLimitedPrivateChats] = useState([]);
  const [chatType, setChatType] = useState('group');
  const [receiverId, setReceiverId] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reloadLoading, setReloadLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken = jwtDecode(token);
      setUserId(decodedToken.id);
    }

    const redirected = localStorage.getItem('redirected');
    if (redirected) {
      setReloadLoading(true);
      const reloadTimeout = setTimeout(() => {
        window.location.reload();
        localStorage.removeItem('redirected');
      }, 1000);

      return () => clearTimeout(reloadTimeout);
    } else {
      setReloadLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/notauthenticated');
        return;
      }

      try {
        await axios.get(`${process.env.REACT_APP_BACKEND_URL}/verify`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setIsAuthorized(true);
      } catch (error) {
        if (error.response && error.response.status === 403) {
          localStorage.removeItem('token');
          navigate('/notauthenticated');
        } else {
          console.error('Authentication check failed:', error);
        }
      } finally {
        document.title = "HulkChat - Chat";
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.href = '/chat.png';
        document.head.appendChild(favicon);
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/chatRooms`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        setRooms(response.data);
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchAvailableRooms = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/rooms/available`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          params: { userId }
        });
        setAvailableRooms(response.data);
      } catch (error) {
        console.error('Error fetching available rooms:', error);
      }
    };
    if (userId) {
      fetchAvailableRooms();
    }
  }, [userId]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (userId !== null) {
        try {
          const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/users`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          const filteredUsers = response.data.filter(user => user.id !== userId);
          setUsers(filteredUsers);
        } catch (error) {
          console.error('Error fetching users:', error);
        }
      }
    };
    fetchUsers();
  }, [userId]);

  useEffect(() => {
    if (socket && userId) {


      socket.on('newMessage', (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      });

      socket.on('userStatus', (status) => {
        const { userId, status: userStatus } = status;
        setOnlineUsers((prevOnlineUsers) => {
          const updatedOnlineUsers = new Map(prevOnlineUsers);
          if (userStatus === 'online') {
            updatedOnlineUsers.set(userId, userId);
          } else {
            updatedOnlineUsers.delete(userId);
          }
          return updatedOnlineUsers;
        });
      });

      socket.on('onlineUsers', (usersList) => {
        setOnlineUsers(new Map(usersList.map(user => [user.id, user.username])));
      });

      socket.on('rateLimitUpdated', (updatedRateLimits) => {
        console.log('Rate limit updated:', updatedRateLimits);
        if (chatType === 'group') {
          setRateLimitedRooms(updatedRateLimits);
        } else {
          setRateLimitedPrivateChats(updatedRateLimits);
        }
      });

      socket.on('messageStatusUpdate', (statusUpdate) => {
        setMessages((prevMessages) => prevMessages.map(msg =>
          msg.id === statusUpdate.messageId ? { ...msg, status: statusUpdate.status } : msg
        ));
      });

      return () => {
        socket.off('newMessage');
        socket.off('userStatus');
        socket.off('onlineUsers');
        socket.off('rateLimitUpdated');
        socket.off('messageStatusUpdate');
      };
    }
  }, [socket, userId, chatType]);

  const handleRoomSelect = useCallback((roomId) => {
    if (socket && userId) {
      setSelectedRoom(roomId);
      setChatType('group');
      setReceiverId(null);
      socket.emit('joinRoom', { roomId, userId });
      axios.get(`${process.env.REACT_APP_BACKEND_URL}/messages/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).then(response => {
        setMessages(response.data);
      }).catch(error => {
        console.error('Error fetching messages:', error);
      });
    }
  }, [socket, userId]);

  const handlePrivateChatSelect = useCallback((receiverId) => {
    if (socket && userId) {
      setSelectedRoom(null);
      setChatType('private');
      setReceiverId(receiverId);
      socket.emit('joinRoom', { receiverId, userId });
      axios.get(`${process.env.REACT_APP_BACKEND_URL}/messages/private/${receiverId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).then(response => {
        setMessages(response.data);
      }).catch(error => {
        console.error('Error fetching messages:', error);
      });
    }
  }, [socket, userId]);

  const handleSendMessage = useCallback(() => {
    if (newMessage && (selectedRoom || receiverId) && socket && userId) {
      const message = {
        content: newMessage,
        roomId: chatType === 'group' ? selectedRoom : null,
        receiverId: chatType === 'private' ? receiverId : null,
      };
      socket.emit('sendMessage', message);
      setNewMessage('');
    }
  }, [newMessage, selectedRoom, receiverId, socket, userId, chatType]);

  const handleLeaveRoom = useCallback(() => {
    if (socket && selectedRoom && userId) {
      socket.emit('leaveRoom', { roomId: selectedRoom, userId });
      setSelectedRoom(null);
      setMessages([]);
    }
  }, [socket, selectedRoom, userId]);

  const handleLeavePrivateChat = useCallback(() => {
    if (socket && receiverId && userId) {
      socket.emit('leaveRoom', { receiverId, userId });
      setReceiverId(null);
      setMessages([]);
    }
  }, [socket, receiverId, userId]);

  const handleJoinRoom = async (roomId) => {
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/rooms/${roomId}/join`, {
        userId
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setAvailableRooms(availableRooms.filter(room => room.id !== roomId));
      setRooms([...rooms, availableRooms.find(room => room.id === roomId)]);
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const handleLeaveJoindRoom = useCallback(async (roomId) => {
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/rooms/${roomId}/leave`, {
        userId
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const leftRoom = rooms.find(room => room.id === roomId);
      setRooms(rooms.filter(room => room.id !== roomId));
      setAvailableRooms([...availableRooms, leftRoom]);
      setSelectedRoom(null);
      setMessages([]);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }, [rooms, userId, availableRooms]);

  const handleCreateRoom = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/create/chatRoom`,
        {
          name: newRoomName
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const createdRoom = response.data;
      setAvailableRooms([...availableRooms, createdRoom]);

      setNewRoomName('');
      setShowCreateRoom(false);
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const convertToEuropeanTime = (timestamp) => {
    const date = moment(timestamp).tz('Europe/Berlin');
    date.add(2, 'hours');
    return date.format('DD-MM-YYYY - HH:mm:ss');
  };

  if (loading) return <p>Loading...</p>;
  if (reloadLoading) return <p>Loading...</p>;

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Logout socket={socket} />
      </header>
      
      <main className={styles.mainContent}>
        <aside className={styles.sidebar}>
          <RoomCreation
            showCreateRoom={showCreateRoom}
            setShowCreateRoom={setShowCreateRoom}
            newRoomName={newRoomName}
            setNewRoomName={setNewRoomName}
            handleCreateRoom={handleCreateRoom}
          />

          <RoomList
            availableRooms={availableRooms}
            rooms={rooms}
            handleJoinRoom={handleJoinRoom}
            handleLeaveJoindRoom={handleLeaveJoindRoom}
            handleRoomSelect={handleRoomSelect}
            setSelectedRoom={setSelectedRoom}
            setMessages={setMessages}
            setChatType={setChatType}
            setReceiverId={setReceiverId}
            socket={socket}
            userId={userId}
          />

          <UserList
            users={users}
            handlePrivateChatSelect={handlePrivateChatSelect}
            onlineUsers={onlineUsers}
          />
        </aside>

        <div className={styles.chatContainer}>
          {!selectedRoom && !receiverId ? (
              <Placeholder />
            ) : (
              <>
              <Messages
                messages={messages}
                users={users}
                rooms={rooms}
                chatType={chatType}
                rateLimitedRooms={rateLimitedRooms}
                rateLimitedPrivateChats={rateLimitedPrivateChats}
                selectedRoom={selectedRoom}
                receiverId={receiverId}
                convertToEuropeanTime={convertToEuropeanTime}
                userId={userId}
              />

              <RateLimitNotification
                chatType={chatType}
                rateLimitedRooms={rateLimitedRooms}
                rateLimitedPrivateChats={rateLimitedPrivateChats}
                selectedRoom={selectedRoom}
                receiverId={receiverId}
              />

              <MessageInput
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
                chatType={chatType}
                rateLimitedRooms={rateLimitedRooms}
                rateLimitedPrivateChats={rateLimitedPrivateChats}
                selectedRoom={selectedRoom}
                receiverId={receiverId}
                handleLeaveRoom={handleLeaveRoom}
                handleLeavePrivateChat={handleLeavePrivateChat}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Chat;
