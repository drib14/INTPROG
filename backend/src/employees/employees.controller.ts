import express from 'express';
const router = express.Router();
import authorize from '../_middleware/authorize';
import Role from '../_helpers/role';
import db from '../_helpers/db';

router.use(authorize(Role.Admin));

router.get('/', getAll);
router.post('/', create);
router.put('/:empId', update);
router.delete('/:empId', _delete);

export default router;

function getAll(req: any, res: any, next: any) {
    db.Employee.findAll()
        .then((emps: any) => res.json(emps))
        .catch(next);
}

async function create(req: any, res: any, next: any) {
    const { empId, email, firstName, lastName, position, department, hireDate } = req.body;
    try {
        const account = await db.Account.findOne({ where: { email } });
        if (!account) {
            return res.status(400).json({ message: 'The email address must belong to a registered account.' });
        }
        
        const existingEmp = await db.Employee.findOne({ where: { email } });
        if (existingEmp) {
            return res.status(400).json({ message: 'User account already linked to another employee' });
        }
        
        const emp = await db.Employee.create({ empId, email, firstName, lastName, position, department, hireDate });
        res.status(201).json(emp);
    } catch (err) {
        next(err);
    }
}

function update(req: any, res: any, next: any) {
    db.Employee.findByPk(req.params.empId)
        .then((emp: any) => {
            if (!emp) throw 'Employee not found';
            Object.assign(emp, req.body);
            return emp.save();
        })
        .then((emp: any) => res.json(emp))
        .catch(next);
}

function _delete(req: any, res: any, next: any) {
    db.Employee.findByPk(req.params.empId)
        .then((emp: any) => {
            if (!emp) throw 'Employee not found';
            return emp.destroy();
        })
        .then(() => res.json({ message: 'Employee deleted' }))
        .catch(next);
}
