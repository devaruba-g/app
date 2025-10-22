import { randomUUID } from 'crypto';
import { sendEmail } from '$lib/mailer';
import type { Actions } from '@sveltejs/kit';
import dayjs from 'dayjs';
import { getUserByEmail, createPasswordReset } from '$lib/db/queries';

// Handle forgot password requests

export const actions: Actions = {
    default: async ({ request, url }) => {
        try {
            const formData = await request.formData();
            const email = formData.get('email')?.toString();
            if (!email) {
                return { invalid: true, message: 'Email is required' };
            }
            
            const user = await getUserByEmail(email);
            if (!user) {
                return { invalid: true, message: 'User not found' };
            }
            
            const token = randomUUID();
            const expiresAt = dayjs().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');

            await createPasswordReset(randomUUID(), user.id, token, expiresAt);

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
