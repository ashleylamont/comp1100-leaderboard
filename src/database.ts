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

async function init() {
  await sequelize.sync();
}

export { init, sequelize, User };
