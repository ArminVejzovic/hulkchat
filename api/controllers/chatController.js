const pool = require('../postgresql/config.js');


const getChatRooms = async (req, res) => {
    const userId = req.user.id;

    try {
        const chatRooms = await pool.query(
            `SELECT chat_rooms.* 
            FROM chat_rooms
            JOIN room_members ON chat_rooms.id = room_members.room_id
            WHERE room_members.user_id = $1`,
            [userId]
        );
        res.json(chatRooms.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat rooms' });
    }
};

const createChatRoom = async (req, res) => {
    const { name } = req.body;

    try {
        const result = await pool.query('INSERT INTO chat_rooms (name) VALUES ($1) RETURNING *', [name]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create chat room' });
    }
};

const getMessages = async (req, res) => {
    const { roomId } = req.params;

    const messages = await pool.query('SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC', [roomId]);
    res.json(messages.rows);
};

const postMessage = async (req, res) => {
    const { content, room_id, sender_id, receiver_id } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO messages (content, room_id, sender_id, receiver_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [content, room_id, sender_id, receiver_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
};

const getPrivateMessages = async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    try {
        const messages = await pool.query(
            `SELECT * FROM messages
            WHERE (sender_id = $1 AND receiver_id = $2)
            OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at ASC`,
            [currentUserId, userId]
        );
        res.json(messages.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

const createRoom = async (req, res) => {
    const { name } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO chat_rooms (name) VALUES ($1) RETURNING *',
            [name]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create room' });
    }
};

const joinRoom = async (req, res) => {
    const { roomId } = req.params;
    const { userId } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO room_members (user_id, room_id) VALUES ($1, $2) ON CONFLICT (user_id, room_id) DO NOTHING RETURNING *',
            [userId, roomId]
        );
        if (result.rowCount > 0) {
            res.status(200).json({ message: 'Joined room successfully' });
        } else {
            res.status(409).json({ error: 'User already in room' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to join room' });
    }
};

const getAvailableRooms = async (req, res) => {
    const { userId } = req.query;

    try {
        const result = await pool.query(`
            SELECT cr.*
            FROM chat_rooms cr
            LEFT JOIN room_members rm ON cr.id = rm.room_id AND rm.user_id = $1
            WHERE rm.user_id IS NULL
        `, [userId]);

        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch available rooms' });
    }
};

const leaveRoom = async (req, res) => {
    const { roomId } = req.params;
    const { userId } = req.body;
    try {
        const result = await pool.query(
            'DELETE FROM room_members WHERE user_id = $1 AND room_id = $2 RETURNING *',
            [userId, roomId]
        );
        if (result.rowCount > 0) {
            res.status(200).json({ message: 'Left room successfully' });
        } else {
            res.status(404).json({ error: 'User not in room' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to leave room' });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await pool.query('SELECT * FROM users');
        res.status(200).json(users.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

module.exports = { getChatRooms, createChatRoom, getMessages, postMessage, getPrivateMessages, createRoom, joinRoom, getAvailableRooms, leaveRoom, getUsers };