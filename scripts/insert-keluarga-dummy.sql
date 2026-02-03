-- Insert dummy keluarga data for testing if not exists
INSERT IGNORE INTO keluarga (id, nomor_kk, alamat, created_at, updated_at)
VALUES 
  (1, '1234567890123456', 'Jl. Merdeka No. 1, Desa Maju', NOW(), NOW()),
  (2, '1234567890123457', 'Jl. Sudirman No. 2, Desa Maju', NOW(), NOW()),
  (3, '1234567890123458', 'Jl. Gatot Subroto No. 3, Desa Maju', NOW(), NOW());
