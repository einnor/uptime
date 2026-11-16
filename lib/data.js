const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const lib = { baseDir: process.env.UPTIME_DATA_DIR || path.join(__dirname, '../.data') };
const directories = ['users', 'tokens', 'checks'];
for (const dir of directories) fs.mkdirSync(path.join(lib.baseDir, dir), { recursive: true });

function filename(dir, file) {
  if (!directories.includes(dir) || typeof file !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(file)) {
    throw new Error('Invalid storage key');
  }
  return path.join(lib.baseDir, dir, `${file}.json`);
}

function withFile(dir, file, callback, operation) {
  let target;
  try { target = filename(dir, file); } catch (error) { callback(error); return; }
  operation(target);
}

lib.create = (dir, file, data, callback) => withFile(dir, file, callback, target => {
  fs.writeFile(target, JSON.stringify(data), { flag: 'wx', mode: 0o600 }, callback);
});

lib.read = (dir, file, callback) => withFile(dir, file, callback, target => {
  fs.readFile(target, 'utf8', (error, content) => {
    if (error) { callback(error); return; }
    let data;
    try { data = JSON.parse(content); } catch (parseError) { callback(parseError); return; }
    callback(false, data);
  });
});

lib.update = (dir, file, data, callback) => withFile(dir, file, callback, target => {
  fs.access(target, fs.constants.F_OK, error => {
    if (error) { callback(error); return; }
    const temporary = `${target}.${crypto.randomUUID()}.tmp`;
    fs.writeFile(temporary, JSON.stringify(data), { flag: 'wx', mode: 0o600 }, writeError => {
      if (writeError) { callback(writeError); return; }
      fs.rename(temporary, target, renameError => {
        if (renameError) fs.unlink(temporary, () => callback(renameError));
        else callback(false);
      });
    });
  });
});

lib.delete = (dir, file, callback) => withFile(dir, file, callback, target => fs.unlink(target, callback));
lib.list = (dir, callback) => {
  if (!directories.includes(dir)) { callback(new Error('Invalid storage directory')); return; }
  fs.readdir(path.join(lib.baseDir, dir), (error, files) => {
    callback(error, files?.filter(file => file.endsWith('.json')).map(file => file.slice(0, -5)));
  });
};

module.exports = lib;
