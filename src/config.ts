import { CommandoClientOptions } from 'discord.js-commando';

const config: {
  token: string,
  commandoConfig: CommandoClientOptions,
  virustotalKey: string
} = {
  token: 'ODQxNjQzOTEwNzQ4MDQ1MzUy.YJpv-Q.naI3KP_xm0h7OhIF0wjZjRle4jc',
  commandoConfig: {
    commandPrefix: '?',
    invite: 'https://discord.gg/yx28pSsA4v',
    owner: '238194337253556224',
    ws: {
      intents: [
        'GUILDS',
        'GUILD_MESSAGES',
        'GUILD_MEMBERS',
        'DIRECT_MESSAGES',
        'GUILD_PRESENCES',
      ],
    },
  },
  virustotalKey: '1d68e80f942b2f0b4d5a554a798ffa5d515e8f7d5544cf33fed967b4a24bab10',
};

export default config;
