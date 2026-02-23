import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// 간단한 사용자 저장소 (실제 프로덕션에서는 데이터베이스 사용)
const users = [
    {
        id: "1",
        username: "admin",
        password: "admin123", // 실제로는 해시된 비밀번호를 사용해야 함
        name: "관리자",
    }
];

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "아이디", type: "text" },
                password: { label: "비밀번호", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                const user = users.find(
                    u => u.username === credentials.username && u.password === credentials.password
                );

                if (user) {
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.username, // NextAuth requires email
                    };
                }

                return null;
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler };
