import { DataTypes } from 'sequelize';

export default function model(sequelize: any) {
    const attributes = {
        id: { type: DataTypes.BIGINT, primaryKey: true },
        type: { type: DataTypes.STRING, allowNull: false },
        items: { type: DataTypes.JSON, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Pending' },
        date: { type: DataTypes.STRING, allowNull: false },
        employeeEmail: { type: DataTypes.STRING, allowNull: false }
    };
    
    const options = {
        timestamps: false
    };
    
    return sequelize.define('request', attributes, options);
}
