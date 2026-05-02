/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as adminTest } from './admin-test.tsx'
import { template as adminMessage } from './admin-message.tsx'
import { template as welcome } from './welcome.tsx'
import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as adminBookingNotification } from './admin-booking-notification.tsx'
import { template as providerNotification } from './provider-notification.tsx'
import { template as bookingStatusUpdate } from './booking-status-update.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'admin-test': adminTest,
  'admin-message': adminMessage,
  'welcome': welcome,
  'booking-confirmation': bookingConfirmation,
  'admin-booking-notification': adminBookingNotification,
  'provider-notification': providerNotification,
  'booking-status-update': bookingStatusUpdate,
}
