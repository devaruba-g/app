import "lucia";
declare module "lucia" {
  interface Register {
    Lucia: import("./lib/db").auth; 
    DatabaseUserAttributes: {
      email: string;
      name: string;
    };
  }
}
