import { CommandoClient } from 'discord.js-commando';
import { Sequelize } from 'sequelize';

export interface CompClient extends CommandoClient {
  sequelize?: Sequelize,
  occupiedPorts?: number[]
}

export interface FinalState {
  board: string,
  turn: {
    $type: string,
    outcome: {
      $type: string,
      player: string,
    }
  }
}

export interface Move {
  $type: string,
  player: 'player1' | 'player2',
  move: {
    pos: number[],
  }
}

export interface Outcome {
  player1: string,
  player2: string,
  gameStatus: string,
  finalState: FinalState,
  moves: Move[]
}
