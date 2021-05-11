import {CommandoClient} from 'discord.js-commando';
import * as path from 'path';
import config from './config';
const {commandoConfig,token} = config;

const client = new CommandoClient(commandoConfig);

client.registry
  .registerDefaultTypes()
.registerGroups([
    ['comp', 'COMP1100 Command group']
])
.registerDefaultGroups()
.registerDefaultCommands()
.registerCommandsIn(path.join(__dirname, 'commands'));

client.once('ready', ()=>{
  console.log(`Logged in as ${client.user.tag}. Ready to serve ${client.users.cache.size} users.`);
  client.user.setActivity('reversi');
});

client.on('error', console.error);

client.login(token);
