import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import * as nvt from 'node-virustotal';
import { copyFile } from 'fs/promises';
import * as uuid from 'uuid';
// eslint-disable-next-line
import config from './config';

const copy = require('recursive-copy');

const submissionsPath = path.join(__dirname, '../submissions');

const environmentsPath = path.join(__dirname, '../environments');

const repoPath = path.join(__dirname, '../app');

const virusTotal = nvt.makeAPI();
virusTotal.setKey(config.virustotalKey);

async function createFolder(filePath) {
  let folderExists = true;
  try {
    await fs.access(filePath);
  } catch (e) {
    if (e.code === 'ENOENT') {
      folderExists = false;
    } else {
      console.error(e);
    }
  }

  if (!folderExists) {
    // Create submissions folder.
    await fs.mkdir(filePath);
  }
}

async function downloadAndScanSubmission(url, user) {
  const file = await axios({
    url,
    method: 'get',
    responseType: 'arraybuffer',
  });

  virusTotal.uploadFile(file.data, `${user.id}.hs`, 'application/octet-stream', (err, res) => {
    if (err) console.error({ err });

    const uploadRes = JSON.parse(res);
    console.log('File uploaded to virustotal');

    virusTotal.getAnalysisInfo(uploadRes.data.id, async (e, r) => {
      if (e) console.log(e);

      const analysisRes = JSON.parse(r);

      const { stats } = analysisRes.data.attributes;

      console.log(`${stats.malicious} malicious detections.`);

      if (stats.malicious === 0) {
        user.send('Your last submission has cleared the antivirus check and is now ready to rock!');
        await fs.writeFile(path.join(submissionsPath, `${user.id}.hs`), file.data);
      } else {
        user.send(`⚠ Your last submission was flagged by ${stats.malicious} engines on virustotal and was rejected for submission. Please contact BenCo for support. ⚠`);
      }
    });
  });
}

async function createEnvironment(userid) {
  // const userPath = path.join(__dirname, `../environments/${userid}`);
  const uuidPath = path.join(__dirname, `../environments/${uuid.v4()}`);

  // const newPath = await promisify(rimraf)(uuidPath);
  await copy(repoPath, uuidPath, { overwrite: false });
  // await unlink(path.join(__dirname, `../environments/${userid}/src/AI.hs`));
  await copyFile(path.join(submissionsPath, `${userid}.hs`), path.join(uuidPath, '/src/AI.hs'));

  return uuidPath;
}

export {
  downloadAndScanSubmission, createFolder, createEnvironment, submissionsPath, environmentsPath,
};
