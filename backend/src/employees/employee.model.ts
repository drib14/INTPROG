import { DataTypes } from 'sequelize';

export default function model(sequelize: any) {
    const attributes = {
        empId: { type: DataTypes.STRING, primaryKey: true },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        firstName: { type: DataTypes.STRING, allowNull: false },
        lastName: { type: DataTypes.STRING, allowNull: false },
        position: { type: DataTypes.STRING, allowNull: false },
        department: { type: DataTypes.STRING, allowNull: false },
        hireDate: { type: DataTypes.STRING, allowNull: false }
    };
    
    const options = {
        timestamps: false
    };
    
    return sequelize.define('employee', attributes, options);
}
