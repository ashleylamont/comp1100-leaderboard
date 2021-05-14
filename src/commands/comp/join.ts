import { Command, CommandoMessage } from 'discord.js-commando';
import { stripIndents } from 'common-tags';
// eslint-disable-next-line
import { User } from '../../database';

export default class JoinCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'join',
      group: 'comp',
      memberName: 'join',
      description: 'Joins the competition and sends submission instructions.',
      guildOnly: true,
      args: [
        {
          key: 'username',
          prompt: 'What would you like your username in the leaderboard to be? (Defaults to your username)',
          type: 'string',
          default: '',
        },
      ],
    });
  }

  // eslint-disable-next-line class-methods-use-this
  async run(message: CommandoMessage, args: {username: string}) {
    let { username } = args;
    if (username.trim() === '') username = message.member.displayName;

    const [, created] = await User.findOrCreate({
      where: {
        id: message.author.id,
      },
      defaults: {
        username,
      },
    });
    if (created) await message.say(`Welcome aboard, ${username}!\nI've gone ahead and created a user for you!`);

    message.author.send(stripIndents`G'day ${username}, welcome aboard.
    
      This competition is pretty simple, just submit code using the \`?submit\` command (we'll make a custom channel for privacy for your code) and submit your AI.hs file there.
      The bot will run a competition amongst submitted users' code every couple of hours and adjust ranks/send results accordingly.
      Improve your AI to top the leaderboard!
      
      Have fun and may the best function win :P -Ben`);

    return message.reply('I\'ve messaged you with instructions.');
  }
}
