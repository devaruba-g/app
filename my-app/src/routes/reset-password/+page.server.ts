import type { Actions } from './$types';
import bcrypt from 'bcrypt';
import { getPasswordResetByToken, updateUserPassword, deletePasswordReset } from '$lib/db/queries';


// Handle password reset requests

export const actions: Actions = {
  default: async ({ request }) => {
    try {
      const form = await request.formData();
      const password = form.get('password')?.toString() ?? '';
      const confirmPassword = form.get('confirmPassword')?.toString() ?? '';
      const token = form.get('token')?.toString() ?? '';

      if (password.length < 8) {
        return { invalid: true, message: 'Password must be greater than 7 characters' };
      }

      if (password !== confirmPassword) {
        return { invalid: true, message: 'Passwords do not match' };
      }

      const reset = await getPasswordResetByToken(token);

      if (!reset) {
        return { invalid: true, message: 'Invalid token' };
      }
      const expiresAt = new Date(reset.expires_at);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
        return { invalid: true, message: 'Invalid token' };
      }
      const hashedPassword = await bcrypt.hash(password, 10);

      await updateUserPassword(reset.user_id, hashedPassword);
      await deletePasswordReset(reset.reset_id);
      return { success: true, message: 'Password reset successfully' };
    }
    catch (err) {
      console.error(err);
      return { invalid: true, message: 'Server error. Please try again.' };
    }
  }
};



