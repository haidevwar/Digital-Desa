-- Digital Desa Database Schema dengan Flag-Based Sync Mechanism

-- Table: users (Admin, Petugas Desa, Warga)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'petugas', 'warga') NOT NULL DEFAULT 'warga',
  nama_lengkap VARCHAR(200),
  nik VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- Table: keluarga (Data Keluarga di Desa)
CREATE TABLE IF NOT EXISTS keluarga (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nomor_kk VARCHAR(50) UNIQUE NOT NULL,
  alamat TEXT NOT NULL,
  rt_rw VARCHAR(10),
  user_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Flag-based sync fields
  sync_flag VARCHAR(50) DEFAULT 'NONE',
  data_hash VARCHAR(64),
  is_synced BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_nomor_kk (nomor_kk),
  INDEX idx_sync_flag (sync_flag),
  INDEX idx_is_synced (is_synced),
  INDEX idx_is_deleted (is_deleted)
);

-- Table: penduduk (Data Penduduk)
CREATE TABLE IF NOT EXISTS penduduk (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nik VARCHAR(20) UNIQUE NOT NULL,
  nama VARCHAR(200) NOT NULL,
  keluarga_id INT NOT NULL,
  jenis_kelamin ENUM('L', 'P') NOT NULL,
  tanggal_lahir DATE NOT NULL,
  agama VARCHAR(50),
  status_kawin ENUM('Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati') DEFAULT 'Belum Kawin',
  pekerjaan VARCHAR(100),
  pendidikan VARCHAR(50),
  alamat TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Flag-based sync fields untuk deteksi perubahan data
  sync_flag VARCHAR(50) DEFAULT 'NONE',
  data_hash VARCHAR(64),
  is_synced BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMP NULL,
  FOREIGN KEY (keluarga_id) REFERENCES keluarga(id) ON DELETE CASCADE,
  INDEX idx_nik (nik),
  INDEX idx_keluarga_id (keluarga_id),
  INDEX idx_sync_flag (sync_flag),
  INDEX idx_is_synced (is_synced),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_updated_at (updated_at)
);

-- Table: sync_log (Track semua aktivitas sinkronisasi)
CREATE TABLE IF NOT EXISTS sync_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  tables_synced VARCHAR(255),
  record_count INT DEFAULT 0,
  is_successful BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  device_id VARCHAR(100),
  synced_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_is_successful (is_successful),
  INDEX idx_created_at (created_at)
);

-- Table: sync_queue (Data yang menunggu untuk disinkronisasi)
CREATE TABLE IF NOT EXISTS sync_queue (
  id INT PRIMARY KEY AUTO_INCREMENT,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id INT NOT NULL,
  user_id INT,
  is_processed BOOLEAN DEFAULT FALSE,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_is_processed (is_processed),
  INDEX idx_user_id (user_id),
  INDEX idx_table_name (table_name)
);

-- Table: data_integrity_log (Log untuk audit trail integritas data)
CREATE TABLE IF NOT EXISTS data_integrity_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  table_name VARCHAR(50) NOT NULL,
  record_id INT NOT NULL,
  detected_hash VARCHAR(64),
  expected_hash VARCHAR(64),
  hash_match BOOLEAN DEFAULT TRUE,
  duplicate_detected BOOLEAN DEFAULT FALSE,
  conflict_type VARCHAR(50),
  resolution_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_table_name (table_name),
  INDEX idx_record_id (record_id),
  INDEX idx_hash_match (hash_match),
  INDEX idx_duplicate_detected (duplicate_detected)
);

-- Insert sample users untuk testing
INSERT INTO users (email, password_hash, role, nama_lengkap) VALUES
('admin@desa.id', '240be518fabd2724ddb6f04eeb1da5967448d7e1c33c945b97d1e1f97bef5c67', 'admin', 'Administrator Desa'),
('petugas@desa.id', '240be518fabd2724ddb6f04eeb1da5967448d7e1c33c945b97d1e1f97bef5c67', 'petugas', 'Petugas Desa'),
('warga@desa.id', '240be518fabd2724ddb6f04eeb1da5967448d7e1c33c945b97d1e1f97bef5c67', 'warga', 'Penduduk Desa');

-- Insert sample keluarga
INSERT INTO keluarga (nomor_kk, alamat, rt_rw, user_id) VALUES
('1234567890123456', 'Jl. Raya Desa No. 1', '01/01', 3);

-- Insert sample penduduk
INSERT INTO penduduk (nik, nama, keluarga_id, jenis_kelamin, tanggal_lahir, agama, pekerjaan, pendidikan) VALUES
('1234567890123456', 'Budi Santoso', 1, 'L', '1990-01-15', 'Islam', 'Petani', 'SMA');
