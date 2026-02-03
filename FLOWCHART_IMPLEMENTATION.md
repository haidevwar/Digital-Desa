# Implementasi Flowchart Sinkronisasi Data - Digital Desa

Dokumen ini menjelaskan bagaimana sistem sinkronisasi telah diimplementasikan sesuai dengan flowchart yang dirancang.

## Daftar Isi
1. [Alur Sinkronisasi](#alur-sinkronisasi)
2. [Komponen Implementasi](#komponen-implementasi)
3. [Status Koneksi](#status-koneksi)
4. [Deteksi Konflik](#deteksi-konflik)
5. [Queue Offline](#queue-offline)
6. [Notifikasi Real-time](#notifikasi-real-time)

---

## Alur Sinkronisasi

### Fase 1: Input Data Oleh Pengguna
```
Mulai → Input Data Oleh Pengguna → Simpan data ke penyimpanan lokal (status is_synced = false)
```

**Implementasi:**
- Komponen: `components/penduduk-form.tsx`
- Ketika user submit form, data disimpan ke database lokal dengan flag `is_synced = 0`
- Data hash SHA-256 dihitung saat input

### Fase 2: Hitung Hash (SHA-256)
```
Simpan data lokal → Hitung Hash (SHA-256)
```

**Implementasi:**
- Fungsi: `lib/sync-engine.ts` - `computeDataHash()`
- Hash dihitung dari field kunci: `nik + nama + tanggal_lahir`
- Format: SHA-256 hexadecimal string

**Kode Contoh:**
```typescript
const dataHash = crypto
  .createHash("sha256")
  .update(`${data.nik}${data.nama}${data.tanggal_lahir}`)
  .digest("hex")
```

### Fase 3: Cek Koneksi Internet
```
Hitung Hash → Cek Koneksi Internet (Internet Tersedia?)
```

**Implementasi:**
- Komponen: `components/connectivity-indicator.tsx`
- Sistem monitoring koneksi dengan 3 mekanisme:
  1. Browser online/offline events
  2. Periodic health check ke `/api/health`
  3. Connection status observer pattern

**Features:**
- Real-time status indicator di bottom-right layar
- Visual feedback: Green (Online) / Red (Offline)
- Last connected time tracking
- Retry attempt counter

### Fase 4a: Jika Online - Kirim ke Server
```
Cek Koneksi Internet → Ya → Kirim Data + Hash ke Server
```

**Implementasi:**
- Endpoint: `app/api/sync/push/route.ts`
- Method: POST `/api/sync/push`
- Body:
  ```json
  {
    "changes": [
      {
        "table": "penduduk",
        "action": "CREATE|UPDATE|DELETE",
        "data": { /* full record */ }
      }
    ],
    "conflictResolution": "timestamp"
  }
  ```

### Fase 4b: Jika Offline - Tunggu Koneksi
```
Cek Koneksi Internet → Tidak → Tunggu Koneksi Tersedia
```

**Implementasi:**
- Komponen: `lib/offline-manager.ts` - `OfflineManager` class
- Queue penyimpanan: IndexedDB (async persistent storage)
- Features:
  - Auto-detect ketika online kembali
  - Trigger sync event otomatis
  - Exponential backoff retry logic (2s, 4s, 8s, 16s, 32s)
  - Max 5 retry attempts

**Event Flow:**
```
User offline → Changes queued → App online → offline-sync-ready event → performSync()
```

---

## Komponen Implementasi

### 1. Connectivity Indicator (`components/connectivity-indicator.tsx`)

**Fitur:**
- Real-time connection status display
- Status details (last connected time, retry attempts)
- Click-to-expand detailed information

**Usage:**
```tsx
<ConnectivityIndicator />
```

**Visual States:**
- Online: Green indicator, "Online" status
- Offline: Red pulsing indicator, "Offline" status with warning

### 2. Sync Dashboard (`components/sync-dashboard.tsx`)

**Fitur:**
- Real-time sync status monitoring
- Pending sync count
- Unsynced records count
- Last sync time
- Manual Pull/Push buttons
- Conflict detection display
- System info display

**Status Cards:**
- **Pending Sync**: Items waiting to be synced (highlighted if > 0)
- **Unsynced Records**: Records with `is_synced = 0` (highlighted if > 0)
- **Last Sync**: Timestamp of last successful sync

### 3. Sync Logs Viewer (`components/sync-logs-viewer.tsx`)

**Fitur:**
- Comprehensive sync history (last 50 records)
- Filter by status: All, Success, Failed
- Expandable log details
- Timestamp and record count display

**Data Displayed:**
- Action type (PUSH/PULL)
- Tables involved
- Record count processed
- Success/failure status
- Timestamp

### 4. Sync Toast Notifications (`components/sync-toast.tsx`)

**Fitur:**
- Auto-dismissing notifications (4s timeout)
- Color-coded by type: Success/Error/Warning/Info
- Connection status change notifications
- Sync result notifications
- Manual close button

### 5. Offline Manager (`lib/offline-manager.ts`)

**Core Features:**

```typescript
interface ConnectionStatus {
  isOnline: boolean
  lastOnlineTime: Date | null
  connectionLost: boolean
  retryCount: number
}
```

**Methods:**
- `isApplicationOnline()`: Check current status
- `getConnectionStatus()`: Get detailed status
- `onStatusChange(callback)`: Subscribe to status changes
- `retrySyncWithBackoff()`: Exponential backoff retry
- `queueOfflineChange()`: Queue changes for later sync

### 6. useOfflineSync Hook (`hooks/use-offline-sync.ts`)

**State Management:**
```typescript
{
  isOnline: boolean
  pendingChanges: OfflineChange[]
  syncing: boolean
  lastSyncResult: SyncResult | null
  syncError: string | null
  retryCount: number
  performSync: (changes: OfflineChange[]) => Promise<void>
}
```

**Features:**
- Automatic sync on connection recovery
- Error tracking and retry logic
- Batch processing by table
- Result reporting with success/failed counts

---

## Status Koneksi

### Connection Status Tracking

**States:**
1. **Online**: Connected and verified
2. **Offline**: No network connection
3. **Connection Lost**: Was online, but connection lost
4. **Retrying**: Attempting to reconnect with backoff

### Health Check Mechanism

**Endpoint:** `GET /api/health`
- Simple status check
- Runs every 10 seconds
- Used to verify actual server connectivity

**Implementation:**
```typescript
// api/health/route.ts
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date() }, { status: 200 })
}
```

### Automatic Retry with Exponential Backoff

**Algorithm:**
```
Initial Delay: 2 seconds
Formula: delay = 2s × 2^(attempt)

Attempt 1: 2s
Attempt 2: 4s
Attempt 3: 8s
Attempt 4: 16s
Attempt 5: 32s (max)
```

---

## Deteksi Konflik

### Conflict Detection Flow

**Scenario:** Update dengan hash mismatch

```
Server Data (old_hash) ≠ Kirim Data (computed_hash)
↓
Ada Konflik? Ya
↓
Apply Conflict Resolution Strategy
```

### Conflict Resolution Strategy

**Default: Timestamp-based (Newer Wins)**

```typescript
if (conflictResolution === "timestamp") {
  shouldUpdate = localUpdateTime > remoteUpdateTime
}
```

**Alternative Strategies:**
- **Local**: Always use local data
- **Remote**: Always use remote data

### Conflict Response

**Structure:**
```typescript
interface SyncConflict {
  recordId: number
  table: string
  localHash: string      // Computed hash
  remoteHash: string     // Existing hash
  action: string         // UPDATE action
  resolvedBy: string     // "timestamp" | "local" | "remote"
}
```

**API Response:**
```json
{
  "success": false,
  "results": {
    "successful": 5,
    "failed": 0,
    "conflicts": 2
  },
  "conflicts": [
    {
      "recordId": 1,
      "table": "penduduk",
      "localHash": "abc123...",
      "remoteHash": "def456...",
      "action": "UPDATE",
      "resolvedBy": "timestamp"
    }
  ]
}
```

### UI Display

**Conflict Modal:**
- Shows conflicting records
- Displays resolution strategy used
- Allows manual review

---

## Queue Offline

### Offline Data Storage

**Storage Type:** IndexedDB
- Persistent across browser restarts
- Quota: Usually 50MB+ per domain
- Async API

### Queue Structure

**Table: `sync_queue` (local)**
```typescript
interface StoredRecord {
  id: number
  table: string
  data: Record<string, any>
  dataHash: string
  syncFlag: "PENDING" | "SYNCED"
  isSynced: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Queue Management

**When Offline:**
1. User makes change → Queued to IndexedDB
2. `is_synced` flag = 0
3. Toast notification shown

**When Online:**
1. `offline-sync-ready` event triggered
2. `performSync()` groups by table
3. Batch POST to `/api/sync/push`
4. On success: Remove from queue, set `is_synced = 1`

### Automatic Retry

**Trigger Points:**
1. App comes online
2. Manual "Push Data" button click
3. Failed sync with exponential backoff

---

## Notifikasi Real-time

### Browser Notifications

**Hook:** `hooks/use-sync-notifications.ts`

**Triggers:**
- Sync started
- Connection restored
- Connection lost

**Example:**
```
Title: "Kembali Online"
Body: "Koneksi telah dipulihkan. Sinkronisasi otomatis dimulai."
```

### In-App Toast Notifications

**Component:** `components/sync-toast.tsx`

**Types:**
1. **Success** (Green): Sync berhasil
2. **Error** (Red): Sync gagal
3. **Warning** (Orange): Offline, pending changes
4. **Info** (Blue): Informasi sinkronisasi

**Auto-close:** 4 seconds (except errors)

### Status Polling

**Interval:** 5 seconds
**Endpoint:** `GET /api/sync/status`
**Updates:** Pending sync count, unsynced records, last sync time

---

## Implementation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INPUT (Form Submit)                     │
│                   Simpan data lokal is_synced=0                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
            ┌──────────────────────────────┐
            │  Compute SHA-256 Hash        │
            │  (nik + nama + tgl_lahir)    │
            └────────────┬─────────────────┘
                         │
                         ▼
         ┌───────────────────────────────────┐
         │   Check Internet Connectivity      │
         │   (Browser + Health Check Ping)    │
         └────────┬────────────────┬─────────┘
                  │                │
            ┌─────▼─────┐    ┌─────▼─────────────────┐
            │   ONLINE  │    │   OFFLINE             │
            └─────┬─────┘    │ Queue to IndexedDB    │
                  │          │ Show Toast Warning    │
                  ▼          │ Wait for Reconnect    │
    ┌──────────────────────┐ └───────┬───────────────┘
    │  Push to Server      │         │
    │  POST /api/sync/push │         │
    │  (data + hash)       │         │
    └────────┬─────────────┘         │
             │                       │
             ▼                       │
    ┌──────────────────────┐         │
    │ Conflict Detection   │         │
    │ (Hash Comparison)    │         │
    └────────┬─────────────┘         │
             │                       │
        ┌────▼─────────┐             │
        │  Conflict?   │             │
        └────┬─────┬───┘             │
             │     │                 │
         ┌───▼──┐ ┌┴──────────────┐  │
         │ YES  │ │      NO       │  │
         └───┬──┘ └───────┬───────┘  │
             │            │          │
             ▼            ▼          │
    ┌─────────────────┐ ┌─────────────────┐
    │ Apply Strategy  │ │ Update: is_synced=1
    │ (timestamp)     │ │ Success Toast   │
    │ Resolve Conflict│ └────────┬────────┘
    └────────┬────────┘          │
             │                   │
             └──────────┬────────┘
                        │
                        ▼
             ┌──────────────────────┐
             │  Online Detection    │
             │ (if Offline Detected)│
             │ Trigger Retry Logic  │
             │ Exponential Backoff  │
             └──────────┬───────────┘
                        │
                        ▼
             ┌──────────────────────┐
             │   SUCCESS            │
             │   Show Notification  │
             │   Refresh Dashboard  │
             │   Update Sync Status │
             └──────────────────────┘
```

---

## Integration Points

### Frontend Flow
```
ClientLayout
├── ConnectivityIndicator (Global)
├── SyncToast (Global Notifications)
├── useSyncNotifications (Hook)
├── useOfflineSync (Hook)
└── Sync Page
    ├── SyncDashboard
    ├── SyncLogsViewer
    └── Control Buttons (Pull/Push)
```

### Backend Flow
```
API Endpoints
├── /api/sync/status (GET) - Current sync status
├── /api/sync/push (POST) - Push changes with conflict detection
├── /api/sync/pull (POST) - Pull remote changes
├── /api/sync/logs (GET) - Sync history
└── /api/health (GET/HEAD) - Connectivity check
```

---

## Testing Checklist

- [ ] Online → Offline transition triggers warning
- [ ] Offline changes queued to IndexedDB
- [ ] Offline → Online triggers auto-sync
- [ ] Hash mismatch detected correctly
- [ ] Conflict resolution applies timestamp strategy
- [ ] Retry mechanism works with exponential backoff
- [ ] Status polling updates dashboard every 5s
- [ ] Sync logs display correctly with filtering
- [ ] Toast notifications show on sync events
- [ ] Manual sync buttons work

---

## Performance Notes

1. **Hash Computation**: O(1) - Fixed field concatenation
2. **Batch Size**: 100 items per sync batch
3. **Polling**: 5 second intervals (configurable)
4. **Health Check**: 10 second intervals
5. **Storage**: IndexedDB with no size limits enforced

---

## Future Enhancements

1. Two-way sync (bidirectional)
2. Selective sync (choose which tables)
3. Compression for large payloads
4. Delta sync (only changed fields)
5. Webhooks for real-time updates
6. WebSocket support for live sync
7. Conflict resolution UI with manual override

---

**Last Updated:** January 19, 2026
**Version:** 1.0
**Status:** Fully Aligned with Flowchart
