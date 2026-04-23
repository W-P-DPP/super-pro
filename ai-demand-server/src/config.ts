export type AiDemandDatabaseRuntimeConfig = {
  type: 'mysql';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  timezone: string;
  charset: string;
  synchronize: boolean;
};

export function getAiDemandDatabaseConfig(): AiDemandDatabaseRuntimeConfig {
  return {
    type: 'mysql',
    host: process.env.AI_DEMAND_DB_HOST || process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.AI_DEMAND_DB_PORT || process.env.DB_PORT || 3306),
    username: process.env.AI_DEMAND_DB_USER || process.env.DB_USER || 'root',
    password:
      process.env.AI_DEMAND_DB_PASSWORD || process.env.DB_PASSWORD || 'password',
    database:
      process.env.AI_DEMAND_DB_NAME || process.env.DB_NAME || 'ai_demand',
    timezone:
      process.env.AI_DEMAND_DB_TIMEZONE || process.env.DB_TIMEZONE || '+08:00',
    charset:
      process.env.AI_DEMAND_DB_CHARSET || process.env.DB_CHARSET || 'utf8mb4',
    synchronize: false,
  };
}
