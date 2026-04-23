import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AiDemandSignalImport202604220002
  implements MigrationInterface
{
  name = 'AiDemandSignalImport202604220002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(
      queryRunner,
      'collection_batch',
      'metadata',
      `ALTER TABLE collection_batch ADD COLUMN metadata JSON NULL AFTER error_summary;`,
    );

    await this.addColumnIfMissing(
      queryRunner,
      'raw_signal',
      'content_hash',
      `ALTER TABLE raw_signal ADD COLUMN content_hash VARCHAR(64) NULL AFTER content_raw;`,
    );
    await this.addColumnIfMissing(
      queryRunner,
      'raw_signal',
      'dedupe_key',
      `ALTER TABLE raw_signal ADD COLUMN dedupe_key VARCHAR(255) NULL AFTER content_hash;`,
    );
    await this.addColumnIfMissing(
      queryRunner,
      'raw_signal',
      'is_duplicate',
      `ALTER TABLE raw_signal ADD COLUMN is_duplicate TINYINT(1) NOT NULL DEFAULT 0 AFTER dedupe_key;`,
    );
    await this.addColumnIfMissing(
      queryRunner,
      'raw_signal',
      'duplicate_of',
      `ALTER TABLE raw_signal ADD COLUMN duplicate_of VARCHAR(64) NULL AFTER is_duplicate;`,
    );
    await this.addColumnIfMissing(
      queryRunner,
      'raw_signal',
      'metadata',
      `ALTER TABLE raw_signal ADD COLUMN metadata JSON NULL AFTER snapshot_ref;`,
    );

    await this.addIndexIfMissing(
      queryRunner,
      'raw_signal',
      'idx_raw_signal_content_hash',
      `ALTER TABLE raw_signal ADD KEY idx_raw_signal_content_hash (content_hash);`,
    );
    await this.addIndexIfMissing(
      queryRunner,
      'raw_signal',
      'idx_raw_signal_dedupe_key',
      `ALTER TABLE raw_signal ADD KEY idx_raw_signal_dedupe_key (dedupe_key);`,
    );
    await this.addIndexIfMissing(
      queryRunner,
      'raw_signal',
      'idx_raw_signal_duplicate_of',
      `ALTER TABLE raw_signal ADD KEY idx_raw_signal_duplicate_of (duplicate_of);`,
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      'raw_signal',
      'fk_raw_signal_duplicate_of',
      `ALTER TABLE raw_signal
        ADD CONSTRAINT fk_raw_signal_duplicate_of
        FOREIGN KEY (duplicate_of) REFERENCES raw_signal (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropForeignKeyIfExists(
      queryRunner,
      'raw_signal',
      'fk_raw_signal_duplicate_of',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'raw_signal',
      'idx_raw_signal_duplicate_of',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'raw_signal',
      'idx_raw_signal_dedupe_key',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'raw_signal',
      'idx_raw_signal_content_hash',
    );

    await this.dropColumnIfExists(queryRunner, 'raw_signal', 'metadata');
    await this.dropColumnIfExists(queryRunner, 'raw_signal', 'duplicate_of');
    await this.dropColumnIfExists(queryRunner, 'raw_signal', 'is_duplicate');
    await this.dropColumnIfExists(queryRunner, 'raw_signal', 'dedupe_key');
    await this.dropColumnIfExists(queryRunner, 'raw_signal', 'content_hash');
    await this.dropColumnIfExists(queryRunner, 'collection_batch', 'metadata');
  }

  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    sql: string,
  ): Promise<void> {
    if (!(await queryRunner.hasColumn(tableName, columnName))) {
      await queryRunner.query(sql);
    }
  }

  private async dropColumnIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<void> {
    if (await queryRunner.hasColumn(tableName, columnName)) {
      await queryRunner.query(
        `ALTER TABLE ${tableName} DROP COLUMN ${columnName};`,
      );
    }
  }

  private async addIndexIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
    sql: string,
  ): Promise<void> {
    const rows = await queryRunner.query(
      `SHOW INDEX FROM ${tableName} WHERE Key_name = '${indexName}';`,
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      await queryRunner.query(sql);
    }
  }

  private async dropIndexIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<void> {
    const rows = await queryRunner.query(
      `SHOW INDEX FROM ${tableName} WHERE Key_name = '${indexName}';`,
    );
    if (Array.isArray(rows) && rows.length > 0) {
      await queryRunner.query(`ALTER TABLE ${tableName} DROP INDEX ${indexName};`);
    }
  }

  private async addForeignKeyIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
    sql: string,
  ): Promise<void> {
    const rows = await queryRunner.query(
      `SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND CONSTRAINT_NAME = '${constraintName}'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY';`,
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      await queryRunner.query(sql);
    }
  }

  private async dropForeignKeyIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
  ): Promise<void> {
    const rows = await queryRunner.query(
      `SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND CONSTRAINT_NAME = '${constraintName}'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY';`,
    );
    if (Array.isArray(rows) && rows.length > 0) {
      await queryRunner.query(
        `ALTER TABLE ${tableName} DROP FOREIGN KEY ${constraintName};`,
      );
    }
  }
}
