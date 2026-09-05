import { pgTable, integer, text } from 'drizzle-orm/pg-core';
export const shelterState = pgTable('shelter_state', {
  id: integer('id').primaryKey(),
  data: text('data').notNull(),
  revision: integer('revision').notNull().default(1),
});
