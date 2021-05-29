/* eslint-disable no-param-reassign */
import { spawn } from 'child_process';
import { Message, MessageEmbed } from 'discord.js';
// eslint-disable-next-line camelcase
import { quality_1vs1, rate_1vs1, Rating } from 'ts-trueskill';
import { stripIndents } from 'common-tags';
// eslint-disable-next-line
import { User } from './database';
// eslint-disable-next-line
import {createEnvironment} from './submissionManager';
// eslint-disable-next-line
import {CompClient, Outcome} from './comp';

const errorHints = stripIndents`Uh oh, looks like your submission has hit a snag and caused an error. This could be for a number of reasons...
- You forgot to create a 'default' ai method.
- You have non-standard dependencies or libraries required in your code.
- You forgot to wait for your code to pass the virus-scan.
- A headless process has accidentally been created. (This will be cleared within ten minutes, try again then).`;

function runCabal(
  // eslint-disable-next-line no-unused-vars
  command, args, cwd, title, userid, cbText = [], cb?: () => void,
): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    const process = spawn(command, args, { cwd });

    const timeout = setTimeout(() => {
      process.kill();
    }, 600000);

    process.stdout.on('data', (data: Buffer) => {
      console.log(`[${title.toUpperCase()}_${userid}] ${data}`);
      stdout.push(data);
      cbText.forEach((target) => {
        if (data.includes(target) && cb !== undefined) {
          cb();
        }
      });
    });

    process.stderr.on('data', (data) => {
      console.error(`[${title.toUpperCase()}_ERROR_${userid}] ${data}`);
      stderr.push(data);
    });

    process.on('close', (code) => {
      clearTimeout(timeout);
      console.log(`[${title.toUpperCase()}_${userid}] Done. (${code})`);
      if (code === 0) resolve(stdout);
      else reject(stderr.join('\n'));
    });

    process.on('error', (err) => {
      clearTimeout(timeout);
      console.error('Failed to start server build.');
      console.error(err);
      reject(err);
    });
  });
}

async function battle(playerA: User, playerB: User, message: Message) {
  const result = new MessageEmbed()
    .setTitle('Reversi-nator 5000')
    .addField('Status', 'Initializing 🕑')
    .addField('Player A', `${playerA.username} (<@${playerA.id}>)`)
    .addField('Player B', `${playerB.username} (<@${playerB.id}>)`);

  const ratingA = new Rating(playerA.skillRating, playerA.sigma);
  const ratingB = new Rating(playerB.skillRating, playerB.sigma);

  const matchQuality = quality_1vs1(ratingA, ratingB);

  result.addField('Predicted Match Quality (TrueSkill)', Math.round(matchQuality * 100) / 100);

  const resultMessage = await message.channel.send(result);

  try {
    result.spliceFields(0, 1, [{ name: 'Status', value: 'Creating environments 🌏' }]);
    await resultMessage.edit(result);

    const [playerADir, playerBDir] = await Promise.all([
      createEnvironment(playerA.id),
      createEnvironment(playerB.id),
    ]);

    let port = 5000;
    while ((<CompClient>message.client).occupiedPorts.includes(port)) {
      port += 1;
    }
    (<CompClient>message.client).occupiedPorts.push(port);
    console.log(`Running on port ${port}`);

    result.spliceFields(0, 1, [{ name: 'Status', value: 'Building code 🛠' }]);
    await resultMessage.edit(result);

    await Promise.all([
      runCabal('cabal', ['v2-build', 'game'], playerADir, 'sbuild', playerA.id),
      runCabal('cabal', ['v2-build', 'game'], playerBDir, 'cbuild', playerB.id),
    ]);

    result.spliceFields(0, 1, [{ name: 'Status', value: 'Starting server 🖥' }]);
    await resultMessage.edit(result);

    await runCabal(
      'cabal',
      ['v2-run', 'game', '--', '--host', port, '--p1', 'ai', '--p2', 'network', '--ui', 'json'],
      playerADir,
      'server',
      playerA.id,
      ['Up to date'],
      async () => {
        console.log('Ready');
        try {
          result.spliceFields(0, 1, [{ name: 'Status', value: 'Playing 🎮' }]);
          await resultMessage.edit(result);

          const rawOutput = await runCabal(
            'cabal',
            ['v2-run', 'game', '--', '--connect', `127.0.0.1:${port}`, '--p1', 'network', '--p2', 'ai', '--ui', 'json'],
            playerBDir,
            'client',
            playerB.id,
          );

          result.spliceFields(0, 1, [{ name: 'Status', value: 'Calculating ranks 🤓' }]);
          await resultMessage.edit(result);

          const output = rawOutput.map((log) => log.toString());

          const outcome: Outcome = JSON.parse(output.pop());

          const winner = {
            player2: playerB, player1: playerA,
          }[outcome.finalState.turn.outcome.player];

          const loser = {
            player2: playerA, player1: playerB,
          }[outcome.finalState.turn.outcome.player];

          let newRatingA: Rating;
          let newRatingB: Rating;
          if (winner === playerA) {
            [newRatingA, newRatingB] = rate_1vs1(ratingA, ratingB);
          } else {
            [newRatingB, newRatingA] = rate_1vs1(ratingB, ratingA);
          }

          const finalBoard = outcome.finalState.board;
          const playerAScore = finalBoard.match(/1/g).length;
          const playerBScore = finalBoard.match(/2/g).length;

          const dRatingA = (newRatingA.mu - ratingA.mu).toPrecision(3);
          const dSigmaA = (newRatingA.sigma - ratingA.sigma).toPrecision(3);
          const dRatingB = (newRatingB.mu - ratingB.mu).toPrecision(3);
          const dSigmaB = (newRatingB.sigma - ratingB.sigma).toPrecision(3);

          result.addField(`Final score (${playerA.username} - ${playerB.username})`, `${playerAScore} - ${playerBScore}`);
          result.addField(`${playerA.username} Rating Adjustment`, `${+dRatingA > 0 ? '+' : ''}${dRatingA}=>${newRatingA.mu.toPrecision(3)} (${+dSigmaA > 0 ? '+' : ''}${dSigmaA}=>${newRatingA.sigma.toPrecision(3)})`);
          result.addField(`${playerB.username} Rating Adjustment`, `${+dRatingB > 0 ? '+' : ''}${dRatingB}=>${newRatingB.mu.toPrecision(3)} (${+dSigmaB > 0 ? '+' : ''}${dSigmaB}=>${newRatingB.sigma.toPrecision(3)})`);
          result.spliceFields(0, 3, [
            { name: 'Status', value: 'Saving Results 💾' },
            { name: 'Winner', value: `${winner.username} (<@${winner.id}>)` },
            { name: 'Loser', value: `${loser.username} (<@${loser.id}>)` },
          ]);
          await resultMessage.edit(result);

          playerA.skillRating = newRatingA.mu;
          playerA.sigma = newRatingA.sigma;
          playerB.skillRating = newRatingB.mu;
          playerB.sigma = newRatingB.sigma;

          await Promise.all([playerA.save(), playerB.save()]);
          result.spliceFields(0, 1, [{ name: 'Status', value: 'Match Complete 🏆' }]);

          await resultMessage.edit(result);
        } catch (e) {
          console.error(e);
          let error = '';
          if ((e?.toString() ?? '') === '') error = 'Error unspecified.';
          else error = e.toString();
          result.spliceFields(0, 1, [{ name: 'Status', value: 'Error' }]);
          result.addField('Error Response', error);
          await resultMessage.edit(result);
          await resultMessage.channel.send(`<@${playerA.id}>, <@${playerB.id}>\n${errorHints}`);
        }
      },
    );
    (<CompClient>message.client).occupiedPorts = (<CompClient>message.client).occupiedPorts
      .filter((p) => p !== port);
  } catch (e) {
    console.error(e);
    let error = '';
    if ((e?.toString() ?? '') === '') error = 'Error unspecified.';
    else error = e.toString();
    result.spliceFields(0, 1, [{ name: 'Status', value: 'Error' }]);
    result.addField('Error Response', error);
    await resultMessage.edit(result);
    await resultMessage.channel.send(`<@${playerA.id}>, <@${playerB.id}>\n${errorHints}`);
  }

  return resultMessage;
}

// eslint-disable-next-line import/prefer-default-export
export { battle };
