const buffer = require('node:buffer');

if (typeof globalThis.File === 'undefined' && typeof buffer.File !== 'undefined') {
  globalThis.File = buffer.File;
}

if (typeof globalThis.Blob === 'undefined' && typeof buffer.Blob !== 'undefined') {
  globalThis.Blob = buffer.Blob;
}
