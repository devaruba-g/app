import type { Actions } from './$types';
import { db } from '$lib/db';
import bcrypt from 'bcrypt';
import type { RowDataPacket } from 'mysql2';

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
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT pr.id as reset_id, pr.expires_at, u.id as user_id
         FROM password_resets pr
         JOIN auth_user u ON u.id = pr.user_id
         WHERE pr.token = ?
         ORDER BY pr.expires_at DESC
         LIMIT 1`,
        [token]
      );
      if (rows.length === 0) {
        return { invalid: true, message: 'Invalid token' };
      }
      const reset = rows[0];
      const expiresAt = new Date(reset.expires_at);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
        return { invalid: true, message: 'Invalid token' };
      }
      const hashedPassword = await bcrypt.hash(password, 10);

      await db.query('UPDATE auth_user SET password = ? WHERE id = ?', [
        hashedPassword,
        reset.user_id
      ]);
      await db.query('DELETE FROM password_resets WHERE id = ?', [reset.reset_id]);
      return { success: true, message: 'Password reset successfully' };
    } catch (err) {
      console.error(err);
      return { invalid: true, message: 'Server error. Please try again.' };
    }
  }
};



