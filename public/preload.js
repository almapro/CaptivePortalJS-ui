const electron = require('electron');
const fs = require('fs');
const path = require('path');
const { v4 } = require('uuid');
const contextBridge = electron.contextBridge;
const userDataPath = electron.remote.app.getPath('userData');

contextBridge.exposeInMainWorld(
  'files',
  {
    upload: (nodeId, fileType, filename, content) => {
      const fileExtension = path.extname(filename);
      const filenameWithoutExtension = path.basename(filename, fileExtension);
      const newFileName = `${filenameWithoutExtension}-${v4()}${fileExtension}`;
      const folderPath = `${userDataPath}/${nodeId}/${fileType}`;
      const filePath = `${folderPath}/${newFileName}`;
      fs.mkdirSync(folderPath, { recursive: true });
      fs.writeFileSync(filePath, content);
      return filePath;
    },
    list: (nodeId, filesType) => {
      const folderPath = `${userDataPath}/${nodeId}/${filesType}`;
      if (!fs.existsSync(folderPath)) return [];
      return [];
    },
    delete: (nodeId, fileType, filename) => {
      const fullPath = `${userDataPath}/${nodeId}/${fileType}/${filename}`;
      fs.unlinkSync(fullPath)
    }
  }
)
