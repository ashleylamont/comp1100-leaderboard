// eslint-disable-next-line max-classes-per-file
import { Sequelize, Model, DataTypes } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'sqlite.db',
});

class User extends Model {
  id: string;

  username: string;

  skillRating: number;

  sigma: number;
}
User.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  skillRating: {
    type: DataTypes.FLOAT,
    defaultValue: 25,
  },
  sigma: {
    type: DataTypes.FLOAT,
    defaultValue: 8.333333333333334,
  },
}, { sequelize, modelName: 'user' });

class Song extends Model {
  id: number;

  name: string;

  author: string;

  user: string;
}
Song.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  user: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, { sequelize, modelName: 'song' });

async function init() {
  await sequelize.sync();
}

export {
  init, sequelize, User, Song,
};
