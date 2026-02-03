export interface ConnectionStatus {
  isOnline: boolean
  connectionLost: boolean
  lastOnlineTime: Date | null
  retryCount: number
}

export interface OfflineChange {
  table: string
  action: "CREATE" | "UPDATE" | "DELETE"
  data: any
  timestamp: Date
}

type StatusListener = (status: ConnectionStatus) => void

class OfflineManager {
  private status: ConnectionStatus
  private listeners: StatusListener[] = []
  private retryTimeout: NodeJS.Timeout | null = null
  private maxRetries = 5
  private baseDelay = 1000

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

    // Clear any pending retries
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }

    this.notify()
    
    // Trigger sync ready event when coming back online
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("online-sync-ready"))
    }
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

  // Get current connection status
  getConnectionStatus(): ConnectionStatus {
    return this.status
  }

  // Check if application is online
  isApplicationOnline(): boolean {
    return this.status.isOnline
  }

  // Subscribe to status changes
  onStatusChange(callback: StatusListener) {
    this.listeners.push(callback)

    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  // Retry sync with exponential backoff
  retrySyncWithBackoff() {
    if (!this.status.isOnline) return
    if (this.status.retryCount >= this.maxRetries) {
      console.log("Max retries reached")
      return
    }

    const delay = this.baseDelay * Math.pow(2, this.status.retryCount)
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }

    this.retryTimeout = setTimeout(() => {
      if (this.status.isOnline) {
        window.dispatchEvent(new CustomEvent("retry-sync"))
      }
    }, delay)

    this.status.retryCount++
    this.notify()
  }

  // Reset retry count
  resetRetryCount() {
    this.status.retryCount = 0
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }
    this.notify()
  }
}

export const offlineManager = new OfflineManager()
