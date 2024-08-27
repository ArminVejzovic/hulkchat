import React, { useState } from 'react';
import { FaSignInAlt, FaSignOutAlt, FaCaretDown } from 'react-icons/fa';
import styles from './RoomList.module.css';

const RoomList = ({ availableRooms, rooms, handleJoinRoom, handleLeaveJoindRoom, handleRoomSelect }) => {
  const [openRoomId, setOpenRoomId] = useState(null);

  const handleToggleDropdown = (roomId) => {
    setOpenRoomId(prevRoomId => prevRoomId === roomId ? null : roomId);
  };

  const handleJoin = (roomId) => {
    handleJoinRoom(roomId);
    setOpenRoomId(null);
  };

  const handleLeave = (roomId) => {
    handleLeaveJoindRoom(roomId);
    setOpenRoomId(null);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>
        Join Chat Rooms
        <FaCaretDown
          className={`${styles.icon} ${openRoomId === 'availableRooms' ? styles.rotate : ''}`}
          onClick={() => handleToggleDropdown('availableRooms')}
        />
      </h2>
      <div className={`${styles.dropdownContent} ${openRoomId === 'availableRooms' ? styles.active : ''}`}>
        <ul className={styles.roomList}>
          {availableRooms.map(room => (
            <li key={room.id} className={styles.roomItem}>
              <span className={styles.roomName}>{room.name}</span>
              <button
                className={styles.joinButton}
                onClick={() => handleJoin(room.id)}
              >
                <FaSignInAlt />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <br></br>
      <h2 className={styles.heading}>
        My Chat Rooms
        <FaCaretDown
          className={`${styles.icon} ${openRoomId === 'myRooms' ? styles.rotate : ''}`}
          onClick={() => handleToggleDropdown('myRooms')}
        />
      </h2>
      <div className={`${styles.dropdownContent} ${openRoomId === 'myRooms' ? styles.active : ''}`}>
        <ul className={styles.roomList}>
          {rooms.map(room => (
            <li
              key={room.id}
              className={styles.roomItem}
              onClick={() => handleRoomSelect(room.id)}
            >
              <span className={styles.roomName}>
                {room.name}
              </span>
              <button
                className={styles.leaveButton}
                onClick={(event) => {
                  event.stopPropagation();
                  handleLeave(room.id);
                }}
              >
                <FaSignOutAlt />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RoomList;
