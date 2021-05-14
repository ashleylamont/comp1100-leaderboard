import { Command, CommandoMessage } from 'discord.js-commando';
import * as discord from 'discord.js';
// eslint-disable-next-line
import { User } from '../../database';
// eslint-disable-next-line
import { battle } from '../../competition';

export default class BattleCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'battle',
      group: 'comp',
      memberName: 'battle',
      description: 'Selects another player to battle and battles them.',
      guildOnly: true,
      args: [
        {
          key: 'opponent',
          prompt: 'Who would you like to battle?',
          type: 'user',
        },
      ],
      throttling: {
        usages: 1,
        duration: 60,
      },
    });
  }

  // eslint-disable-next-line class-methods-use-this
  async run(message: CommandoMessage, args: {opponent: discord.User}) {
    if (args.opponent.bot) return message.reply('Opponent cannot be a bot.');
    if (args.opponent === message.author) return message.reply('You can\'t challenge yourself.');

    const challenger = await User.findOne({
      where: {
        id: message.author.id,
      },
    });

    if (challenger === null) return message.reply('You need to join using `join` first!');

    const opponent = await User.findOne({
      where: {
        id: args.opponent.id,
      },
    });

    if (opponent === null) return message.reply('Your opponent needs to join using `join` first!');

    const outcome = await battle(challenger, opponent, message);

    return outcome;
  }
}
