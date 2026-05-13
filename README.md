# KONEK – KOmunidad NEtwork for Kalusugan

**KONEK** is a web-based maternal health records management system built for the City Health Office of Batangas City. It digitizes the tracking of prenatal, intrapartum, and postnatal care across all 105 barangays, replacing manual paper-based workflows with a centralized, real-time platform.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5 |
| **UI Library** | Mantine 7, Lucide React icons |
| **Backend / Database** | Supabase (PostgreSQL + Auth + Row-Level Security) |
| **Charts** | Recharts |
| **Report Export** | ExcelJS, FileSaver |
| **Typography** | Plus Jakarta Sans (Google Fonts) |

---

## Features

### 🏠 Dashboard
- Summary cards: total patients, high-risk cases, prenatal due (8 ANC), postnatal due (4 PNC)
- Overdue visit lists for prenatal and postnatal care with quick-filter navigation
- Recently added/modified records table
- Emergency hotline reference panel (Batangas City)

### 📋 Maternal Records (CRUD)
- Full patient record management with search, filter, and sort
- Multi-tab patient modal for organized data entry:
  - **General Tab** – demographics, barangay, civil status, PhilHealth, SSS/GSIS, 4Ps status, solo parent classification, transfer status (Trans-In/Trans-Out)
  - **Prenatal Tab** – LMP, EDC, auto-calculated AOG/trimester, prenatal visit log with weight, height, BMI, blood pressure tracking
  - **Supplementation Tab** – IFA, MMS, and Calcium Carbonate logging with running totals and completion tracking
  - **Immunization Tab** – Tetanus Diphtheria (Td1–Td5) with FIM status calculation
  - **Labs Tab** – CBC, urinalysis, and other laboratory results logging
  - **Delivery Tab** – labor & delivery details, multi-baby support (up to 12), birth weight categorization, delivery attendant, and birth outcome tracking
  - **Postnatal Tab** – 4 PNC contact dates, postpartum IFA supplementation logging with auto-completion detection, blood pressure tracking
- View Record modal for read-only summary of any patient's full data
- High-risk pregnancy auto-detection and manual flagging

### 📊 Reports
- **FHSIS M1 (Maternal Care)** – Standard Field Health Service Information System report exported to Excel, with indicators for prenatal care, immunization (Td), nutrition (BMI), and deliveries aggregated by age group (10–14, 15–19, 20–49)
- **Maternal TCL** – Target Client List export in the official DOH format
- Both reports support month, year, and barangay filters

### 📈 Statistics (Admin)
- Interactive charts powered by Recharts (pie charts, bar graphs)
- General data breakdowns: solo parent, 4Ps, PhilHealth, SSS, GSIS, birth registration
- Pregnancy-related analytics: 8 ANC completion rate, 4 PNC completion rate, high-risk pregnancy rate with reasons breakdown, teenage pregnancy cases
- Click-to-view record lists from any chart slice/bar
- Per-chart Excel export

### 👥 User Management (Admin)
- Invite and manage midwife accounts via Supabase Auth
- Assign barangay-level data access per user
- Role-based visibility: midwives see only their assigned barangays; admin sees all

### ❓ Help Center & About
- Searchable FAQ with categorized topics
- About page with project information

### 🔐 Authentication & Legal
- Supabase email/password authentication
- Password set/reset flow for invited users
- Terms of Use and Privacy Policy acceptance gate
- Row-Level Security (RLS) on all database operations

---

## Project Structure

```
konek-app-v3/
├── public/                          # Static assets (logos, seals)
├── src/
│   ├── App.jsx                      # Main application shell & state management
│   ├── Login.jsx                    # Login page
│   ├── main.jsx                     # Vite entry point (Mantine providers)
│   ├── supabaseClient.js            # Supabase client initialization
│   ├── components/
│   │   ├── admin/
│   │   │   └── UserManagementView   # User invite & barangay assignment
│   │   ├── auth/
│   │   │   └── SetPassword          # Password set/reset page
│   │   ├── dashboard/
│   │   │   └── DashboardView        # Dashboard with stats cards & overdue lists
│   │   ├── help/
│   │   │   ├── HelpView             # FAQ / Help Center
│   │   │   └── AboutView            # About page
│   │   ├── layout/
│   │   │   └── AppShellLayout       # Sidebar navigation & header
│   │   ├── legal/
│   │   │   ├── LegalPage            # Terms of Use & Privacy Policy page
│   │   │   └── TermsAcceptanceModal # First-login terms gate
│   │   ├── patient-modal/
│   │   │   ├── PatientModal         # Add/Edit patient modal wrapper
│   │   │   ├── ViewRecordModal      # Read-only patient summary
│   │   │   └── tabs/
│   │   │       ├── GeneralTab       # Patient demographics & general data
│   │   │       ├── PrenatalTab      # Prenatal visits & AOG tracking
│   │   │       ├── SupplementationTab # IFA, MMS, Calcium logging
│   │   │       ├── ImmunizationTab  # Td immunization tracking
│   │   │       ├── LabsTab          # Laboratory results
│   │   │       ├── DeliveryTab      # Labor, delivery & multi-baby support
│   │   │       └── PostnatalTab     # PNC contacts & postpartum IFA
│   │   ├── records/
│   │   │   └── RecordsView          # Patient records table with filters
│   │   ├── reports/
│   │   │   └── ReportsView          # FHSIS M1 & Maternal TCL export
│   │   └── statistics/
│   │       └── StatisticsView       # Charts dashboard (admin)
│   ├── lib/
│   │   ├── constants.js             # Batangas City barangays list
│   │   ├── fhsisExport.js           # FHSIS M1 & TCL Excel generation
│   │   ├── formatters.js            # Date formatting utilities
│   │   ├── initialFormState.js      # Default form state for patient records
│   │   ├── patientHelpers.js        # AOG, EDC, risk, overdue calculations
│   │   ├── reportMonthFilter.js     # Month/year patient filtering logic
│   │   ├── statisticsExport.js      # Statistics chart-to-Excel export
│   │   └── termsContent.js          # Terms of Use & Privacy Policy content
│   └── services/
│       ├── statisticsService.js     # Supabase queries for statistics aggregation
│       └── userProfileService.js    # User profile & barangay assignment service
├── supabase/                        # Supabase configuration & templates
├── index.html                       # HTML entry point
├── vite.config.js                   # Vite configuration
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- A Supabase project with a `maternal_records` table and Auth configured

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

---

## Database Schema Notes

The `maternal_records` table in Supabase requires the following notable columns:

- `baby_details` — `jsonb`, default `'[]'`. Each entry: `{ weight, category, sex, delivery_date, delivery_time, status }`
- `prenatal_visits` — `jsonb`, default `'[]'`. Each entry: `{ date, aog, trimester, weight, height, bmi, bmi_category, bp_systolic, bp_diastolic, remarks }`
- `supplements_ifa`, `supplements_mms`, `supplements_calcium` — `jsonb`, default `'[]'`. Each entry: `{ date, count }`
- `postpartum_logs` — `jsonb`, default `'[]'`. Each entry: `{ date, count, remarks }`
- `lab_logs` — `jsonb`, default `'[]'`. Each entry: `{ type, date, result, hemoglobin, remarks }`
- `pnc_date_1` through `pnc_date_4` — `date` columns for postnatal contacts
- High-risk checklist flags (optional booleans): `has_hypertension`, `has_gestational_diabetes`, `has_advanced_maternal_age`, `has_multiple_gestation`, `has_multiple_miscarriages`, `has_obesity`
- Transfer tracking: `transfer_status` (text), `transfer_location` (text)
- General data columns: `civil_status`, `is_solo_parent`, `solo_parent_type`, `philhealth_status`, `philhealth_type`, `sss_member`, `gsis_member`, `contact_no`, `email_address`, `birth_registered`, `birth_registration_date`

---

## Authors

Panaligan, Aquino, Bauan, Cabrera, Palbacal, Sebuc

---

## License

All rights reserved.
