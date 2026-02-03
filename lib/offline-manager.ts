export interface ConnectionStatus {
  isOnline: boolean
  connectionLost: boolean
  lastOnlineTime: Date | null
  retryCount: number
}

type StatusListener = (status: ConnectionStatus) => void

class OfflineManager {
  private status: ConnectionStatus
  private listeners: StatusListener[] = []

  constructor() {
    this.status = {
      isOnline: typeof window !== "undefined" ? navigator.onLine : true,
      connectionLost: false,
      lastOnlineTime: null,
      retryCount: 0,
    }

    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline)
      window.addEventListener("offline", this.handleOffline)
    }
  }

  private handleOnline = () => {
    this.status = {
      ...this.status,
      isOnline: true,
      connectionLost: false,
      retryCount: 0,
      lastOnlineTime: new Date(),
    }

    this.notify()
  }

  private handleOffline = () => {
    this.status = {
      ...this.status,
      isOnline: false,
      connectionLost: true,
      retryCount: this.status.retryCount + 1,
    }

    this.notify()
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.status))
  }

  // Dipakai ConnectivityIndicator
  getConnectionStatus(): ConnectionStatus {
    return this.status
  }

  // Dipakai useOfflineSync
  isApplicationOnline(): boolean {
    return this.status.isOnline
  }

  // Dipakai SyncToast & ConnectivityIndicator
  onStatusChange(callback: StatusListener) {
    this.listeners.push(callback)

    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }
}

export const offlineManager = new OfflineManager()
