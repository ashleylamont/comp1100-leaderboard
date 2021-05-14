/* eslint-disable no-param-reassign */
import { spawn } from 'child_process';
import { Message, MessageEmbed } from 'discord.js';
// eslint-disable-next-line camelcase
import { Rating, quality_1vs1, rate_1vs1 } from 'ts-trueskill';
// eslint-disable-next-line
import { User } from './database';
// eslint-disable-next-line
import { createEnvironment } from './submissionManager';
// eslint-disable-next-line
import {CompClient, Outcome} from './comp';

function runCabal(
  command, args, cwd, title, userid, cbText = [], cb = () => {},
): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    const stdout = [];
    const process = spawn(command, args, { cwd });

    let cbCalled = false;

    process.stdout.on('data', (data) => {
      console.log(`[${title.toUpperCase()}_${userid}] ${data}`);
      stdout.push(data);
      cbText.forEach((target) => {
        if (data.includes(target) && !cbCalled) {
          cbCalled = true;
          cb();
        }
      });
    });

    process.stderr.on('data', (data) => {
      console.error(`[${title.toUpperCase()}_ERROR_${userid}] ${data}`);
    });

    process.on('close', (code) => {
      console.log(`[${title.toUpperCase()}_${userid}] Done. (${code})`);
      if (code === 0) resolve(stdout);
      else reject();
    });

    process.on('error', (err) => {
      console.error('Failed to start server build.');
      console.error(err);
    });
  });
}

async function battle(playerA: User, playerB: User, message: Message) {
  const result = new MessageEmbed()
    .setTitle('Reversi-nator 5000')
    .addField('Status', 'Initializing 🕑');

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
      ['v2-run', 'game', '--', '--host', port, '--p1', 'ai:firstLegalMove', '--p2', 'network', '--ui', 'json'],
      playerADir,
      'server',
      playerA.id,
      ['Linking', 'Up to date'],
      async () => {
        console.log('Ready');

        result.spliceFields(0, 1, [{ name: 'Status', value: 'Playing ♟' }]);
        await resultMessage.edit(result);

        const rawOutput = await runCabal(
          'cabal',
          ['v2-run', 'game', '--', '--connect', `127.0.0.1:${port}`, '--p1', 'network', '--p2', 'ai:firstLegalMove', '--ui', 'json'],
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

        const dRatingA = (newRatingA.mu - ratingA.mu).toPrecision(3);
        const dSigmaA = (newRatingA.sigma - ratingA.sigma).toPrecision(3);
        const dRatingB = (newRatingB.mu - ratingB.mu).toPrecision(3);
        const dSigmaB = (newRatingB.sigma - ratingB.sigma).toPrecision(3);

        result.addField('Winner', `${winner.username} (<@${winner.id}>)`);
        result.addField('Loser', `${loser.username} (<@${loser.id}>)`);
        result.addField(`${playerA.username} Rating Adjustment`, `${+dRatingA > 0 ? '+' : ''}${dRatingA}=>${newRatingA.mu.toPrecision(3)} (${+dSigmaA > 0 ? '+' : ''}${dSigmaA}=>${newRatingA.sigma.toPrecision(3)})`);
        result.addField(`${playerB.username} Rating Adjustment`, `${+dRatingB > 0 ? '+' : ''}${dRatingB}=>${newRatingB.mu.toPrecision(3)} (${+dSigmaB > 0 ? '+' : ''}${dSigmaB}=>${newRatingB.sigma.toPrecision(3)})`);
        result.spliceFields(0, 1, [{ name: 'Status', value: 'Saving Results 💾' }]);
        await resultMessage.edit(result);

        playerA.skillRating = newRatingA.mu;
        playerA.sigma = newRatingA.sigma;
        playerB.skillRating = newRatingB.mu;
        playerB.sigma = newRatingB.sigma;

        await Promise.all([playerA.save(), playerB.save()]);
        result.spliceFields(0, 1, [{ name: 'Status', value: 'Match Complete 🏆' }]);

        await resultMessage.edit(result);
      },
    );
  } catch (e) {
    console.error(e);
    result.spliceFields(0, 1, [{ name: 'Status', value: 'Error' }]);
    result.addField('Error Response', e);
    await resultMessage.edit(result);
  }

  return resultMessage;
}

// eslint-disable-next-line import/prefer-default-export
export { battle };
