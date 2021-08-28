const { Router } = require('express');
const router = Router();
const auth = require('../middleware/auth');

const ping = (req, res) => {
    res.status(200).send('Test working fine');
};

router.get('/', ping);
router.post('/auth', auth, ping);

module.exports = router;