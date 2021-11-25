const electron = require('electron');
const fs = require('fs');
const path = require('path');
const { v4 } = require('uuid');
const contextBridge = electron.contextBridge;
const userDataPath = electron.remote.app.getPath('userData');
const _ = require('lodash');

contextBridge.exposeInMainWorld(
  'files',
  {
    upload: (nodeId, fileType, filename, content) => {
      const fileExtension = path.extname(filename);
      const filenameWithoutExtension = path.basename(filename, fileExtension);
      const newFileName = `${filenameWithoutExtension}-${v4()}${fileExtension}`;
      const folderPath = `${userDataPath}/${fileType}/${nodeId}`;
      const filePath = `${folderPath}/${newFileName}`;
      fs.mkdirSync(folderPath, { recursive: true });
      fs.writeFileSync(filePath, content);
      return filePath;
    },
    list: (nodeId, filesType) => {
      const folderPath = `${userDataPath}/${filesType}/${nodeId}`;
      if (!fs.existsSync(folderPath)) return [];
      return fs.readdirSync(folderPath).map(f => `${folderPath}/${f}`);
    },
    delete: (nodeId, fileType, filename) => {
      const fullPath = `${userDataPath}/${fileType}/${nodeId}/${filename}`;
      if (!fs.existsSync(fullPath)) return;
      fs.unlinkSync(fullPath)
    },
    clearUnused: async (filesType, files) => {
      const folderToSearch = `${userDataPath}/${filesType}`;
      if (!fs.existsSync(folderToSearch)) return 0;
      let deleted = 0;
      fs.readdirSync(folderToSearch).forEach(f => {
        const nodeFolder = `${folderToSearch}/${f}`;
        if (fs.lstatSync(nodeFolder).isDirectory()) {
          fs.readdirSync(nodeFolder).forEach(filename => {
            const found = _.find(files, { filename });
            if (!found) {
              deleted++;
              fs.unlinkSync(`${nodeFolder}/${filename}`);
            }
          });
        }
      });
      return deleted;
    },
    saveFile: async (content) => {
      const filePath = electron.remote.dialog.showSaveDialogSync({
        title: 'Choosea file to export to',
        defaultPath: 'captive-portal-js-graph.json',
        filters: [
          {
            name: 'JSON',
            extensions: ['json']
          }
        ]
      });
      fs.writeFileSync(filePath, content);
    }
  }
)
