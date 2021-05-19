import { Command, CommandoMessage } from 'discord.js-commando';
import { CategoryChannel } from 'discord.js';
// eslint-disable-next-line
import { User } from '../../database';
// eslint-disable-next-line
import { downloadAndScanSubmission } from '../../submissionManager';

export default class SubmitCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'submit',
      group: 'comp',
      memberName: 'submit',
      description: 'Opens up a submission channel and lets you send your file there.',
      guildOnly: true,
      clientPermissions: ['MANAGE_CHANNELS'],
      throttling: {
        usages: 2,
        duration: 900,
      },
    });
  }

  // eslint-disable-next-line class-methods-use-this
  async run(message: CommandoMessage) {
    const user = await User.findOne({
      where: {
        id: message.author.id,
      },
    });

    if (user === null) return message.reply('You need to join using `join` first!');

    // @ts-ignore This is kinda just sketchy typescript on discord.js's part.
    const category: CategoryChannel | undefined = message.guild.channels.cache
      .filter((channel) => channel.type === 'category')
      .find((channel) => channel.name === 'Submissions');

    if (category === undefined) return message.reply('I need a submissions category to let you upload your code. Ask a server admin to create a category called `Submissions`.');

    const channel = await message.guild.channels.create(`Submission - ${user.username}`);
    await Promise.all([
      channel.setParent(category),
      channel.updateOverwrite(channel.guild.roles.everyone, { VIEW_CHANNEL: false }),
      channel.updateOverwrite(message.author,
        { VIEW_CHANNEL: true, SEND_MESSAGES: true, ATTACH_FILES: true }),
    ]);
    await channel.send(`<@${message.author.id}>, Send your AI.hs file here in the next five minutes.`);
    await message.channel.send('Submission channel created, you\'ve been pinged in it!');

    const filter = (msg) => msg.attachments.size > 0;
    const collector = channel.createMessageCollector(filter, { time: 300000, max: 1 });

    collector.on('collect', async (m) => {
      m.reply('Uploading submission now. Thanks for playing!\n**NOTE: The submission will run a virus check first. You will be notified when this is complete.**');
      const attachment = m.attachments.first();

      await downloadAndScanSubmission(attachment.url, message.author);
    });

    collector.on('end', async () => {
      await channel.send('Closing submission channel in 5 seconds...');
      setTimeout(() => {
        channel.delete();
      }, 5000);
    });

    return message.reply('I\'ve messaged you with instructions.');
  }
}
