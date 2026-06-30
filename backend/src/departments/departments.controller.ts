import express from 'express';
const router = express.Router();
import authorize from '../_middleware/authorize';
import Role from '../_helpers/role';
import db from '../_helpers/db';

router.use(authorize(Role.Admin));

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', _delete);

export default router;

function getAll(req: any, res: any, next: any) {
    db.Department.findAll()
        .then((depts: any) => res.json(depts))
        .catch(next);
}

function create(req: any, res: any, next: any) {
    db.Department.create(req.body)
        .then((dept: any) => res.status(201).json(dept))
        .catch(next);
}

function update(req: any, res: any, next: any) {
    db.Department.findByPk(req.params.id)
        .then((dept: any) => {
            if (!dept) throw 'Department not found';
            Object.assign(dept, req.body);
            return dept.save();
        })
        .then((dept: any) => res.json(dept))
        .catch(next);
}

function _delete(req: any, res: any, next: any) {
    db.Department.findByPk(req.params.id)
        .then((dept: any) => {
            if (!dept) throw 'Department not found';
            return dept.destroy();
        })
        .then(() => res.json({ message: 'Department deleted' }))
        .catch(next);
}
