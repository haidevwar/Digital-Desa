-- Insert demo users dengan password hash yang sudah benar
INSERT INTO users (email, password_hash, nama_lengkap, role, nik, created_at) VALUES
('admin@desa.com', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Admin Desa', 'admin', NULL, NOW()),
('petugas@desa.com', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Petugas Desa', 'petugas', NULL, NOW()),
('warga@desa.com', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Warga Desa', 'warga', '1234567890123456', NOW());

-- Insert sample keluarga data
INSERT INTO keluarga (nomor_kk, alamat, data_hash, sync_flag, is_synced, created_at) VALUES
('1234567890123456', 'Jl. Merdeka No. 1, Desa Maju', 'hash123', 'SYNCED', 1, NOW()),
('1234567890123457', 'Jl. Diponegoro No. 2, Desa Maju', 'hash124', 'SYNCED', 1, NOW());

-- Insert sample penduduk data
INSERT INTO penduduk (nik, nama, keluarga_id, tanggal_lahir, tempat_lahir, jenis_kelamin, agama, data_hash, sync_flag, is_synced, created_at) VALUES
('1234567890123456', 'Budi Santoso', 1, '1985-05-15', 'Jakarta', 'Laki-laki', 'Islam', 'hash_budi', 'SYNCED', 1, NOW()),
('1234567890123457', 'Siti Nurhaliza', 1, '1990-03-20', 'Bandung', 'Perempuan', 'Islam', 'hash_siti', 'SYNCED', 1, NOW()),
('1234567890123458', 'Ahmad Wijaya', 2, '1988-07-10', 'Surabaya', 'Laki-laki', 'Islam', 'hash_ahmad', 'SYNCED', 1, NOW());
