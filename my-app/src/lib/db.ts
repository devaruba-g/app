import dotenv from 'dotenv';
dotenv.config();

import { Lucia } from "lucia";
import { Mysql2Adapter } from "@lucia-auth/adapter-mysql";
import { createPool } from "mysql2/promise";

const DATABASE_URL="mysql://root:emJvDumVmnUNebxHZaUyYFQeELnhpFCo@shuttle.proxy.rlwy.net:48612/railway"
export const db = createPool({
  uri: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const auth = new Lucia(
  new Mysql2Adapter(db, {
    user: "auth_user",
    session: "auth_session"
  }),
  {
    getUserAttributes: (attributes) => ({
      email: attributes.email,
      name: attributes.name
    })
  }
);
