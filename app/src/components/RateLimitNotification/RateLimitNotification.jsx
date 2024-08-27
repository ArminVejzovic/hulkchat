import React from 'react';
import styles from './RateLimitNotification.module.css';

const RateLimitNotification = ({ chatType, rateLimitedRooms, rateLimitedPrivateChats, selectedRoom, receiverId }) => {
  return (
    <div>
      {chatType === 'group' && rateLimitedRooms.includes(selectedRoom) && (
        <div className={styles.notification}>
          Rate limit exceeded in this room. Please wait...
        </div>
      )}
      {chatType === 'private' && rateLimitedPrivateChats.includes(receiverId) && (
        <div className={styles.notification}>
          Rate limit exceeded in this private chat. Please wait...
        </div>
      )}
    </div>
  );
};

export default RateLimitNotification;
