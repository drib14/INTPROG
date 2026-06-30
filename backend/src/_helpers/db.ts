import config from '../../config.json';
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import accountModel from '../accounts/account.model';
import refreshTokenModel from '../accounts/refresh-token.model';
import departmentModel from '../departments/department.model';
import employeeModel from '../employees/employee.model';
import requestModel from '../requests/request.model';

const db: any = {};
export default db;

initialize();

async function initialize() {
    const { host, port, user, password, database } = config.database;
    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);

    const sequelize = new Sequelize(database, user, password, {
        dialect: 'mysql',
        host,
        port,
        logging: false
    });

    db.Account = accountModel(sequelize);
    db.RefreshToken = refreshTokenModel(sequelize);
    db.Department = departmentModel(sequelize);
    db.Employee = employeeModel(sequelize);
    db.Request = requestModel(sequelize);

    // Relationships
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);

    await sequelize.sync({ alter: true });

    // Seed default admin if database has no accounts
    const accountCount = await db.Account.count();
    if (accountCount === 0) {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash('Password123!', 10);
        await db.Account.create({
            email: 'admin@example.com',
            passwordHash: hashedPassword,
            title: 'Mr',
            firstName: 'System',
            lastName: 'Admin',
            acceptTerms: true,
            role: 'Admin',
            verified: new Date()
        });
        console.log('✅ Default admin account seeded: admin@example.com / Password123!');
    }
}
