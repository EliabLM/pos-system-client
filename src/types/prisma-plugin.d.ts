declare module '@prisma/nextjs-monorepo-workaround-plugin' {
  import type { Compiler } from 'webpack';

  export class PrismaPlugin {
    constructor();
    apply(compiler: Compiler): void;
  }
}

