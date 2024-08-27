import React, { useRef, useEffect } from 'react';
import { FaCheck, FaCheckDouble, FaCommentDots } from 'react-icons/fa';
import styles from './Messages.module.css';

const Messages = ({ messages, users, rooms, chatType, selectedRoom, receiverId, convertToEuropeanTime, userId }) => {
  const endOfMessagesRef = useRef(null);

  const getUserNameById = (id) => {
    const user = users.find(user => user.id === id);
    if (user) {
      return user.username;
    }
    if (id === userId) {
      const currentUser = users.find(user => user.id === userId);
      return currentUser ? currentUser.username : 'You';
    }
    return 'Unknown';
  };

  const getGroupChatNameById = (id) => {
    const room = rooms.find(room => room.id === id);
    return room ? room.name : 'Unknown Group';
  };

  const getChatTitle = () => {
    if (chatType === 'private') {
      return getUserNameById(receiverId);
    } else if (chatType === 'group') {
      return getGroupChatNameById(selectedRoom);
    }
    return 'Messages';
  };

  const isChatOpen = (chatType === 'private' && receiverId) || (chatType === 'group' && selectedRoom);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className={styles.container}>
      {!isChatOpen ? (
        <div className={styles.noChatSelected}>
          <FaCommentDots className={styles.noChatIcon} />
          <p>Select a chat to start messaging.</p>
        </div>
      ) : (
        <>
          <h2 className={styles.chatTitle}>{getChatTitle()}</h2>
          <div className={styles.messagesContainer}>
            {messages.length > 0 ? (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`${styles.message} ${msg.sender_id === userId ? styles.sentMessage : styles.receivedMessage}`}
                >
                  <strong>{getUserNameById(msg.sender_id)}:</strong> {msg.content}
                  <div className={styles.messageDetails}>
                    {msg.sender_id === userId && (
                      <div className={styles.status}>
                        {msg.status === 'sent' && <FaCheck className={styles.sentIcon} />}
                        {msg.status === 'delivered' && <FaCheckDouble className={styles.deliveredIcon} />}
                        {msg.status === 'seen' && (
                          <FaCheckDouble className={`${styles.statusIcon} ${styles.seen}`} />
                        )}
                      </div>
                    )}
                    <div className={styles.timestamp}>
                      {convertToEuropeanTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noMessages}>
                <FaCommentDots className={styles.noMessagesIcon} />
                <p>No messages yet. Start the conversation!</p>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>
        </>
      )}
    </div>
  );
};

export default Messages;
