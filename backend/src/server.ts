import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import errorHandler from './_middleware/error-handler';
import authorize from './_middleware/authorize';
import accountsController from './accounts/accounts.controller';
import accountService from './accounts/account.service';
import swaggerDocs from './_helpers/swagger';
import db from './_helpers/db';

// Extra controllers for frontend integration
import departmentsController from './departments/departments.controller';
import employeesController from './employees/employees.controller';
import requestsController from './requests/requests.controller';
import statsController from './stats/stats.controller';

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// allow cors requests from any origin and with credentials
app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));

// api routes
app.use('/accounts', accountsController);
app.use('/api-docs', swaggerDocs);

// Extra API routes for frontend
app.use('/departments', departmentsController);
app.use('/employees', employeesController);
app.use('/requests', requestsController);
app.use('/stats', statsController);

// --- Legacy Auth Compatibility Endpoints for Frontend (avoid modifying frontend script.js where possible) ---

// Login Endpoint
app.post('/login', async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const result = await accountService.authenticate({ email, password, ipAddress: req.ip });
        // Return matching format expected by frontend AuthService.login
        res.json({ 
            token: result.jwtToken, 
            user: {
                ...result,
                verified: result.isVerified
            } 
        });
    } catch (err) {
        next(err);
    }
});

// Register Endpoint
app.post('/register', async (req, res, next) => {
    try {
        await accountService.register({ ...req.body, title: 'Mr', acceptTerms: true }, req.get('origin'));
        res.json({ message: 'Registration successful' });
    } catch (err) {
        next(err);
    }
});

// Verify Email (simulation bypass) Endpoint
app.post('/verify', async (req, res, next) => {
    try {
        const account = await db.Account.findOne({ where: { email: req.body.email } });
        if (account) {
            account.verified = Date.now();
            account.verificationToken = null;
            await account.save();
            res.json({ message: 'Verified successfully' });
        } else {
            res.status(404).json({ message: 'Account not found' });
        }
    } catch (err) {
        next(err);
    }
});

// Profile Update Endpoint
app.put('/profile', authorize(), async (req: any, res, next) => {
    try {
        const account = await accountService.update(req.user.id, req.body);
        res.json(account);
    } catch (err) {
        next(err);
    }
});

// Me Profile Retrieval Endpoint
app.get('/me', authorize(), async (req: any, res, next) => {
    try {
        const account = await accountService.getById(req.user.id);
        res.json({
            ...account,
            verified: account.isVerified
        });
    } catch (err) {
        next(err);
    }
});

// Reset Password (direct bypass) Endpoint
app.post('/reset-password', async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const account = await db.Account.findOne({ where: { email } });
        if (account) {
            account.passwordHash = await bcrypt.hash(password, 10);
            await account.save();
            res.json({ message: 'Password reset successfully' });
        } else {
            res.status(404).json({ message: 'Account not found' });
        }
    } catch (err) {
        next(err);
    }
});

// global error handler
app.use(errorHandler);

// start server
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 4000;
app.listen(port, () => console.log('Server listening on port ' + port));
