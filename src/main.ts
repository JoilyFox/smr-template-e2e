import './generated.instrumentation'; // MUST be first: pre-bootstrap hooks (e.g. OpenTelemetry).
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import { applyBootstrap } from './generated.bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(LoggerService));

  // Security headers (CSP, HSTS, no-sniff, etc.). Keep early, before routes.
  app.use(helmet());

  const config = app.get(ConfigService);

  // Global validation: strip unknown props and transform payloads to DTO types.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS. Defaults to http://localhost:3000 for safe local dev. In production set
  // CORS_ORIGIN to your real origin(s); use a comma-separated list for several.
  const corsOrigin =
    config.get<string>('corsOrigin') ?? 'http://localhost:3000';
  app.enableCors({
    origin: corsOrigin.includes(',')
      ? corsOrigin.split(',').map((o) => o.trim())
      : corsOrigin,
  });

  // Swagger. Auth blocks add a bearer/oauth security scheme to this builder.
  const swaggerBuilder = new DocumentBuilder()
    .setTitle(config.get<string>('appName') ?? 'app')
    .setDescription('API documentation')
    .setVersion('1.0');

  if (config.get<string>('JWT_SECRET')) {
    swaggerBuilder.addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'bearer', // This matches the security name in guards/decorators
    );
  }

  if (config.get<string>('GOOGLE_CLIENT_ID')) {
    swaggerBuilder.addOAuth2({
      type: 'oauth2',
      flows: {
        implicit: {
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          scopes: {
            email: 'Access email',
            profile: 'Access profile',
          },
        },
      },
    });
  }

  // Expose the docs everywhere except production, where they are usually not meant to be public.
  // Set SWAGGER_ENABLED=true to force them on (e.g. a protected staging deploy).
  const swaggerEnabled =
    config.get<string>('nodeEnv') !== 'production' ||
    config.get<string>('SWAGGER_ENABLED') === 'true';
  if (swaggerEnabled) {
    const swaggerConfig = swaggerBuilder.build();
    SwaggerModule.setup(
      'docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
      {
        // Keep the entered bearer token across page reloads in the Swagger UI.
        swaggerOptions: { persistAuthorization: true },
      },
    );
  }

  // Bootstrap-time hooks from selected blocks (e.g. connecting a microservice transport).
  // Runs after the app is configured and before it starts listening.
  await applyBootstrap(app);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
}

void bootstrap();
