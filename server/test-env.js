/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Import this FIRST (before `db.js`/`auth.js`) in any test file, so those
 * modules pick up an isolated temp DB/secret path instead of touching the
 * real `data/` directory. ES module imports execute in declaration order,
 * so as long as this import line comes first, the env vars are set before
 * `db.js`/`auth.js` run their module-level setup code.
 */

import os from 'os';
import path from 'path';
import fs from 'fs';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'theodoitiendo-test-'));

process.env.THEODOITIENDO_DB_PATH = path.join(tmpDir, 'test.db');
process.env.THEODOITIENDO_JWT_SECRET_PATH = path.join(tmpDir, 'jwt-secret.txt');
