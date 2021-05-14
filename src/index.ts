import { CommandoClient } from 'discord.js-commando';
import * as path from 'path';
// eslint-disable-next-line
import {sequelize, init, User} from './database';
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
});

client.on('error', console.error);

init()
  .then(() => createFolder(submissionsPath))
  .then(() => createFolder(environmentsPath))
  .then(() => {
    client.login(token);
  });

// https://discord.com/oauth2/authorize?client_id=841643910748045352&scope=bot&permissions=8
