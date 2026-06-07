import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const usuarios = await prisma.usuario.findMany()
  console.log(usuarios)
}

main()
