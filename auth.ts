import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const employeeSchema = z.object({
  legajo: z.coerce.number().int().positive(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      id: "employee",
      name: "Empleado",
      credentials: {
        legajo: { label: "Legajo", type: "number" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = employeeSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { legajo, password } = parsed.data;

        const employee = await db.employee.findUnique({
          where: { legajo, isActive: true },
        });

        if (!employee) return null;

        const valid = await bcrypt.compare(password, employee.passwordHash);
        if (!valid) return null;

        return {
          id: employee.id,
          name: employee.name,
          email: `legajo-${employee.legajo}@supermarket.internal`,
          role: employee.role,
          legajo: employee.legajo,
          isEmployee: true,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        // Employee login
        if ((user as any).isEmployee) {
          token.role = (user as any).role;
          token.legajo = (user as any).legajo;
          token.isEmployee = true;
        }
      }
      // Google login: assign "cliente" role
      if (account?.provider === "google") {
        token.role = "cliente";
        token.isEmployee = false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.legajo = token.legajo as number | undefined;
        session.user.isEmployee = token.isEmployee as boolean;
      }
      return session;
    },
  },
});

// Extend session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      legajo?: number;
      isEmployee: boolean;
    };
  }
}
