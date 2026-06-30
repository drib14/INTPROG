import express from 'express';
const router = express.Router();
import authorize from '../_middleware/authorize';
import Role from '../_helpers/role';
import db from '../_helpers/db';

router.use(authorize());

router.get('/', getStats);

export default router;

async function getStats(req: any, res: any, next: any) {
    try {
        const account = await db.Account.findByPk(req.user.id);
        if (!account) throw 'Account not found';
        
        if (account.role === Role.Admin) {
            const accountsCount = await db.Account.count();
            const deptsCount = await db.Department.count();
            const empsCount = await db.Employee.count();
            const pendingReqsCount = await db.Request.count({ where: { status: 'Pending' } });

            res.json({
                accountsCount,
                deptsCount,
                empsCount,
                pendingReqsCount
            });
        } else {
            const totalRequests = await db.Request.count({ where: { employeeEmail: account.email } });
            const pendingCount = await db.Request.count({ where: { employeeEmail: account.email, status: 'Pending' } });
            const approvedCount = await db.Request.count({ where: { employeeEmail: account.email, status: 'Approved' } });

            res.json({
                totalRequests,
                pendingCount,
                approvedCount
            });
        }
    } catch (err) {
        next(err);
    }
}
