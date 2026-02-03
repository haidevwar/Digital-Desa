export function hasPermission(role: string, permission: string) {
  const rolePermissions: Record<string, string[]> = {
    admin: [
      "view_all_penduduk",
      "create_penduduk",
      "edit_all_penduduk",
      "delete_penduduk",
    ],
    manajer: [
      "view_all_penduduk",
      "create_penduduk",
      "edit_all_penduduk",
    ],
    user: [
      "view_all_penduduk",
    ],
    petugas: [
      "view_all_penduduk",
      "create_penduduk",
      "edit_all_penduduk",
      "delete_penduduk",
    ],
  }

  return rolePermissions[role]?.includes(permission) || false
}
