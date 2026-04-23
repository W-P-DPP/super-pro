import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AiDemandPhase1Schema202604220001
  implements MigrationInterface
{
  name = 'AiDemandPhase1Schema202604220001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS source_config (
        id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        source_type VARCHAR(32) NOT NULL,
        access_mode VARCHAR(32) NOT NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        schedule_expr VARCHAR(255) NULL,
        metadata JSON NULL,
        PRIMARY KEY (id),
        KEY idx_source_config_source_type (source_type),
        KEY idx_source_config_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_run (
        id VARCHAR(64) NOT NULL,
        workflow_type VARCHAR(64) NOT NULL,
        target_type VARCHAR(64) NOT NULL,
        target_id VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        attempt INT UNSIGNED NOT NULL DEFAULT 1,
        started_at DATETIME(3) NULL,
        finished_at DATETIME(3) NULL,
        error_detail TEXT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_workflow_run_target_attempt (workflow_type, target_type, target_id, attempt),
        KEY idx_workflow_run_target (target_type, target_id),
        KEY idx_workflow_run_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS collection_batch (
        id VARCHAR(64) NOT NULL,
        source_config_id VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        started_at DATETIME(3) NULL,
        finished_at DATETIME(3) NULL,
        raw_count INT UNSIGNED NOT NULL DEFAULT 0,
        accepted_count INT UNSIGNED NOT NULL DEFAULT 0,
        error_summary TEXT NULL,
        PRIMARY KEY (id),
        KEY idx_collection_batch_source_config_id (source_config_id),
        KEY idx_collection_batch_status (status),
        CONSTRAINT fk_collection_batch_source_config
          FOREIGN KEY (source_config_id) REFERENCES source_config (id)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS raw_signal (
        id VARCHAR(64) NOT NULL,
        collection_batch_id VARCHAR(64) NOT NULL,
        external_id VARCHAR(255) NULL,
        source_url VARCHAR(1024) NULL,
        author_name VARCHAR(255) NULL,
        published_at DATETIME(3) NULL,
        language VARCHAR(32) NULL,
        title VARCHAR(512) NULL,
        content_raw LONGTEXT NOT NULL,
        snapshot_ref VARCHAR(1024) NULL,
        ingested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY idx_raw_signal_collection_batch_id (collection_batch_id),
        KEY idx_raw_signal_external_id (external_id),
        KEY idx_raw_signal_published_at (published_at),
        CONSTRAINT fk_raw_signal_collection_batch
          FOREIGN KEY (collection_batch_id) REFERENCES collection_batch (id)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cleaned_signal (
        id VARCHAR(64) NOT NULL,
        raw_signal_id VARCHAR(64) NOT NULL,
        content_clean LONGTEXT NOT NULL,
        normalized_problem TEXT NULL,
        keywords JSON NOT NULL,
        sentiment VARCHAR(32) NULL,
        pain_level INT NULL,
        is_duplicate TINYINT(1) NOT NULL DEFAULT 0,
        duplicate_of VARCHAR(64) NULL,
        is_noise TINYINT(1) NOT NULL DEFAULT 0,
        pii_masked TINYINT(1) NOT NULL DEFAULT 0,
        quality_score DECIMAL(5,2) NULL,
        processor_version VARCHAR(64) NOT NULL,
        PRIMARY KEY (id),
        KEY idx_cleaned_signal_raw_signal_id (raw_signal_id),
        KEY idx_cleaned_signal_duplicate_of (duplicate_of),
        KEY idx_cleaned_signal_is_noise (is_noise),
        CONSTRAINT fk_cleaned_signal_raw_signal
          FOREIGN KEY (raw_signal_id) REFERENCES raw_signal (id)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS problem_cluster (
        id VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        summary TEXT NOT NULL,
        cluster_key VARCHAR(191) NOT NULL,
        size INT UNSIGNED NOT NULL DEFAULT 0,
        confidence_score DECIMAL(5,4) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        representative_signal_ids JSON NOT NULL,
        generated_by_run_id VARCHAR(64) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_problem_cluster_cluster_key (cluster_key),
        KEY idx_problem_cluster_status (status),
        KEY idx_problem_cluster_generated_by_run_id (generated_by_run_id),
        CONSTRAINT fk_problem_cluster_workflow_run
          FOREIGN KEY (generated_by_run_id) REFERENCES workflow_run (id)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS opportunity_brief (
        id VARCHAR(64) NOT NULL,
        problem_cluster_id VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        brief_statement TEXT NOT NULL,
        target_user VARCHAR(255) NOT NULL,
        evidence_signal_ids JSON NOT NULL,
        evidence_summary TEXT NOT NULL,
        boundary_note TEXT NULL,
        distribution_hypothesis TEXT NULL,
        visibility_hypothesis TEXT NULL,
        gap_notes TEXT NULL,
        status VARCHAR(48) NOT NULL DEFAULT 'draft',
        generated_by_run_id VARCHAR(64) NULL,
        PRIMARY KEY (id),
        KEY idx_opportunity_brief_problem_cluster_id (problem_cluster_id),
        KEY idx_opportunity_brief_status (status),
        KEY idx_opportunity_brief_generated_by_run_id (generated_by_run_id),
        CONSTRAINT fk_opportunity_brief_problem_cluster
          FOREIGN KEY (problem_cluster_id) REFERENCES problem_cluster (id)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT fk_opportunity_brief_workflow_run
          FOREIGN KEY (generated_by_run_id) REFERENCES workflow_run (id)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS scoring_profile (
        id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        strategy_key VARCHAR(128) NOT NULL,
        version VARCHAR(64) NOT NULL,
        dimensions JSON NOT NULL,
        weights JSON NOT NULL,
        scale JSON NULL,
        normalization JSON NULL,
        gate_rules JSON NOT NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        metadata JSON NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_scoring_profile_strategy_version (strategy_key, version),
        KEY idx_scoring_profile_strategy_key (strategy_key),
        KEY idx_scoring_profile_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS opportunity (
        id VARCHAR(64) NOT NULL,
        opportunity_brief_id VARCHAR(64) NOT NULL,
        scoring_profile_id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        opportunity_statement TEXT NOT NULL,
        score_total DECIMAL(8,2) NOT NULL DEFAULT 0,
        score_breakdown JSON NOT NULL,
        score_confidence DECIMAL(5,4) NULL,
        score_rationale TEXT NOT NULL,
        risk_notes JSON NOT NULL,
        status VARCHAR(48) NOT NULL DEFAULT 'draft',
        PRIMARY KEY (id),
        KEY idx_opportunity_opportunity_brief_id (opportunity_brief_id),
        KEY idx_opportunity_scoring_profile_id (scoring_profile_id),
        KEY idx_opportunity_status (status),
        CONSTRAINT fk_opportunity_opportunity_brief
          FOREIGN KEY (opportunity_brief_id) REFERENCES opportunity_brief (id)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT fk_opportunity_scoring_profile
          FOREIGN KEY (scoring_profile_id) REFERENCES scoring_profile (id)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prd_draft (
        id VARCHAR(64) NOT NULL,
        opportunity_id VARCHAR(64) NOT NULL,
        version INT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        background TEXT NOT NULL,
        target_user VARCHAR(255) NOT NULL,
        problem_statement TEXT NOT NULL,
        solution_hypothesis TEXT NOT NULL,
        scope_in JSON NOT NULL,
        scope_out JSON NOT NULL,
        risks JSON NOT NULL,
        open_questions JSON NOT NULL,
        citations JSON NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'generated',
        PRIMARY KEY (id),
        UNIQUE KEY uq_prd_draft_opportunity_version (opportunity_id, version),
        KEY idx_prd_draft_opportunity_id (opportunity_id),
        KEY idx_prd_draft_status (status),
        CONSTRAINT fk_prd_draft_opportunity
          FOREIGN KEY (opportunity_id) REFERENCES opportunity (id)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS review_task (
        id VARCHAR(64) NOT NULL,
        object_type VARCHAR(32) NOT NULL,
        object_id VARCHAR(64) NOT NULL,
        review_stage VARCHAR(32) NOT NULL,
        assignee VARCHAR(128) NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        decision VARCHAR(64) NULL,
        comment TEXT NULL,
        decided_at DATETIME(3) NULL,
        PRIMARY KEY (id),
        KEY idx_review_task_object_stage (object_type, object_id, review_stage),
        KEY idx_review_task_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prompt_execution (
        id VARCHAR(64) NOT NULL,
        workflow_run_id VARCHAR(64) NOT NULL,
        target_type VARCHAR(64) NOT NULL,
        target_id VARCHAR(64) NOT NULL,
        prompt_stage VARCHAR(64) NOT NULL,
        prompt_name VARCHAR(128) NOT NULL,
        prompt_version VARCHAR(64) NOT NULL,
        model_name VARCHAR(128) NOT NULL,
        input_ref VARCHAR(1024) NOT NULL,
        output_ref VARCHAR(1024) NULL,
        token_usage JSON NULL,
        latency_ms INT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        PRIMARY KEY (id),
        KEY idx_prompt_execution_workflow_run_id (workflow_run_id),
        KEY idx_prompt_execution_target (target_type, target_id),
        KEY idx_prompt_execution_status (status),
        CONSTRAINT fk_prompt_execution_workflow_run
          FOREIGN KEY (workflow_run_id) REFERENCES workflow_run (id)
          ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS state_transition (
        id VARCHAR(64) NOT NULL,
        object_type VARCHAR(64) NOT NULL,
        object_id VARCHAR(64) NOT NULL,
        from_state VARCHAR(64) NULL,
        to_state VARCHAR(64) NOT NULL,
        trigger_type VARCHAR(16) NOT NULL,
        trigger_by VARCHAR(128) NULL,
        reason TEXT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY idx_state_transition_object (object_type, object_id),
        KEY idx_state_transition_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_event (
        id VARCHAR(64) NOT NULL,
        object_type VARCHAR(64) NOT NULL,
        object_id VARCHAR(64) NOT NULL,
        event_type VARCHAR(128) NOT NULL,
        event_payload JSON NOT NULL,
        actor_type VARCHAR(16) NOT NULL,
        actor_id VARCHAR(128) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY idx_audit_event_object (object_type, object_id),
        KEY idx_audit_event_type (event_type),
        KEY idx_audit_event_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_event;`);
    await queryRunner.query(`DROP TABLE IF EXISTS state_transition;`);
    await queryRunner.query(`DROP TABLE IF EXISTS prompt_execution;`);
    await queryRunner.query(`DROP TABLE IF EXISTS review_task;`);
    await queryRunner.query(`DROP TABLE IF EXISTS prd_draft;`);
    await queryRunner.query(`DROP TABLE IF EXISTS opportunity;`);
    await queryRunner.query(`DROP TABLE IF EXISTS scoring_profile;`);
    await queryRunner.query(`DROP TABLE IF EXISTS opportunity_brief;`);
    await queryRunner.query(`DROP TABLE IF EXISTS problem_cluster;`);
    await queryRunner.query(`DROP TABLE IF EXISTS cleaned_signal;`);
    await queryRunner.query(`DROP TABLE IF EXISTS raw_signal;`);
    await queryRunner.query(`DROP TABLE IF EXISTS collection_batch;`);
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_run;`);
    await queryRunner.query(`DROP TABLE IF EXISTS source_config;`);
  }
}
