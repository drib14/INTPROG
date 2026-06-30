import express from 'express';
const router = express.Router();
import authorize from '../_middleware/authorize';
import Role from '../_helpers/role';
import db from '../_helpers/db';

router.use(authorize());

router.get('/', getAll);
router.post('/', create);
router.put('/:id/status', authorize(Role.Admin), updateStatus);
router.delete('/:id', _delete);

export default router;

async function getAll(req: any, res: any, next: any) {
    try {
        const account = await db.Account.findByPk(req.user.id);
        if (!account) throw 'Account not found';
        
        if (account.role === Role.Admin) {
            const requests = await db.Request.findAll();
            res.json(requests);
        } else {
            const requests = await db.Request.findAll({ where: { employeeEmail: account.email } });
            res.json(requests);
        }
    } catch (err) {
        next(err);
    }
}

async function create(req: any, res: any, next: any) {
    const { type, items, status, date } = req.body;
    try {
        const account = await db.Account.findByPk(req.user.id);
        if (!account) throw 'Account not found';
        
        const newReq = await db.Request.create({
            id: Date.now(),
            type,
            items,
            status: status || 'Pending',
            date,
            employeeEmail: account.email
        });
        res.status(201).json(newReq);
    } catch (err) {
        next(err);
    }
}

function updateStatus(req: any, res: any, next: any) {
    db.Request.findByPk(req.params.id)
        .then((reqItem: any) => {
            if (!reqItem) throw 'Request not found';
            reqItem.status = req.body.status;
            return reqItem.save();
        })
        .then((reqItem: any) => res.json(reqItem))
        .catch(next);
}

async function _delete(req: any, res: any, next: any) {
    try {
        const reqItem = await db.Request.findByPk(req.params.id);
        if (!reqItem) throw 'Request not found';
        
        const account = await db.Account.findByPk(req.user.id);
        if (!account) throw 'Account not found';
        
        // must be owner or admin
        if (account.role !== Role.Admin && reqItem.employeeEmail !== account.email) {
            return res.sendStatus(403);
        }
        
        await reqItem.destroy();
        res.json({ message: 'Request deleted' });
    } catch (err) {
        next(err);
    }
}
