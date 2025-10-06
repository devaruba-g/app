import { Lucia } from "lucia";
import { Mysql2Adapter } from "@lucia-auth/adapter-mysql";
import { createPool } from "mysql2/promise";



export const db = createPool({
  host: "localhost",
  user: "root",
  password: "12345678",
  database: "message"
});
export const auth = new Lucia(
  new Mysql2Adapter(db, {
    user: "auth_user",
    session: "auth_session"
  }),{
    getUserAttributes: (attributes) => {
      return {
        email: attributes.email,
        name: attributes.name
      };
    }
  }
);
