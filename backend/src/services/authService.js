const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
    if (!password || !hash) {
        throw new Error('Missing password or hash for verification');
    }
    return await bcrypt.compare(password, hash);
}


module.exports = { hashPassword, verifyPassword };