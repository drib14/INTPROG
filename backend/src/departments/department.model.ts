import { DataTypes } from 'sequelize';

export default function model(sequelize: any) {
    const attributes = {
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.STRING, allowNull: false }
    };
    
    const options = {
        timestamps: false
    };
    
    return sequelize.define('department', attributes, options);
}
