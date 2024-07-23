// Define API endpoints for order updates and deletions
const express = require('express');
const router = express.Router();

router.put('/', updateOrder);
router.delete('/', deleteOrder);

module.exports = router;
