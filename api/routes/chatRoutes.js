const express = require('express');
const router = express.Router(); // Fixed to use express.Router()
const chatController = require('../controllers/chatController');
const authController = require('../controllers/authController');

router.get('/chatRooms', authController.authenticateToken, chatController.getChatRooms);
router.post('/create/chatRoom', authController.authenticateToken, chatController.createChatRoom);
router.get('/messages/:roomId', authController.authenticateToken, chatController.getMessages);
router.post('/messages', authController.authenticateToken, chatController.postMessage);
router.get('/messages/private/:userId', authController.authenticateToken, chatController.getPrivateMessages);
router.post('/rooms/:roomId/join', authController.authenticateToken, chatController.joinRoom);
router.post('/rooms/:roomId/leave', authController.authenticateToken, chatController.leaveRoom);
router.get('/rooms/available', authController.authenticateToken, chatController.getAvailableRooms);
router.get('/users', authController.authenticateToken, chatController.getUsers);

module.exports = router;
