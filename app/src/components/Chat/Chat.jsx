import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../SocketContext';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Logout from '../Logout/Logout';

const ChatApp = () => {
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken = jwtDecode(token);
      setUserId(decodedToken.id);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:4000/chatRooms', {
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
    const fetchUsers = async () => {
      if (userId !== null) {
        try {
          const response = await axios.get('http://localhost:4000/users', {
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
      axios.get(`http://localhost:4000/messages/${roomId}`, {
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
      axios.get(`http://localhost:4000/messages/private/${receiverId}`, {
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
      window.location.reload();
    }
  }, [socket, receiverId, userId]);

  return (
    <div>
      <Logout socket={socket} />
      <div>
        <h2>Chat Rooms</h2>
        <ul>
          {rooms.map(room => (
            <li key={room.id} onClick={() => handleRoomSelect(room.id)}>
              {room.name}
            </li>
          ))}
        </ul>

        <h2>Users</h2>
        <ul>
          {users.map(user => (
            <li key={user.id} onClick={() => handlePrivateChatSelect(user.id)}>
              {user.username} {onlineUsers.has(user.id) ? '(Online)' : '(Offline)'}
            </li>
          ))}
        </ul>
      </div>

      {(selectedRoom || receiverId) && (
        <div>
          <h2>Messages</h2>
          <div>
            {messages.map((msg) => (
              <div key={msg.id}>
                <strong>User {msg.sender_id}:</strong> {msg.content}
                {msg.sender_id === userId && (
                  <div>
                    Status: {msg.status || 'sent'} <br></br>
                    {msg.created_at}
                  </div>
                  
                )}
              </div>
            ))}
            {chatType === 'group' && rateLimitedRooms.includes(selectedRoom) && (
              <div style={{ color: 'red' }}>
                Rate limit exceeded in this room. Please wait...
              </div>
            )}
            {chatType === 'private' && rateLimitedPrivateChats.includes(receiverId) && (
              <div style={{ color: 'red' }}>
                Rate limit exceeded in this private chat. Please wait...
              </div>
            )}
          </div>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button onClick={handleSendMessage}>Send</button>

          {chatType === 'group' ? (
            <button onClick={handleLeaveRoom}>Leave Room</button>
          ) : (
            <button onClick={handleLeavePrivateChat}>Leave Chat</button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatApp;
