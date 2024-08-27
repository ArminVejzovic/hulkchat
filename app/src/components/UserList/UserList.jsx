import React from 'react';
import { FaCircle } from 'react-icons/fa';
import styles from './UserList.module.css';

const UserList = ({ users, handlePrivateChatSelect, onlineUsers }) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Users</h2>
      <ul className={styles.userList}>
        {users.map(user => (
          <li 
            key={user.id} 
            className={styles.userItem}
            onClick={() => handlePrivateChatSelect(user.id)}
          >
            <span className={onlineUsers.has(user.id) ? styles.online : styles.offline}>
              <FaCircle />
            </span>
            {user.username}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
