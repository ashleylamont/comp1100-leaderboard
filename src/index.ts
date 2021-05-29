import { CommandoClient } from 'discord.js-commando';
import * as path from 'path';
// eslint-disable-next-line
import {sequelize, init, User, Song} from './database';
// eslint-disable-next-line
import config from './config';
// eslint-disable-next-line
import { CompClient } from './comp';
// eslint-disable-next-line
import { createFolder, submissionsPath, environmentsPath } from './submissionManager';

const { commandoConfig, token } = config;

const client: CompClient = new CommandoClient(commandoConfig);

client.sequelize = sequelize;

client.occupiedPorts = [];

client.registry
  .registerDefaultTypes()
  .registerGroups([
    ['comp', 'COMP1100 Command group'],
  ])
  .registerDefaultGroups()
  .registerDefaultCommands()
  .registerCommandsIn({
    filter: /^([^.].*)\.(js|ts)$/,
    dirname: path.join(__dirname, 'commands'),
  });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}. Ready to serve ${client.users.cache.size} users.`);
  client.user.setActivity('reversi');

  const callback = () => {
    console.log('Fetching songs');
    client.users.cache.forEach((user) => {
      const spotifyActivity = user.presence.activities.find(({ name }) => name === 'Spotify');
      if (spotifyActivity) {
        Song.create({
          name: spotifyActivity.details,
          author: spotifyActivity.state,
          user: user.id,
        }).catch((e) => {
          console.error(e);
        });
      }
    });
  };
  callback();
  setInterval(callback, 300_000);
});

client.on('error', console.error);

init()
  .then(() => createFolder(submissionsPath))
  .then(() => createFolder(environmentsPath))
  .then(() => client.login(token));

// https://discord.com/oauth2/authorize?client_id=841643910748045352&scope=bot&permissions=8
