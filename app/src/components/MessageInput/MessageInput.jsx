import React from 'react';
import { FaPaperPlane, FaSignOutAlt } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import styles from './MessageInput.module.css';

const MessageInput = ({ newMessage, setNewMessage, handleSendMessage, chatType, rateLimitedRooms, rateLimitedPrivateChats, selectedRoom, receiverId, handleLeaveRoom, handleLeavePrivateChat }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={styles.container}>
      <textarea
        className={styles.textarea}
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Type your message..."
      />
      <div className={styles.buttonGroup}>
        <button
          className={styles.sendButton}
          onClick={handleSendMessage}
          disabled={chatType === 'group' && rateLimitedRooms.includes(selectedRoom) || chatType === 'private' && rateLimitedPrivateChats.includes(receiverId)}
        >
          <FaPaperPlane />
        </button>
        {chatType === 'group' && (
          <button className={styles.leaveButton} onClick={handleLeaveRoom}>
            <IoMdClose/> Leave Room
          </button>
        )}
        {chatType === 'private' && (
          <button className={styles.leaveButton} onClick={handleLeavePrivateChat}>
            <FaSignOutAlt/> Leave Chat
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
