import { Command, CommandoMessage } from 'discord.js-commando';
import { expose, Rating } from 'ts-trueskill';
// eslint-disable-next-line
import {MessageEmbed} from "discord.js";
// eslint-disable-next-line
import {User} from '../../database';

export default class LeaderboardCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'leaderboard',
      group: 'comp',
      memberName: 'leaderboard',
      description: 'Shows the leaderboard for the competition.',
      guildOnly: true,
      args: [
        {
          type: 'boolean',
          default: false,
          key: 'forceRatingOnly',
          prompt: 'Would you like to force the leaderboard to only use player ratings.',
        },
      ],
    });
  }

  // eslint-disable-next-line class-methods-use-this
  async run(message: CommandoMessage, { forceRatingOnly }: {forceRatingOnly: boolean}) {
    const users = await User.findAll();

    // eslint-disable-next-line no-unused-vars
    type RatingFunction = (a: User, b: User) => number;
    // eslint-disable-next-line no-unused-vars
    type RatingKey = (a: User) => number;

    const ratingOnlyKey: RatingKey = (a) => a.skillRating;

    const trueSkillKey: RatingKey = (a) => expose(new Rating(a.skillRating, a.sigma));

    const ratingKey: RatingKey = forceRatingOnly ? ratingOnlyKey : trueSkillKey;
    const ratingFunction: RatingFunction = (a, b) => ratingKey(b) - ratingKey(a);

    users.sort(ratingFunction);

    const leaderboardMessage = new MessageEmbed();

    leaderboardMessage.setTitle('COMP1100/30 Leaderboard');
    leaderboardMessage.setDescription(forceRatingOnly ? 'Using skill rating only :(' : 'Using TrueSkill rank :)');
    leaderboardMessage.setTimestamp(new Date());
    leaderboardMessage.setColor(forceRatingOnly ? 'RED' : 'GREEN');

    // let leaderboardString = '';

    users.forEach((user, i) => {
      // eslint-disable-next-line max-len
      // leaderboardString += `#${i + 1} ${user.username} (<@${user.id}>)\n  ↳  ${ratingKey(user).toFixed(2)}\n`;
      leaderboardMessage.addField(`#${i + 1}: ${user.username}`, ratingKey(user).toFixed(2));
    });

    // eslint-disable-next-line max-len
    // leaderboardMessage.addField(`Results (${forceRatingOnly ? 'Skill Rating Only' : 'TrueSkill Rank'})`, leaderboardString);

    return message.channel.send(leaderboardMessage);
  }
}
