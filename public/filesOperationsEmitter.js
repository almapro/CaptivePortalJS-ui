const electron = require('electron');
const EventEmitter = require('eventemitter3')
const fs = require('fs');
const path = require('path');

const userDataPath = electron.remote.app.getPath('userData');

global.filesOperationsEmitter = new EventEmitter({});

filesOperationsEmitter.on('upload', (operationId, filename, content) => {
  const filepath = `${userDataPath}/${filename}`;
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, content);
    filesOperationsEmitter.emit('upload-done', operationId, filepath);
  } else {
    filesOperationsEmitter.emit('upload-failed', operationId, 'File already exists');
  }
});
