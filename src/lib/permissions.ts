import type { AppRole, NavModule, RolePermission } from '../types/database'

export const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, Record<NavModule, { view: boolean; create: boolean; edit: boolean; delete: boolean }>> = {
  super_admin: {
    overview:          { view: true, create: true, edit: true, delete: true },
    leads:             { view: true, create: true, edit: true, delete: true },
    clients:           { view: true, create: true, edit: true, delete: true },
    requirements:      { view: true, create: true, edit: true, delete: true },
    quotations:        { view: true, create: true, edit: true, delete: true },
    agreements:        { view: true, create: true, edit: true, delete: true },
    payments:          { view: true, create: true, edit: true, delete: true },
    invoices:          { view: true, create: true, edit: true, delete: true },
    projects:          { view: true, create: true, edit: true, delete: true },
    tasks:             { view: true, create: true, edit: true, delete: true },
    'design-approvals': { view: true, create: true, edit: true, delete: true },
    testing:           { view: true, create: true, edit: true, delete: true },
    deployments:       { view: true, create: true, edit: true, delete: true },
    handover:          { view: true, create: true, edit: true, delete: true },
    maintenance:       { view: true, create: true, edit: true, delete: true },
    monitoring:        { view: true, create: true, edit: true, delete: true },
    tickets:           { view: true, create: true, edit: true, delete: true },
    documents:         { view: true, create: true, edit: true, delete: true },
    reports:           { view: true, create: true, edit: true, delete: true },
    settings:          { view: true, create: true, edit: true, delete: true },
  },
  administrator: {
    overview:          { view: true, create: true, edit: true, delete: true },
    leads:             { view: true, create: true, edit: true, delete: true },
    clients:           { view: true, create: true, edit: true, delete: true },
    requirements:      { view: true, create: true, edit: true, delete: true },
    quotations:        { view: true, create: true, edit: true, delete: true },
    agreements:        { view: true, create: true, edit: true, delete: true },
    payments:          { view: true, create: true, edit: true, delete: false },
    invoices:          { view: true, create: true, edit: true, delete: false },
    projects:          { view: true, create: true, edit: true, delete: true },
    tasks:             { view: true, create: true, edit: true, delete: true },
    'design-approvals': { view: true, create: true, edit: true, delete: true },
    testing:           { view: true, create: true, edit: true, delete: true },
    deployments:       { view: true, create: true, edit: true, delete: true },
    handover:          { view: true, create: true, edit: true, delete: true },
    maintenance:       { view: true, create: true, edit: true, delete: true },
    monitoring:        { view: true, create: true, edit: true, delete: true },
    tickets:           { view: true, create: true, edit: true, delete: true },
    documents:         { view: true, create: true, edit: true, delete: true },
    reports:           { view: true, create: false, edit: false, delete: false },
    settings:          { view: true, create: false, edit: true, delete: false },
  },
  project_manager: {
    overview:          { view: true, create: false, edit: false, delete: false },
    leads:             { view: true, create: false, edit: false, delete: false },
    clients:           { view: true, create: false, edit: true, delete: false },
    requirements:      { view: true, create: true, edit: true, delete: false },
    quotations:        { view: true, create: false, edit: false, delete: false },
    agreements:        { view: true, create: false, edit: false, delete: false },
    payments:          { view: false, create: false, edit: false, delete: false },
    invoices:          { view: false, create: false, edit: false, delete: false },
    projects:          { view: true, create: true, edit: true, delete: false },
    tasks:             { view: true, create: true, edit: true, delete: true },
    'design-approvals': { view: true, create: true, edit: true, delete: false },
    testing:           { view: true, create: true, edit: true, delete: false },
    deployments:       { view: true, create: true, edit: true, delete: false },
    handover:          { view: true, create: true, edit: true, delete: false },
    maintenance:       { view: true, create: false, edit: true, delete: false },
    monitoring:        { view: true, create: false, edit: false, delete: false },
    tickets:           { view: true, create: true, edit: true, delete: false },
    documents:         { view: true, create: true, edit: true, delete: false },
    reports:           { view: true, create: false, edit: false, delete: false },
    settings:          { view: false, create: false, edit: false, delete: false },
  },
  finance_manager: {
    overview:          { view: true, create: false, edit: false, delete: false },
    leads:             { view: true, create: false, edit: false, delete: false },
    clients:           { view: true, create: false, edit: true, delete: false },
    requirements:      { view: true, create: false, edit: false, delete: false },
    quotations:        { view: true, create: true, edit: true, delete: true },
    agreements:        { view: true, create: true, edit: true, delete: false },
    payments:          { view: true, create: true, edit: true, delete: false },
    invoices:          { view: true, create: true, edit: true, delete: false },
    projects:          { view: true, create: false, edit: false, delete: false },
    tasks:             { view: false, create: false, edit: false, delete: false },
    'design-approvals': { view: false, create: false, edit: false, delete: false },
    testing:           { view: false, create: false, edit: false, delete: false },
    deployments:       { view: false, create: false, edit: false, delete: false },
    handover:          { view: false, create: false, edit: false, delete: false },
    maintenance:       { view: true, create: true, edit: true, delete: false },
    monitoring:        { view: false, create: false, edit: false, delete: false },
    tickets:           { view: true, create: false, edit: false, delete: false },
    documents:         { view: true, create: true, edit: true, delete: false },
    reports:           { view: true, create: true, edit: false, delete: false },
    settings:          { view: false, create: false, edit: false, delete: false },
  },
  technical_staff: {
    overview:          { view: true, create: false, edit: false, delete: false },
    leads:             { view: false, create: false, edit: false, delete: false },
    clients:           { view: false, create: false, edit: false, delete: false },
    requirements:      { view: true, create: false, edit: false, delete: false },
    quotations:        { view: false, create: false, edit: false, delete: false },
    agreements:        { view: false, create: false, edit: false, delete: false },
    payments:          { view: false, create: false, edit: false, delete: false },
    invoices:          { view: false, create: false, edit: false, delete: false },
    projects:          { view: true, create: false, edit: true, delete: false },
    tasks:             { view: true, create: true, edit: true, delete: false },
    'design-approvals': { view: true, create: false, edit: true, delete: false },
    testing:           { view: true, create: true, edit: true, delete: false },
    deployments:       { view: true, create: true, edit: true, delete: false },
    handover:          { view: true, create: false, edit: true, delete: false },
    maintenance:       { view: true, create: false, edit: true, delete: false },
    monitoring:        { view: true, create: true, edit: true, delete: false },
    tickets:           { view: true, create: true, edit: true, delete: false },
    documents:         { view: true, create: true, edit: true, delete: false },
    reports:           { view: false, create: false, edit: false, delete: false },
    settings:          { view: false, create: false, edit: false, delete: false },
  },
}

export function checkPermission(
  role: AppRole,
  module: NavModule,
  action: 'view' | 'create' | 'edit' | 'delete' = 'view',
  customPermissions?: RolePermission[]
): boolean {
  if (role === 'super_admin') return true

  if (customPermissions && customPermissions.length > 0) {
    const match = customPermissions.find(p => p.role === role && p.module === module)
    if (match) {
      if (action === 'view') return match.can_view
      if (action === 'create') return match.can_create
      if (action === 'edit') return match.can_edit
      if (action === 'delete') return match.can_delete
    }
  }

  const roleRules = DEFAULT_ROLE_PERMISSIONS[role]
  if (!roleRules) return false
  const moduleRule = roleRules[module]
  if (!moduleRule) return false

  return moduleRule[action] || false
}
