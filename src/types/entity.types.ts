/**
 * Helper type for creating entities without requiring an ID
 * Assumes entities have an 'id' field that will be auto-generated
 */
export type CreateEntity<T> = Omit<T, 'id'> & { id?: number };

/**
 * Helper type for updating entities (all fields optional except ID)
 */
export type UpdateEntity<T> = Partial<T> & { id: number };

/**
 * Base interface for entities with auto-generated IDs
 */
export interface BaseEntity {
  id: number;
}

/**
 * Helper to extract the primary key type from an entity
 */
export type PrimaryKey<T> = T extends { id: infer K } ? K : never;