import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../SocketContext';
import axios from 'axios';
import {jwtDecode} from 'jwt-decode';

const ChatApp = () => {
  const socket = useSocket();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [rateLimitedRooms, setRateLimitedRooms] = useState([]);

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
    if (socket && userId) {

      socket.on('newMessage', (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      });

      socket.on('rateLimitUpdated', (updatedRooms) => {
        setRateLimitedRooms(updatedRooms);
      });

      return () => {
        socket.off('newMessage');
        socket.off('rateLimitUpdated');
      };
    }
  }, [socket, userId]);

  const handleRoomSelect = useCallback((roomId) => {
    if (socket && userId) {
      setSelectedRoom(roomId);
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

  const handleSendMessage = useCallback(() => {
    if (newMessage && selectedRoom && socket && userId) {
      const message = {
        content: newMessage,
        roomId: selectedRoom,
        senderId: userId,
      };
      socket.emit('sendMessage', message);
      setNewMessage('');
    }
  }, [newMessage, selectedRoom, socket, userId]);

  const handleLeaveRoom = useCallback(() => {
    if (socket && selectedRoom && userId) {
      socket.emit('leaveRoom', { roomId: selectedRoom, userId });
      setSelectedRoom(null);
      setMessages([]);
    }
  }, [socket, selectedRoom, userId]);

  return (
    <div>
      <h2>Chat Rooms</h2>
      <ul>
        {rooms.map((room) => (
          <li key={room.id} onClick={() => handleRoomSelect(room.id)}>
            {room.name}
          </li>
        ))}
      </ul>

      {selectedRoom && (
        <>
          <h2>Messages</h2>
          <div>
            {messages.map((msg) => (
              <div key={msg.id}>
                <strong>User {userId}:</strong> {msg.content}
              </div>
            ))}
            {rateLimitedRooms.includes(selectedRoom) && (
              <div style={{ color: 'red' }}>
                Rate limit exceeded in this room. Please wait...
              </div>
            )}
          </div>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={rateLimitedRooms.includes(selectedRoom)}
          />
          <button onClick={handleSendMessage} disabled={rateLimitedRooms.includes(selectedRoom)}>Send</button>
          <button onClick={handleLeaveRoom}>Leave Room</button>
        </>
      )}
    </div>
  );
};

export default ChatApp;
