import React from 'react';
import styles from './RoomCreation.module.css';

const RoomCreation = ({ showCreateRoom, setShowCreateRoom, newRoomName, setNewRoomName, handleCreateRoom }) => {
  return (
    <div className={styles.container}>
      <button
        className={styles.toggleButton}
        onClick={() => setShowCreateRoom(!showCreateRoom)}
      >
        {showCreateRoom ? 'Cancel' : 'Create New Room'}
      </button>
      {showCreateRoom && (
        <div className={styles.formContainer}>
          <input
            className={styles.input}
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Name"
          />
          <button
            className={styles.createButton}
            onClick={handleCreateRoom}
          >
            Create Room
          </button>
        </div>
      )}
    </div>
  );
};

export default RoomCreation;
