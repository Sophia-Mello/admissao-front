/**
 * RS Admissao Frontend Hooks
 *
 * Centralized exports for all React Query hooks.
 * All hooks use React Query v5 and handle cache invalidation automatically.
 */

// Availability
export {
  useAvailability,
  usePrefetchAvailability,
  availabilityKeys,
} from './useAvailability'

// Schedule Config
export {
  useScheduleConfig,
  useScheduleConfigList,
  useSaveScheduleConfig,
  useDeleteScheduleConfig,
  scheduleConfigKeys,
} from './useScheduleConfig'

// Schedule Blocks
export {
  useScheduleBlocks,
  useCreateScheduleBlock,
  useUpdateScheduleBlock,
  useDeleteScheduleBlock,
  scheduleBlockKeys,
} from './useScheduleBlocks'

// Jobs
export {
  useJobs,
  useJob,
  useCreateJob,
  useUpdateJob,
  usePublishJobs,
  useCloseJobs,
  useCancelJobs,
  useDeleteJobs,
  useDeleteDrafts,
  useLinkJobUnit,
  useUnlinkJobUnit,
  useSyncJobFromGupy,
  useUpdateJobStatus,
  jobsKeys,
} from './useJobs'

// Gupy Templates
export {
  useGupyTemplates,
  useGupyTemplate,
  gupyTemplatesKeys,
} from './useGupyTemplates'

// Bookings
export {
  useBookings,
  useBookingDetail,
  bookingKeys,
} from './useBookings'

// Candidate Search (Gupy integration)
export {
  useCandidateSearch,
  useApplicationDetail,
  candidateKeys,
} from './useCandidateSearch'

// Subregionais and Unidades
export {
  useSubregionais,
  useUnidades,
  useAllUnidades,
  subregionalKeys,
} from './useSubregionais'

// Authentication
export {
  useAuth,
  useRequireAuth,
  useRequireRole,
} from './useAuth'

// Candidato Hub
export {
  useCandidatoLookup,
  candidatoHubKeys,
} from './useCandidatoHub'

// Applications (Gestao de Candidaturas)
export {
  useApplications,
  useApplication,
  useSyncApplications,
  useApplicationTags,
  fetchAllApplicationIds,
  applicationsKeys,
  // Bulk actions
  useCommonSteps,
  useActionStatus,
  useBulkEmail,
  useBulkTags,
  useBulkMove,
  useBulkReprove,
} from './useApplications'

// Email Templates (Gupy Integration)
export {
  useEmailTemplates,
  useEmailTemplate,
  useSendEmail,
  emailTemplatesKeys,
} from './useEmailTemplates'

// Job Steps (for dynamic step filter)
export {
  useJobSteps,
  jobStepsKeys,
} from './useJobSteps'

// Action History (for bulk action tracking and undo)
export {
  useActionHistory,
  useActionDetails,
  useUndoAction,
  useCanUndo,
  calculateCanUndo,
} from './useActionHistory'

// Demandas (Gestão de Demandas)
export {
  useDemandas,
  useUpdateDemandaMetadata,
  useDemandasSubregionais,
  useDemandasUnidades,
  useDisciplinas,
  useDemandaHorarios,
  useMobilidadeInterna,
  useColaboradorAtribuicoes,
  useCandidatosDemanda,
  useDemandaTags,
  demandasKeys,
} from './useDemandas'
