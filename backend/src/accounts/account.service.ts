// accounts/account.service.ts
import config from '../../config.json';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Op } from 'sequelize';
import sendEmail from '../_helpers/send-email';
import db from '../_helpers/db';
import Role from '../_helpers/role';

export default {
    authenticate,
    refreshToken,
    revokeToken,
    register,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function authenticate({ email, password, ipAddress }: any) {
    const account = await db.Account.scope('withHash').findOne({ where: { email } });

    if (!account || !account.isVerified || !(await bcrypt.compare(password, account.passwordHash))) {
        throw 'Email or password is incorrect';
    }

    const jwtToken = generateJwtToken(account);
    const refreshToken = generateRefreshToken(account, ipAddress);

    await refreshToken.save();

    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: refreshToken.token
    };
}

async function refreshToken({ token, ipAddress }: any) {
    const refreshToken = await getRefreshToken(token);
    const account = await db.Account.findByPk(refreshToken.accountId);

    const newRefreshToken = generateRefreshToken(account, ipAddress);
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    refreshToken.replacedByToken = newRefreshToken.token;
    await refreshToken.save();
    await newRefreshToken.save();

    const jwtToken = generateJwtToken(account);

    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: newRefreshToken.token
    };
}

async function revokeToken({ token, ipAddress }: any) {
    const refreshToken = await getRefreshToken(token);

    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
}

async function register(params: any, origin: any) {
    if (await db.Account.findOne({ where: { email: params.email } })) {
        return await sendAlreadyRegisteredEmail(params.email, origin);
    }

    const account = new db.Account(params);

    const isFirstAccount = (await db.Account.count()) === 0;
    account.role = isFirstAccount ? Role.Admin : Role.User;
    account.verificationToken = randomTokenString();

    account.passwordHash = await hash(params.password);

    await account.save();

    await sendVerificationEmail(account, origin);
}

async function verifyEmail({ token }: any) {
    const account = await db.Account.findOne({ where: { verificationToken: token } });

    if (!account) throw 'Verification failed';

    account.verified = Date.now();
    account.verificationToken = null;
    await account.save();
}

async function forgotPassword({ email }: any, origin: any) {
    const account = await db.Account.findOne({ where: { email } });

    if (!account) return;

    account.resetToken = randomTokenString();
    account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await account.save();

    await sendPasswordResetEmail(account, origin);
}

async function validateResetToken({ token }: any) {
    const account = await db.Account.findOne({
        where: {
            resetToken: token,
            resetTokenExpires: { [Op.gt]: Date.now() }
        }
    });

    if (!account) throw 'Invalid token';

    return account;
}

async function resetPassword({ token, password }: any) {
    const account = await validateResetToken({ token });

    account.passwordHash = await hash(password);
    account.passwordReset = Date.now();
    account.resetToken = null;
    await account.save();
}

async function getAll() {
    const accounts = await db.Account.findAll();
    return accounts.map((x: any) => basicDetails(x));
}

async function getById(id: any) {
    const account = await getAccount(id);
    return basicDetails(account);
}

async function create(params: any) {
    if (await db.Account.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already registered';
    }

    const account = new db.Account(params);
    account.verified = Date.now();

    account.passwordHash = await hash(params.password);

    await account.save();

    return basicDetails(account);
}

async function update(id: any, params: any) {
    const account = await getAccount(id);

    if (params.email && account.email !== params.email && await db.Account.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already taken';
    }

    if (params.password) {
        params.passwordHash = await hash(params.password);
    }

    Object.assign(account, params);
    account.updated = Date.now();
    await account.save();

    return basicDetails(account);
}

async function _delete(id: any) {
    const account = await getAccount(id);
    await account.destroy();
}

async function getAccount(id: any) {
    const account = await db.Account.findByPk(id);
    if (!account) throw 'Account not found';
    return account;
}

async function getRefreshToken(token: any) {
    const refreshToken = await db.RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !refreshToken.isActive) throw 'Invalid token';
    return refreshToken;
}

async function hash(password: any) {
    return await bcrypt.hash(password, 10);
}

function generateJwtToken(account: any) {
    return jwt.sign({ sub: account.id, id: account.id }, config.secret, { expiresIn: '15m' });
}

function generateRefreshToken(account: any, ipAddress: any) {
    return new db.RefreshToken({
        accountId: account.id,
        token: randomTokenString(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdByIp: ipAddress
    });
}

function randomTokenString() {
    return crypto.randomBytes(40).toString('hex');
}

function basicDetails(account: any) {
    const { id, title, firstName, lastName, email, role, created, updated, isVerified } = account;
    return { id, title, firstName, lastName, email, role, created, updated, isVerified };
}

async function sendVerificationEmail(account: any, origin: any) {
    let heading = 'Verify Your Email';
    let bodyText = `Welcome to the Portal! We're excited to have you join us. Please verify your email address to activate your account and start using the dashboard:`;
    let actionSection = '';

    if (origin) {
        const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
        actionSection = `
            <div style="text-align: center; margin: 32px 0;">
                <a href="${verifyUrl}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -2px rgba(59, 130, 246, 0.2);">Verify Email Address</a>
            </div>
            <p style="color: #64748b; font-size: 13px; word-break: break-all; text-align: center; margin: 0;">
                Or copy and paste this link into your browser:<br/>
                <a href="${verifyUrl}" style="color: #3b82f6; text-decoration: underline;">${verifyUrl}</a>
            </p>
        `;
    } else {
        actionSection = `
            <p style="color: #64748b; font-size: 14px; margin-bottom: 8px; font-weight: 500;">Use the following verification token in your request:</p>
            <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 16px; font-weight: bold; color: #0f172a; text-align: center; margin: 16px 0; border: 1px solid #e2e8f0; letter-spacing: 0.5px;">
                ${account.verificationToken}
            </div>
        `;
    }

    await sendEmail({
        to: account.email,
        subject: 'Portal Admin Service - Verify Email',
        html: getEmailHtmlTemplate(heading, bodyText, actionSection)
    });
}

async function sendAlreadyRegisteredEmail(email: any, origin: any) {
    let heading = 'Email Already Registered';
    let bodyText = `We received a request to register an account using the email address <strong>${email}</strong>, which is already registered in our system.`;
    let actionSection = '';

    if (origin) {
        actionSection = `
            <p style="color: #64748b; font-size: 14px; margin-bottom: 24px; text-align: center;">If you forgot your password or need to recover your account, you can reset it below:</p>
            <div style="text-align: center; margin: 24px 0;">
                <a href="${origin}/account/forgot-password" style="background-color: #ef4444; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);">Reset Password</a>
            </div>
        `;
    } else {
        actionSection = `
            <p style="color: #64748b; font-size: 14px; margin-top: 16px;">If you forgot your password, please use the <code>/accounts/forgot-password</code> API route.</p>
        `;
    }

    await sendEmail({
        to: email,
        subject: 'Portal Admin Service - Email Already Registered',
        html: getEmailHtmlTemplate(heading, bodyText, actionSection)
    });
}

async function sendPasswordResetEmail(account: any, origin: any) {
    let heading = 'Reset Your Password';
    let bodyText = `We received a request to reset the password for your portal account. This password reset token or link will remain valid for exactly 1 day.`;
    let actionSection = '';

    if (origin) {
        const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
        actionSection = `
            <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="background-color: #f59e0b; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.2);">Reset Password</a>
            </div>
            <p style="color: #64748b; font-size: 13px; word-break: break-all; text-align: center; margin: 0;">
                Or copy and paste this link into your browser:<br/>
                <a href="${resetUrl}" style="color: #f59e0b; text-decoration: underline;">${resetUrl}</a>
            </p>
        `;
    } else {
        actionSection = `
            <p style="color: #64748b; font-size: 14px; margin-bottom: 8px; font-weight: 500;">Use the following password reset token in your request:</p>
            <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 16px; font-weight: bold; color: #0f172a; text-align: center; margin: 16px 0; border: 1px solid #e2e8f0; letter-spacing: 0.5px;">
                ${account.resetToken}
            </div>
        `;
    }

    await sendEmail({
        to: account.email,
        subject: 'Portal Admin Service - Reset Password',
        html: getEmailHtmlTemplate(heading, bodyText, actionSection)
    });
}

function getEmailHtmlTemplate(heading: string, bodyText: string, actionSection: string) {
    return `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #0f172a; min-height: 100%;">
            <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.05); overflow: hidden;">
                <!-- Header -->
                <div style="background-color: #0f172a; padding: 32px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; font-family: sans-serif;">Portal Admin Service</h2>
                </div>
                
                <!-- Body -->
                <div style="padding: 40px 32px;">
                    <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 600; color: #0f172a;">${heading}</h3>
                    <p style="color: #64748b; font-size: 15px; line-height: 24px; margin-bottom: 24px; margin-top: 0;">${bodyText}</p>
                    
                    ${actionSection}
                    
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                    
                    <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0; text-align: center;">
                        This is an automated message from the Portal Admin System. Please do not reply to this email directly.
                    </p>
                </div>
            </div>
        </div>
    `;
}
