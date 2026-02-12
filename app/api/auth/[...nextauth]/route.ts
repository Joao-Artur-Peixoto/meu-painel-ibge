import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // SUBSTITUA pelo seu e-mail que você usa no Google
      const aprovados = ["joao.peixoto.artur@gmail.com","julianacpereira@gmail.com"]; 
      return aprovados.includes(user.email || "");
    },
  },
  // Isso ajuda a manter a sessão segura
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };