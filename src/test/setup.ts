/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import '@testing-library/jest-dom/vitest';

// Most components/hooks probe for a local backup server or a /restore.json
// file via fetch(). In the test environment there is no such server, so we
// default fetch to always reject (matching the "server not running" case in
// the browser) unless a test overrides it explicitly.
if (!globalThis.fetch) {
  globalThis.fetch = (() => Promise.reject(new Error('fetch is not mocked in this test'))) as any;
}
