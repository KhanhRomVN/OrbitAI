// src/config/default-config.ts
import * as vscode from "vscode";

export class DefaultConfig {
  static getDefaultDatabaseConfig() {
    const config = vscode.workspace.getConfiguration("zenchat");

    return {
      postgres: {
        host: config.get<string>("postgres.host") || "",
        port: config.get<number>("postgres.port") || 5432,
        database: config.get<string>("postgres.database") || "",
        user: config.get<string>("postgres.user") || "",
        password: config.get<string>("postgres.password") || "",
        ssl: config.get<boolean>("postgres.ssl") || true,
      },
      vectorDb: {
        provider:
          config.get<"pinecone" | "qdrant">("vectorDb.provider") || "pinecone",
        apiKey: config.get<string>("vectorDb.apiKey") || "",
        environment: config.get<string>("vectorDb.environment") || "",
        indexName: config.get<string>("vectorDb.indexName") || "",
        url: config.get<string>("vectorDb.url") || "",
      },
      redis: {
        host: config.get<string>("redis.host") || "",
        port: config.get<number>("redis.port") || 6379,
        password: config.get<string>("redis.password") || "",
        db: config.get<number>("redis.db") || 0,
      },
    };
  }

  static async saveDatabaseConfig(config: any) {
    const vsConfig = vscode.workspace.getConfiguration("zenchat");

    if (config.postgres) {
      await vsConfig.update("postgres.host", config.postgres.host, true);
      await vsConfig.update("postgres.port", config.postgres.port, true);
      await vsConfig.update(
        "postgres.database",
        config.postgres.database,
        true
      );
      await vsConfig.update("postgres.user", config.postgres.user, true);
      await vsConfig.update(
        "postgres.password",
        config.postgres.password,
        true
      );
      await vsConfig.update("postgres.ssl", config.postgres.ssl, true);
    }

    if (config.vectorDb) {
      await vsConfig.update(
        "vectorDb.provider",
        config.vectorDb.provider,
        true
      );
      await vsConfig.update("vectorDb.apiKey", config.vectorDb.apiKey, true);
      await vsConfig.update(
        "vectorDb.environment",
        config.vectorDb.environment,
        true
      );
      await vsConfig.update(
        "vectorDb.indexName",
        config.vectorDb.indexName,
        true
      );
      await vsConfig.update("vectorDb.url", config.vectorDb.url, true);
    }

    if (config.redis) {
      await vsConfig.update("redis.host", config.redis.host, true);
      await vsConfig.update("redis.port", config.redis.port, true);
      await vsConfig.update("redis.password", config.redis.password, true);
      await vsConfig.update("redis.db", config.redis.db, true);
    }
  }
}
