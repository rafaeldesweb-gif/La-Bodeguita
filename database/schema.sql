-- Este proyecto utiliza Supabase (PostgreSQL), no MySQL.
-- Ejecuta el archivo `database/supabase-schema.sql` completo en
-- Supabase Dashboard > SQL Editor.
--
-- El antiguo esquema MySQL se ha retirado porque las sentencias CREATE DATABASE,
-- USE, AUTO_INCREMENT y ENGINE=InnoDB no son compatibles con Supabase.
CREATE DATABASE IF NOT EXISTS bodeguita CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bodeguita;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id INT NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NULL,
  session_started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  session_ended_at TIMESTAMP NULL,
  active_order_count INT NOT NULL DEFAULT 0,
  order_snapshot JSON NULL,
  PRIMARY KEY (id),
  KEY idx_user_id (user_id),
  KEY idx_session_started_at (session_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_session_events (
  id INT NOT NULL AUTO_INCREMENT,
  session_id INT NULL,
  event_type ENUM('logout', 'session_start', 'status_change') NOT NULL,
  event_payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_session_id (session_id),
  KEY idx_event_type (event_type),
  CONSTRAINT fk_admin_session_events_session FOREIGN KEY (session_id) REFERENCES admin_sessions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
