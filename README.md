# Digital Desa - Aplikasi Manajemen Data Desa dengan Sinkronisasi Offline-Online

## Deskripsi Proyek

Aplikasi Digital Desa adalah solusi terintegrasi untuk manajemen data penduduk dengan mekanisme sinkronisasi data offline-online yang canggih. Proyek ini dirancang sebagai penelitian tentang implementasi flag-based sync dan SHA-256 hashing untuk mengurangi risiko konflik dan duplikasi data.

### Fitur Utama

- **Authentication & Authorization**: Login dengan role-based access control (Admin, Petugas, Warga)
- **Data Penduduk Management**: CRUD operations untuk data penduduk dan keluarga
- **Flag-Based Sync**: Mekanisme sinkronisasi berbasis flag (CREATE, UPDATE, DELETE)
- **SHA-256 Hashing**: Deteksi perubahan data dan duplikasi otomatis
- **Offline Support**: Aplikasi tetap berfungsi tanpa koneksi internet
- **Conflict Resolution**: Automatic conflict detection dan resolution
- **Sync Dashboard**: Real-time monitoring status sinkronisasi
- **Audit Trail**: Logging semua aktivitas sinkronisasi

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MySQL (via XAMPP)
- **Offline Storage**: IndexedDB
- **Caching**: Service Worker
- **Authentication**: JWT dengan SHA-256 hashing

## Database Setup

### Environment Variables

Tambahkan variabel environment di file `.env.local`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=digital_desa
JWT_SECRET=your-secret-key-here
```

### Jalankan Migration

```bash
# Script SQL sudah ada di scripts/init-database.sql
# Execute via MySQL client atau phpMyAdmin
```

### Demo Data

Akun default untuk testing:

```
Email: admin@desa.id
Password: admin123
Role: admin
```

## Mekanisme Sinkronisasi

### Flag-Based Sync Flow

1. **Local Changes** → Ditandai dengan sync_flag (CREATE, UPDATE, DELETE)
2. **Offline Queue** → Data disimpan di IndexedDB jika offline
3. **Hash Computation** → SHA-256 hash dihitung untuk setiap record
4. **Conflict Detection** → Membandingkan hash lokal vs remote
5. **Sync Trigger** → Push/Pull ke server ketika online
6. **Resolution** → Automatic atau manual conflict resolution

### SHA-256 Implementation

Setiap data record menghasilkan SHA-256 hash dari field-field penting:

```typescript
dataHash = SHA256(nik + nama + tanggal_lahir)
```

Hash ini digunakan untuk:
- Deteksi duplikasi data
- Deteksi perubahan (jika hash berbeda = ada perubahan)
- Conflict resolution (membandingkan local vs remote hash)

### Sync Endpoints

- `POST /api/sync/pull` - Pull data dari server
- `POST /api/sync/push` - Push perubahan ke server
- `GET /api/sync/status` - Get sync status

## API Routes

### Authentication

- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/logout` - Logout

### Data Penduduk (CRUD)

- `GET /api/penduduk` - List semua penduduk
- `POST /api/penduduk` - Tambah penduduk baru
- `GET /api/penduduk/:id` - Get penduduk by ID
- `PUT /api/penduduk/:id` - Update penduduk
- `DELETE /api/penduduk/:id` - Hapus penduduk (soft delete)

## Fitur Offline

### Cara Kerja

1. Aplikasi mendeteksi status koneksi (online/offline)
2. Ketika offline, perubahan data disimpan di IndexedDB
3. Service Worker mengcache halaman untuk offline access
4. Ketika online kembali, otomatis trigger sync
5. Semua perubahan offline di-sync ke server

### Pending Changes

- Ditampilkan di sidebar
- Status sync tracking real-time
- Manual sync button tersedia

## Monitoring & Logging

### Sync Log

Setiap aktivitas sync dicatat di tabel `sync_log`:

- User ID
- Action (PULL/PUSH/BIDIRECTIONAL)
- Tables synced
- Record count
- Success/failure status
- Timestamp

### Data Integrity Log

Tabel `data_integrity_log` mencatat:

- Conflict detection
- Duplicate detection
- Hash mismatches
- Resolution method

## Running the Application

### Prerequisites

- Node.js 18+
- MySQL server running (XAMPP)
- npm atau yarn

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local dengan database credentials

# Run development server
npm run dev
```

Aplikasi akan berjalan di `http://localhost:3000`

### Database Setup

1. Buka XAMPP Control Panel
2. Start MySQL service
3. Buka phpMyAdmin (http://localhost/phpmyadmin)
4. Buat database baru: `digital_desa`
5. Import `scripts/init-database.sql`

## Testing

### Login Testing

1. Register user baru atau gunakan demo account
2. Verify role-based permissions
3. Test CRUD operations

### Sync Testing

1. Buat/edit data beberapa kali
2. Buka DevTools → Application → IndexedDB untuk lihat offline data
3. Cek sync_flag dan data_hash di database
4. Test pull/push sync dengan tombol di Sync Dashboard

### Offline Testing

1. Disable internet connection
2. Create/edit data (akan disimpan di IndexedDB)
3. Enable internet connection
4. Check automatic sync trigger
5. Verify data ter-sync ke server

## Architecture Overview

```
digital-desa/
├── app/
│   ├── login/             # Login page
│   ├── register/          # Register page
│   ├── app/               # Protected routes
│   │   ├── dashboard/     # Dashboard
│   │   ├── penduduk/      # Data management
│   │   └── sync/          # Sync controls
│   └── api/
│       ├── auth/          # Authentication endpoints
│       ├── penduduk/      # CRUD endpoints
│       └── sync/          # Sync endpoints
├── lib/
│   ├── db.ts              # Database connection
│   ├── auth.ts            # Authentication logic
│   ├── sync-engine.ts     # Sync engine core
│   ├── sync-manager.ts    # Sync management
│   ├── offline-manager.ts # Offline queue
│   └── indexed-db.ts      # IndexedDB helpers
├── components/
│   ├── penduduk-table.tsx
│   ├── penduduk-form.tsx
│   └── sync-dashboard.tsx
└── hooks/
    ├── use-offline-sync.ts
    └── use-service-worker.ts
```

## Performance Considerations

- Batch processing untuk large datasets
- Indexed queries di database
- Service Worker caching
- IndexedDB untuk offline storage
- Lazy loading untuk halaman

## Security Features

- JWT authentication dengan SHA-256
- Role-based access control
- Input validation & sanitization
- SQL injection prevention (parameterized queries)
- HTTP-only cookies untuk token
- Proper error handling tanpa expose sensitive data

## Future Enhancements

- [ ] Push notifications untuk sync status
- [ ] Multi-device sync
- [ ] Data encryption di offline storage
- [ ] Advanced conflict resolution UI
- [ ] Batch import/export
- [ ] Real-time collaboration
- [ ] Mobile app (React Native)

## Troubleshooting

### Database Connection Error

```
Error: No database URL found
```

**Solution**: Set environment variables di `.env.local`

### Sync Failed

- Check internet connection
- Verify database is running
- Check sync logs di database
- Check browser console untuk errors

### Offline Data Not Syncing

- Ensure Service Worker is registered (DevTools → Application → Service Workers)
- Check IndexedDB data (DevTools → Application → IndexedDB)
- Manual sync button di Sync Dashboard

## Contributing

Untuk kontribusi, silakan buat fork dan submit pull request.

## License

MIT

## Author

Digital Desa Project - Research Implementation

## Kontak

Untuk pertanyaan atau support, buka issue di repository.
