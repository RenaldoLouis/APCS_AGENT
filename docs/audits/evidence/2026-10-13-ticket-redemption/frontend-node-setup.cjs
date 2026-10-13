// Test-only Firebase bootstrap and file APIs; no DOM, browser, real database or analytics.
jest.mock(require.resolve(process.cwd() + '/src/firebase.js'), () => ({
  db: {}, auth: { currentUser: null }, storage: {}, provider: {}, analytics: {},
}));
const { File } = require('node:buffer');
global.File = File;
global.FileReader = class {
  readAsDataURL(file) {
    file.arrayBuffer().then(bytes => {
      this.result = 'data:' + (file.type || 'application/octet-stream') + ';base64,' + Buffer.from(bytes).toString('base64');
      if (this.onload) this.onload();
    }).catch(() => { if (this.onerror) this.onerror(); });
  }
};
