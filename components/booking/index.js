// components/booking/index.js

/**
 * Booking Components
 *
 * Components for the public booking flow (agendamento).
 *
 * Main component: BookingWizard
 * - Manages the complete booking flow wizard
 * - Steps: validating -> unit-select -> calendar -> confirming -> success
 *
 * Usage:
 * import BookingWizard from '../components/booking/BookingWizard';
 * // or
 * import { BookingWizard } from '../components/booking';
 */

export { default as BookingWizard } from './BookingWizard';
export { default as ValidationStep } from './ValidationStep';
export { default as UnitSelector } from './UnitSelector';
export { default as WeeklyCalendar } from './WeeklyCalendar';
export { default as SlotCardPublic } from './SlotCardPublic';
export { default as BookingConfirmation } from './BookingConfirmation';
export { default as BookingSuccess } from './BookingSuccess';
export { default as ErrorDisplay } from './ErrorDisplay';
