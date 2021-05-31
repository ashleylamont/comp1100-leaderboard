import { Command, CommandoMessage } from 'discord.js-commando';
// eslint-disable-next-line
import { User } from '../../database';
// eslint-disable-next-line
import { battle } from '../../competition';

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    // eslint-disable-next-line no-param-reassign
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const combinations = require('combinations');

export default class TournamentCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'tournament',
      group: 'comp',
      memberName: 'tournament',
      description: 'Starts matches between an assortment of random players.',
      guildOnly: true,
      userPermissions: ['ADMINISTRATOR'],
      throttling: {
        usages: 1,
        duration: 60,
      },
    });
  }

  // eslint-disable-next-line class-methods-use-this
  async run(message: CommandoMessage) {
    const contestants = [];

    const guildMembers = await message.guild.members.fetch({ force: true, time: 10e3 });

    await Promise.all(guildMembers
      .filter((member) => !member.user.bot)
      .map(async (member) => {
        const contestant = await User.findOne({
          where: {
            id: member.id,
          },
        });

        if (contestant) contestants.push(contestant);
      }));

    const pairs = shuffle(combinations(contestants, 2, 2));

    const count = Math.ceil(Math.sqrt(pairs.length));

    const selectedPairs = shuffle(pairs.slice(0, count));

    selectedPairs.forEach(([a, b]) => {
      console.log(`Battling ${a.username} and ${b.username}`);

      battle(a, b, message);
    });

    return message;
  }
}
