const bcrypt = require('bcrypt');
const { getDb } = require('../cbt.db'); // adjust path if needed

function patchBrokenStudentPasswords() {
    const db = getDb();
    const defaultPassword = '123456';
    const hashed = bcrypt.hashSync(defaultPassword, 10);

    db.run(
        'UPDATE students SET password_hash = ? WHERE password_hash IS NULL OR password_hash = ""',
        [hashed],
        function (err) {
            if (err) {
                console.error('❌ Failed to patch student passwords:', err);
            } else {
                console.log(`✅ Patched ${this.changes} student record(s) with default password`);
            }
        }
    );
}

patchBrokenStudentPasswords();
