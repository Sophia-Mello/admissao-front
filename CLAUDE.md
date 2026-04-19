# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RH Sistema Frontend - Next.js application for managing educational institution HR operations. This includes teacher management, class scheduling, attendance tracking, payroll, and **candidate test class booking system** (sistema de agendamento de aulas teste).

**Technology Stack:**
- Next.js 14 (Pages Router)
- React 18.2
- Ant Design 5 (UI components)
- React Query (TanStack Query 5) for data fetching
- Axios for HTTP requests
- Moment.js + dayjs for date handling
- js-cookie for cookie management

**Port:** Development runs on port 3000

**Backend:** Connects to v0-backend-rhsistema API (default: http://localhost:4001)

---

## Architecture Overview

### Pages Router Structure

This project uses Next.js **Pages Router** (not App Router):

```
pages/
├── _app.jsx           # App wrapper with QueryClient provider
├── index.jsx          # Root redirect
├── login.jsx          # Authentication page
├── dashboard.jsx      # Admin dashboard
├── agendamento.jsx    # ⭐ PUBLIC booking page (NEW)
├── colaboradores/     # Teachers management
├── turmas/            # Classes management
├── atribuicoes/       # Teacher assignments
└── ...
```

### Public vs Protected Routes

**Protected routes** (require authentication):
- Most pages use `withAdminOnly` or `withAdminOrCoordenador` HOCs
- Auth state managed via cookies (`token`, `user`)
- Middleware.js handles route protection

**Public routes** (no auth required):
- `/login` - Authentication page
- `/agendamento` - ⭐ NEW Candidate booking page (to be implemented)

### Data Fetching Pattern

**React Query** is used throughout the app:

```javascript
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';

// Query example
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => api.get(`/endpoint`).then(res => res.data)
});

// Mutation example
const mutation = useMutation({
  mutationFn: (payload) => api.post('/endpoint', payload),
  onSuccess: () => {
    queryClient.invalidateQueries(['resource']);
  }
});
```

### API Client Configuration

**File:** `lib/api.js`

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor adds auth token to protected routes
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` - Backend API base URL
- `NEXT_PUBLIC_USE_MOCKS` - Toggle mock data (for development)

---

## Sistema de Agendamento (Booking System)

### Overview

Public page where Gupy candidates can schedule test classes (aulas teste) at educational units. This is a **critical user-facing feature** that must be reliable, responsive, and handle high volume (15k candidates/day expected).

### Authoritative Documentation

**⚠️ IMPORTANT:** The backend repository contains the authoritative documentation for this feature. Always reference these documents:

**Backend Repo:** `../v0-backend-rhsistema/docs/`

**Key Documents:**
1. **`SPEC_3_FRONTEND_AGENDAMENTO.md`** - Frontend implementation spec (THIS IS YOUR GUIDE)
   - Complete API contracts with request/response examples
   - 8 UI states documented
   - Responsive design guidelines
   - 8 test scenarios
   - Mock data structure

2. **`SPEC_4_BACKEND_AGENDAMENTO.md`** - Backend API implementation
   - Endpoint implementations
   - Business rules
   - Error handling

3. **`BOOKING_FLOW.md`** - Executive flow (non-technical)
   - User journey
   - Business rules in plain language
   - Integration details

4. **`BOOKING_BUSINESS_RULES.md`** - Detailed business rules
   - Constraints and validations
   - Status transitions
   - Edge cases

### Architecture: 3-Endpoint Flow

System uses optimized 3-endpoint validation flow:

```
1. GET /api/v1/public/validate-session
   ↓ (Validates eligibility - blocking)

2. GET /api/v1/public/availability
   ↓ (Fetches available time slots)

3. POST /api/v1/public/bookings
   ↓ (Confirms booking with calendar invite)
```

**Why 3 endpoints?**
- ~30% of candidates are blocked (wrong step or 3+ no-shows)
- Validating first prevents 4.5k unnecessary database queries
- `/availability` stays lightweight and fast

### API Endpoints

#### 1. GET /api/v1/public/validate-session ⭐ NEW

**Purpose:** Validate candidate eligibility before showing slots

**Query Params:**
- `jobId` (string) - Gupy job ID
- `applicationId` (string) - Gupy application ID

**Response 200 (Eligible):**
```json
{
  "eligible": true,
  "candidate_name": "João Silva",
  "candidate_email": "joao@example.com",
  "job_name": "Professor de Matemática | Regional Norte | COD123"
}
```

**Response 403 (Blocked):**
```json
{
  "error": "Você atingiu o limite de faltas e não pode mais agendar aulas teste"
}
```
OR
```json
{
  "error": "Você não está na fase de agendamento de aula teste"
}
```

**Frontend Behavior:**
- Call FIRST before anything else
- If 403: Show error screen, DO NOT proceed
- If 200: Store candidate_name/job_name in state, proceed to availability

---

#### 2. GET /api/v1/public/availability

**Purpose:** Fetch available time slots for tomorrow (d+1 only)

**Query Params:**
- `jobId` (string)
- `applicationId` (string)

**Response 200:**
```json
{
  "success": true,
  "job_name": "Professor de Matemática | Regional Norte | COD123",
  "date": "2025-11-07",
  "unidades": [
    {
      "id_job_unidade": 1,
      "id_unidade": 10,
      "nome_unidade": "Escola Estadual Santos Dumont",
      "endereco": "Rua das Flores, 123 - Centro - São Paulo/SP",
      "available_slots": [
        {
          "slot_start": "2025-11-07T08:00:00-03:00",
          "slot_end": "2025-11-07T08:40:00-03:00"
        }
      ]
    }
  ]
}
```

**⚠️ Important:**
- Does NOT return `candidate_name` (already from validate-session)
- Unidades with empty `available_slots` are NOT included
- If `unidades: []`, show "No slots available" message

---

#### 3. POST /api/v1/public/bookings

**Purpose:** Confirm booking and create Google Calendar invite

**Request Body:**
```json
{
  "jobId": "job_abc123",
  "applicationId": "app_xyz789",
  "id_job_unidade": 1,
  "start_at": "2025-11-07T08:00:00-03:00"
}
```

**Response 201 (Success):**
```json
{
  "success": true,
  "booking": {
    "id_booking": 123,
    "start_at": "2025-11-07T08:00:00-03:00",
    "end_at": "2025-11-07T08:40:00-03:00",
    "status": "agendado",
    "calendar_event_ids": {
      "coordenador": "abc123xyz",
      "candidato": "xyz789abc"
    },
    "rubrica_url": "https://forms.google.com/..."
  },
  "unidade": {
    "nome_unidade": "Escola Estadual Santos Dumont",
    "endereco": "Rua das Flores, 123 - Centro - São Paulo/SP"
  }
}
```

**Response 409 (Conflict - slot taken by another candidate):**
```json
{
  "error": "Horário não está mais disponível. Por favor, escolha outro horário."
}
```

**Response 400 (Business rule violation):**
```json
{
  "error": "Você já possui um agendamento ativo"
}
```
OR
```json
{
  "error": "Você já realizou aula teste nesta unidade"
}
```

---

### Business Rules (Enforced by Backend)

**Critical rules the frontend must handle:**

1. **d+1 Only Rule** - Candidates can only book for tomorrow
   - Today's slots: NOT shown
   - Day after tomorrow: NOT shown
   - Only tomorrow (00:00 to 23:59): Shown

2. **One Active Booking** - Only 1 booking with status "agendado" at a time
   - Validated in POST endpoint
   - If violated: 400 error with clear message

3. **One Test Per Unit** - Candidate can only take test class at each unit once
   - Even if failed, cannot book again at same unit
   - Can book at different units

4. **3+ No-Shows = Permanent Block** - Candidates with 3+ faltas cannot book
   - Validated in GET /validate-session
   - Blocked before seeing any slots

5. **Email Invite Sent Automatically** - No calendar link needed
   - Backend sends Google Calendar invite to candidate email
   - Frontend should show success message, NOT calendar button

---

### Recent Updates (2025-11-12)

The booking management system (admin interface) has been refactored to align with ideal API contracts. See `docs/BOOKING_SYSTEM_REFACTOR_2025-11-12.md` for complete details.

#### Admin API Routes (Updated)

The booking management API routes now follow RESTful conventions:

**d_rules (booking window configuration):**
- `GET /api/v1/admin/bookings/d_rules/:id_unidade` - Get d_rule for unit
- `PATCH /api/v1/admin/bookings/d_rules/:id_unidade` - Update d_rule
- `DELETE /api/v1/admin/bookings/d_rules/:id_unidade` - Delete custom d_rule

**Time slots configuration:**
- `GET /api/v1/admin/bookings/slots/:id_unidade` - Get slot config for unit
- `PATCH /api/v1/admin/bookings/slots/:id_unidade` - Update slot config
- `DELETE /api/v1/admin/bookings/slots/:id_unidade` - Delete custom config

**Slot blocks (pontual blocks):**
- `POST /api/v1/admin/bookings/slot-blocks` - Create slot block
- `DELETE /api/v1/admin/bookings/slot-blocks/:id_slot` - Remove slot block

**Candidate search:**
- `GET /api/v1/admin/bookings/candidates/search-by-cpf?cpf=XXX&id_unidade=YYY` - Search by CPF within unit

**Weekly availability (for admin calendar):**
- `GET /api/v1/admin/bookings/availability?id_unidade=X&week_start=YYYY-MM-DD` - Get week view

#### Field Names (Updated)

Backend field names are now used directly throughout the admin interface (no mapping):

**Time slot configuration:**
- `morning_start` (not `morning_start_at`)
- `morning_end` (not `morning_end_at`)
- `afternoon_start` (not `afternoon_start_at`)
- `afternoon_end` (not `afternoon_end_at`)
- `slot_duration` - Integer (minutes) when sending, "00:40" string when receiving

**Response structure:**
```javascript
{
  success: true,
  slot_config: {
    morning_start: "08:00",
    morning_end: "11:00",
    afternoon_start: "14:00",
    afternoon_end: "17:00",
    slot_duration: "00:40"  // Backend returns as string
  }
}
```

**Frontend handling:**
- Parse `slot_duration` from "00:40" to integer (40) for form display
- Send `slot_duration` back to backend as integer (40)

#### Key Refactoring Changes

1. **API routes** - Plural resource names (`/d_rules` not `/d_rule`), RESTful paths
2. **Field names** - Use backend names directly (no frontend-to-backend mapping)
3. **CPF search** - Now requires `id_unidade`, validates 11-digit format
4. **Candidate display** - Shows "FirstName LastInitial" (e.g., "João S.") in calendar
5. **Configuration placeholders** - Empty forms show defaults as gray placeholders
6. **Complete data flow** - Slots pass full data (id_unidade, candidate info, etc.) to modals
7. **Mock fallbacks removed** - Only `NEXT_PUBLIC_USE_MOCKS` env var controls mocks
8. **Error handling** - ErrorBoundary component wraps booking management

**Complete documentation:** `docs/BOOKING_SYSTEM_REFACTOR_2025-11-12.md`

### 2025-11-12: Vigência (Validity Period) Implementation

**Feature:** Added vigência support to all booking configuration endpoints.

**What is Vigência?**
Vigência defines the period when a configuration is valid. Admins can now create temporary configurations that automatically expire.

**Changes:**

1. **TimeRangeEditor (PATCH /slots)**
   - Added optional `start_day` and `end_day` DatePickers
   - If both null: configuration valid indefinitely
   - If both set: configuration only valid during that period
   - Validation: end_day >= start_day, both or neither

2. **DRuleEditor (PATCH /d_rules)**
   - Added optional `start_day` and `end_day` DatePickers
   - Same behavior as slots: null = indefinite, set = temporary
   - Example: Allow d+0 (same-day booking) only during November

3. **ModalBloquearSlot (POST /slot-blocks)** - BREAKING CHANGE
   - Replaced single `block_date` with date range (`start_day` + `end_day`)
   - Both fields are REQUIRED (not optional like slots/d_rules)
   - Single RangePicker replaces old DatePicker
   - Backend creates 1 record that blocks multiple days
   - Success message shows days count: "3 dia(s) afetado(s)"

**Backend API Changes:**
- `PATCH /admin/bookings/slots/:id_unidade` - accepts `start_day`, `end_day` (optional)
- `PATCH /admin/bookings/d_rules/:id_unidade` - accepts `start_day`, `end_day` (optional)
- `POST /admin/bookings/slot-blocks` - requires `start_day`, `end_day` (removed `block_date`)

**UI Improvements:**
- Vigência status displayed at top of config modals
- "Configuração Temporária (Vigência Ativa)" if dates set
- "Configuração Permanente" if no vigência
- Date range shown in DD/MM/YYYY format

**Reference:** `API-CHANGES-VIGENCIA-2025-11-12.md`

---

## Implementation Guidelines

### Page Structure: agendamento.jsx

**Location:** `pages/agendamento.jsx`

**Router:** Pages Router (not App Router)

**Query Params:** `?jobId=X&applicationId=Y`

**State Management:**
```javascript
// Validation state
const [validating, setValidating] = useState(true);
const [eligible, setEligible] = useState(false);
const [candidateName, setCandidateName] = useState('');
const [jobName, setJobName] = useState('');

// Availability state
const [loadingAvailability, setLoadingAvailability] = useState(false);
const [availability, setAvailability] = useState(null);

// Booking state
const [selectedSlot, setSelectedSlot] = useState(null);
const [submitting, setSubmitting] = useState(false);
const [bookingConfirmed, setBookingConfirmed] = useState(false);
const [bookingDetails, setBookingDetails] = useState(null);

// Error state
const [error, setError] = useState(null);
```

### Service Layer: bookingService.js

**Location:** `lib/bookingService.js`

**Purpose:** Abstract API calls with mock toggle

```javascript
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

export async function validateSession(jobId, applicationId) {
  if (USE_MOCKS) {
    return mockValidateSession();
  }

  const response = await api.get('/api/v1/public/validate-session', {
    params: { jobId, applicationId }
  });
  return response.data;
}

export async function getAvailability(jobId, applicationId) {
  if (USE_MOCKS) {
    return mockGetAvailability();
  }

  const response = await api.get('/api/v1/public/availability', {
    params: { jobId, applicationId }
  });
  return response.data;
}

export async function createBooking(payload) {
  if (USE_MOCKS) {
    return mockCreateBooking(payload);
  }

  const response = await api.post('/api/v1/public/bookings', payload);
  return response.data;
}
```

### Mock Data Structure

**Location:** `lib/mocks/bookingMocks.js`

Follow SPEC_3 response structures exactly. See backend docs for complete examples.

### UI Components

**Ant Design 5** is already installed. Key components to use:

```javascript
import {
  Card,
  Alert,
  Spin,
  Button,
  Radio,
  Space,
  Typography,
  Divider,
  Result,
  Tag,
  message
} from 'antd';

import {
  CalendarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
```

### Date Formatting

**Use moment.js** (already installed):

```javascript
import moment from 'moment';
import 'moment/locale/pt-br';
moment.locale('pt-br');

// Format examples
const formattedDate = moment(date).format('dddd, DD [de] MMMM [de] YYYY');
// Output: "segunda-feira, 07 de novembro de 2025"

const formattedTime = moment(time).format('HH:mm');
// Output: "08:00"

const timeRange = `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`;
// Output: "08:00 - 08:40"
```

### Responsive Design

**Breakpoints:**
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

**Key guidelines:**
- Cards should stack vertically on mobile
- Buttons should be full-width on mobile (min 44px height)
- Text minimum: 14px for readability
- Use Ant Design's responsive Grid system

---

## Testing Guidelines

### Testing Strategy

1. **Manual Testing** (priority for public page)
   - Test on multiple devices (mobile, tablet, desktop)
   - Test all 8 UI states
   - Test error scenarios
   - Test with mock data first, then real API

2. **Automated Testing** (optional)
   - Unit tests for service layer
   - Integration tests for critical flows

### Test Scenarios (From SPEC_3)

See `SPEC_3_FRONTEND_AGENDAMENTO.md` section "Cenários de Teste" for complete list.

**Critical scenarios:**
1. Validation - Candidate eligible
2. Validation - Candidate blocked (3+ faltas)
3. Validation - Candidate blocked (wrong step)
4. Selection and confirmation flow
5. Error handling (Gupy timeout, race condition)
6. Responsive design on mobile
7. No slots available
8. Slot taken by another candidate (409 conflict)

---

## Development Workflow

### Phase 1: Setup with Mocks

1. Set `NEXT_PUBLIC_USE_MOCKS=true` in `.env.local`
2. Create `lib/bookingService.js` with mock toggle
3. Create `lib/mocks/bookingMocks.js` with test data
4. Implement `pages/agendamento.jsx`
5. Test all 8 UI states with mocks
6. Test responsive design

### Phase 2: API Integration

1. Set `NEXT_PUBLIC_USE_MOCKS=false`
2. Ensure backend is running on port 4001
3. Test real API integration
4. Handle error cases
5. Test race conditions (multiple candidates booking same slot)

### Phase 3: Polish

1. Add loading states and transitions
2. Optimize performance
3. Add error boundary
4. Test on multiple browsers
5. Accessibility check (keyboard navigation, screen readers)

---

## Common Development Tasks

### Adding a New Protected Page

```javascript
// pages/new-page.jsx
import { withAdminOnly } from '../lib/withAdminOnly';

function NewPage() {
  return <div>Protected content</div>;
}

export default withAdminOnly(NewPage);
```

### Making an Authenticated API Call

```javascript
import api from '../lib/api';

// GET request
const response = await api.get('/api/v1/resource');

// POST request
const response = await api.post('/api/v1/resource', payload);
```

### Using React Query

```javascript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => api.get(`/api/v1/resource/${id}`).then(res => res.data),
  enabled: !!id, // Only run if id exists
});
```

---

## Troubleshooting

### Page Not Loading

**Symptom:** Blank screen or infinite loading
**Causes:**
- Query params missing (`?jobId=X&applicationId=Y`)
- Backend not running
- CORS error
**Fix:** Check browser console, verify backend URL in `.env.local`

### API Returns 404

**Symptom:** Error "Job não encontrado"
**Causes:**
- Wrong backend URL
- Job not created in backend database
**Fix:** Verify `NEXT_PUBLIC_API_URL` points to correct backend

### Mock Data Not Working

**Symptom:** Real API calls happening despite `NEXT_PUBLIC_USE_MOCKS=true`
**Causes:**
- Environment variable not loaded (need to restart dev server)
- Wrong env var name
**Fix:** Restart `npm run dev`, verify `.env.local` file exists

### Responsive Design Breaking

**Symptom:** Layout broken on mobile
**Causes:**
- Fixed widths instead of responsive units
- Missing media queries
**Fix:** Use Ant Design Grid, test in Chrome DevTools mobile view

---

## Port Configuration

- **Frontend:** Port 3000 (development)
- **Backend:** Port 4001 (default)

Configure backend URL via `NEXT_PUBLIC_API_URL` in `.env.local`

---

## Git Workflow

**Current Branch:** `feature/frontend-agendamento`

**Rules:**
- ✅ Commit frequently with clear messages
- ✅ Push to `feature/frontend-agendamento` only
- ❌ NEVER push to `main` or `homolog` directly
- ✅ Use PRs for integration

**Commit Message Format:**
```
feat: add agendamento page with validation flow
fix: correct date formatting in booking confirmation
docs: update CLAUDE.md with API examples
```

---

## References

### Internal Documentation (Backend Repo)

**Location:** `../v0-backend-rhsistema/docs/`

- `SPEC_3_FRONTEND_AGENDAMENTO.md` - ⭐ YOUR PRIMARY GUIDE
- `SPEC_4_BACKEND_AGENDAMENTO.md` - Backend implementation
- `BOOKING_FLOW.md` - User journey and business flow
- `BOOKING_BUSINESS_RULES.md` - Detailed rules and constraints

### External Documentation

- Next.js Pages Router: https://nextjs.org/docs/pages
- Ant Design 5: https://ant.design/components/overview/
- React Query: https://tanstack.com/query/latest/docs/react/overview
- Moment.js: https://momentjs.com/docs/

---

## Summary

**When implementing the agendamento feature:**

1. ✅ Read `SPEC_3_FRONTEND_AGENDAMENTO.md` thoroughly first
2. ✅ Implement with mocks first, API integration second
3. ✅ Follow the 3-endpoint validation flow exactly
4. ✅ Test all 8 UI states
5. ✅ Handle errors gracefully with clear messages
6. ✅ Test responsive design on mobile
7. ✅ Commit frequently
8. ✅ Never push to main branch

**Critical Success Factors:**
- Validate eligibility FIRST (blocking)
- Handle 409 conflicts gracefully (race conditions)
- Show clear error messages for blocked candidates
- Responsive design that works on 320px screens
- Fast loading states and smooth transitions

---

## Merge History

### 2025-11-10: Integration of Regional Jobs + Booking System

**Branches Merged:**
- `homolog` (regional jobs feature) + `feature/frontend-agendamento` (booking system) → `feature/integrated-merge`

**Features Integrated:**
1. **Regional Jobs System** (from homolog branch)
   - Multi-regional job posting interface
   - Unit selection and assignment
   - Enhanced job management capabilities

2. **Candidate Booking System** (from feature/frontend-agendamento branch)
   - Public booking page (/agendamento)
   - 3-endpoint validation flow (validate-session, availability, bookings)
   - Mobile-responsive design
   - Mock data toggle for development

**Merge Details:**
- **Conflicts Resolved:** ZERO conflicts (clean auto-merge)
- **Backend Port Change:** Updated from 4000 → 4001
  - Updated in `lib/api.js` default baseURL
  - Updated in `next.config.js` API rewrites
  - Updated in `.env.local` documentation

**Tests Added:**
- **92 Total Tests** (37 unit tests + 55 integration tests)
- Test coverage for booking service layer
- Test coverage for API client configuration
- Test scenarios for all 8 booking UI states

**Configuration Changes:**
- Environment variables aligned between branches
- API client configuration unified
- Port references standardized across codebase

**Reference Documentation:**
- Complete merge plan: `docs/plans/2025-11-10-merge-homolog-agendamento.md`
- Verification checklist completed successfully
- All tests passing post-merge

**Git Commands Used:**
```bash
git checkout -b feature/integrated-merge homolog
git merge feature/frontend-agendamento --no-ff
# Result: Merge made by the 'ort' strategy (0 conflicts)
```

**Next Steps:**
- Continue development on `feature/integrated-merge` branch
- Test integrated features together
- Prepare for eventual merge to main via PR
