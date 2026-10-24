import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

// Neon (et tout PgBouncer) : l'URL « -pooler » exige pgbouncer=true avec Prisma,
// sinon des requêtes échouent au hasard. On ajoute aussi un délai de connexion
// plus long pour le réveil de la base gratuite après une période d'inactivité.
function databaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (u.hostname.includes("-pooler") && !u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "20");
    return u.toString();
  } catch {
    return raw;
  }
}

export const prisma = globalForPrisma.prisma || new PrismaClient({ datasourceUrl: databaseUrl() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
