// @ts-nocheck
import { db } from '$lib/db';
import { randomUUID } from 'crypto';
import { sendEmail } from '$lib/mailer';
import type { Actions } from '@sveltejs/kit';
import type { RowDataPacket } from 'mysql2';
import dayjs from 'dayjs';

export const actions = {
    default: async ({ request, url }: import('./$types').RequestEvent) => {
        try {
            const formData = await request.formData();
            const email = formData.get('email')?.toString();
            if (!email) {
                return { invalid: true, message: 'Email is required' };
            }
            const [userRows] = await db.query<RowDataPacket[]>(
                'SELECT * FROM auth_user WHERE email = ?',
                [email]
            );
            if (userRows.length === 0) {
                return { invalid: true, message: 'User not found' };
            }
            const user = userRows[0];
            const token = randomUUID();
            const expiresAt = dayjs().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');

            await db.query(
                'INSERT INTO password_resets (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
                [randomUUID(), user.id, token, expiresAt]
            );

            const resetLink = `${url.origin}/reset-password?token=${token}`;
            await sendEmail({
                to: email,
                subject: 'Reset Your Password',
                html: `<p>Click <a href="${resetLink}">here</a> to reset your password. Link expires in 1 hour.</p>`
            });

            return { success: true, message: 'Reset link sent to your email!' };
        } catch (err) {
            console.error(err);
            return { invalid: true, message: 'Server error. Please try again.' };
        }
    }
};
;null as any as Actions;