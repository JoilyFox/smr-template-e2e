/** Typed application config derived from environment variables. */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  appName: string;
  logLevel: string;
  corsOrigin: string;
}

export const appConfig = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  appName: process.env.APP_NAME ?? 'app',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
});
