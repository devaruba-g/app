// @ts-nocheck
import type { Actions, PageServerLoad } from './$types';
import { db, auth } from '$lib/db';
import { fail, redirect } from '@sveltejs/kit';
import { generateId } from 'lucia';
import bcrypt from 'bcryptjs';
import type { RowDataPacket } from 'mysql2/promise';
interface users extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  password: string;
}
export let load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
  return {
    user: locals.user
  };
};
export let actions = {
  signup: async ({ request }: import('./$types').RequestEvent) => {
    let form = await request.formData();
    let name = form.get('name') as string;
    let email = form.get('email') as string;
    let password = form.get('password') as string;
    if (password.length < 8)
      return fail(400, { type: 'error', message: 'password must be greater than 7 characters' });
    try {
      let [alr] = await db.execute<users[]>(
        'SELECT id FROM auth_user WHERE email = ?',
        [email]
      );
      if (alr.length > 0)
        return fail(400, { type: 'error', message: 'email already exists' });
      let pass = await bcrypt.hash(password, 10);
      let id = generateId(15);
      await db.execute(
        'INSERT INTO auth_user (id, name, email, password) VALUES (?, ?, ?, ?)',
        [id, name, email, pass]
      );
      return { type: 'signup-success', message: 'Signup successful' };
    } catch (error) {
      return fail(500, { type: 'error', message: 'error occurred' });
    }
  },
  signin: async ({ request, cookies }: import('./$types').RequestEvent) => {
    let form = await request.formData();
    let email = form.get('email') as string;
    let password = form.get('password') as string;
    try {
      let [rows] = await db.execute<users[]>(
        'SELECT * FROM auth_user WHERE email = ?',
        [email]
      );
      let user = rows[0];
      if (!user) {
        return fail(400, { type: 'error', message: 'invalid email or password!' });
      }

      let val = await bcrypt.compare(password, user.password);
      if (!val) {
        return fail(400, { type: 'error', message: 'invalid email or password!' });
      }

      let ses = await auth.createSession(user.id, {});
      let sesco = auth.createSessionCookie(ses.id);
      cookies.set(sesco.name, sesco.value, {
        path: '.',
        ...sesco.attributes
      });

      return { type: 'signin-success', message: 'Sign in successful', redirect: 'signin' };
    } catch (error) {
      console.error('Signin error:', error);
      return fail(500, { type: 'error', message: 'error occurred' });
    }
  }
  ,
  logout: async ({ cookies, locals }: import('./$types').RequestEvent) => {
    if (!locals.session) {
      return fail(401, { type: 'error', message: 'Not authenticated' });
    }
    await auth.invalidateSession(locals.session.id);
    let sessionCookie = auth.createBlankSessionCookie();
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });
    return redirect(302, '/');
  }
};
;null as any as Actions;