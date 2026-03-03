import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      voterHash: string;
      constituency: string;
      voterName: string;
      isPWD: boolean;
      pwdCategory: string | null;
      agenticMode: boolean;
      hasVotedLocally: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    voterHash: string;
    constituency: string;
    voterName: string;
    isPWD: boolean;
    pwdCategory: string | null;
    agenticMode: boolean;
    hasVotedLocally: boolean;
  }
}
