import path from 'path'
import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
})