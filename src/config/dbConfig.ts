export interface DbConfig {
  connectionString?: string;
  dbName: string;
  preload: string[],
  entities: {
    [key: string]: {
      type: new () => any;
      tableName?: string;
    };
  };
}