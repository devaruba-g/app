import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/db';
export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(auth.sessionCookieName) ?? null;
  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);}
  let session = null;
  let user = null;
  try {
    ({ session, user } = await auth.validateSession(sessionId));
  } catch (e) {
 
    const blank = auth.createBlankSessionCookie();
    event.cookies.set(blank.name, blank.value, { path: '.', ...blank.attributes });
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }
  if (session && session.fresh) {
    const sessionCookie = auth.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes});}
  if (!session) {
    const sessionCookie = auth.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });}
  event.locals.user = user;
  event.locals.session = session;
  return resolve(event);
};
