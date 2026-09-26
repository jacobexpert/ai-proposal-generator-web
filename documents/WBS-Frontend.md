# AI Proposal Generator — Work Breakdown Structure: FRONTEND

| Thuộc tính | Giá trị |
|---|---|
| Nguồn yêu cầu | `AI-Proposal-Generator-Development-Specification.md` v1.0 |
| Phạm vi | Web app — Next.js, TypeScript, React, Tailwind CSS, shadcn/ui, React Hook Form, Zod, TanStack Query |
| Phiên bản WBS | 1.1 — 2026-09-26 (bổ sung đăng ký, lời mời, quản lý thành viên theo spec US-BE-03) |
| Phương pháp | Scrum — Phase → Epic → User Story → Task |
| File liên quan | `WBS-Backend.md` (cột **BE Dep** tham chiếu User Story backend) |

---

## 0. Hướng dẫn sử dụng

### 0.1 Giá trị Status

| Status | Ý nghĩa |
|---|---|
| `TODO` | Chưa bắt đầu |
| `IN_PROGRESS` | Đang thực hiện |
| `IN_REVIEW` | Đã xong code, đang code review / QA |
| `BLOCKED` | Bị chặn (thường do API backend chưa sẵn sàng) |
| `DONE` | Đạt Definition of Done |
| `DEFERRED` | Dời sang phase sau |

Cập nhật status ở **2 nơi**: bảng tổng hợp (mục 1) và bảng task của từng User Story.

### 0.2 Quy ước

- **ID:** `US-FE-xx` = User Story; `FE-xx.y` = Task.
- **Priority (MoSCoW):** `MUST` / `SHOULD` / `COULD`. **SP:** Fibonacci. **Est (h):** ước lượng tham khảo.
- **BE Dep:** User Story backend cần sẵn sàng (có thể dùng mock API — MSW — để làm song song).

### 0.3 Definition of Ready (DoR)

- [ ] Story có AC, wireframe/tham chiếu màn hình (§29 spec) và API contract (OpenAPI) từ backend.
- [ ] Dependencies & open decisions liên quan đã chốt.

### 0.4 Definition of Done (DoD) — áp dụng cho mọi task

- [ ] TypeScript strict, không `any` không cần thiết; ESLint + Prettier pass.
- [ ] Form validate bằng Zod (cùng schema với request DTO); lỗi API hiển thị thân thiện.
- [ ] Có loading / empty / error state.
- [ ] **Không render HTML từ AI hoặc tài liệu khi chưa sanitize** (chống XSS); không lưu token ở `localStorage`.
- [ ] Unit/component test (Vitest + React Testing Library) cho logic & component chính; E2E (Playwright) cho luồng quan trọng.
- [ ] Accessibility cơ bản: keyboard navigation, label, contrast (WCAG 2.1 AA mục tiêu).
- [ ] Responsive tối thiểu từ 1280px (desktop-first; ứng dụng làm việc chuyên sâu).
- [ ] Code review pass; CI xanh.

---

## 1. Bảng tổng hợp tiến độ (Progress Tracker)

### 1.1 Theo Phase

| Phase | Mục tiêu | # Story | SP | Status |
|---|---|---|---|---|
| **MVP (Phase 1)** | Luồng UI hoàn chỉnh: đăng ký/login → workspace & thành viên → tạo proposal → upload → review requirements → outline → generate → edit → review → approve → export | 29 | 166 | `TODO` |
| **Phase 2 — Professional** | Knowledge library, template builder, version compare, advanced review, collaboration, CRM, plans | 8 | 52 | `TODO` |
| **Phase 3 — Enterprise** | SSO, RBAC admin, audit viewer, data residency settings | 4 | 24 | `TODO` |
| **Phase 4 — Agent Platform** | Agent run console, solution/architecture, compliance matrix, commercial, integrations | 4 | 31 | `TODO` |

### 1.2 Theo User Story

| Phase | Epic | Story ID | Tên User Story | Priority | SP | Sprint | BE Dep | Status |
|---|---|---|---|---|---|---|---|---|
| MVP | EP-F01 Foundation | US-FE-01 | Project bootstrap & app shell | MUST | 5 | S1 | US-BE-01 | `TODO` |
| MVP | EP-F01 Foundation | US-FE-02 | Login / logout / protected routes | MUST | 5 | S1 | US-BE-02 | `TODO` |
| MVP | EP-F01 Foundation | US-FE-03 | User profile & workspace switcher | MUST | 5 | S1 | US-BE-02, US-BE-03 | `TODO` |
| MVP | EP-F01 Foundation | US-FE-04 | API client, error handling & shared UI states | MUST | 5 | S1 | US-BE-04 | `TODO` |
| MVP | EP-F01 Foundation | US-FE-42 | Đăng ký tài khoản | MUST | 5 | S1 | US-BE-03 | `TODO` |
| MVP | EP-F01 Foundation | US-FE-43 | Chấp nhận lời mời (link mời) | MUST | 5 | S1 | US-BE-03 | `TODO` |
| MVP | EP-F19 Workspace & Team | US-FE-44 | Quản lý thành viên & lời mời | MUST | 8 | S1 | US-BE-03 | `TODO` |
| MVP | EP-F19 Workspace & Team | US-FE-45 | Cài đặt workspace (đổi tên, rời workspace) | MUST | 3 | S1 | US-BE-03 | `TODO` |
| MVP | EP-F02 Proposal | US-FE-05 | Dashboard — danh sách proposal | MUST | 5 | S1 | US-BE-05 | `TODO` |
| MVP | EP-F02 Proposal | US-FE-06 | Create Proposal wizard | MUST | 8 | S1 | US-BE-05, US-BE-14 | `TODO` |
| MVP | EP-F02 Proposal | US-FE-07 | Proposal overview, edit metadata, delete & status stepper | MUST | 5 | S1 | US-BE-05, US-BE-06 | `TODO` |
| MVP | EP-F03 Documents | US-FE-08 | Document upload | MUST | 5 | S2 | US-BE-07 | `TODO` |
| MVP | EP-F03 Documents | US-FE-09 | Document list & processing status | MUST | 5 | S2 | US-BE-08, US-BE-09 | `TODO` |
| MVP | EP-F04 Requirements | US-FE-10 | Trigger requirement analysis & progress | MUST | 3 | S2 | US-BE-11 | `TODO` |
| MVP | EP-F04 Requirements | US-FE-11 | Requirement review table & actions | MUST | 8 | S2 | US-BE-13 | `TODO` |
| MVP | EP-F04 Requirements | US-FE-12 | Questions / Assumptions / Conflicts tabs | MUST | 5 | S2 | US-BE-12 | `TODO` |
| MVP | EP-F04 Requirements | US-FE-13 | Source viewer (xem đoạn nguồn trong tài liệu) | MUST | 5 | S2 | US-BE-08, US-BE-11 | `TODO` |
| MVP | EP-F05 Outline | US-FE-14 | Outline generation & requirement mapping | MUST | 8 | S3 | US-BE-15 | `TODO` |
| MVP | EP-F05 Outline | US-FE-15 | Generate proposal sections với progress | MUST | 5 | S3 | US-BE-17 | `TODO` |
| MVP | EP-F06 Workspace | US-FE-16 | Proposal Workspace 3-column layout | MUST | 5 | S3 | US-BE-15 | `TODO` |
| MVP | EP-F06 Workspace | US-FE-17 | Rich text editor & autosave | MUST | 8 | S3 | US-BE-19 | `TODO` |
| MVP | EP-F06 Workspace | US-FE-18 | Evidence panel & claim labeling | MUST | 8 | S3 | US-BE-17 | `TODO` |
| MVP | EP-F06 Workspace | US-FE-19 | AI actions: rewrite / expand / shorten / regenerate | MUST | 5 | S3 | US-BE-18 | `TODO` |
| MVP | EP-F06 Workspace | US-FE-20 | Section insert / delete / reorder | MUST | 3 | S4 | US-BE-19 | `TODO` |
| MVP | EP-F07 Versioning | US-FE-21 | Version history & restore | MUST | 5 | S4 | US-BE-20 | `TODO` |
| MVP | EP-F08 Review | US-FE-22 | Review screen | MUST | 8 | S4 | US-BE-21 | `TODO` |
| MVP | EP-F08 Review | US-FE-23 | Approval screen (reviewer, tiến độ approve) | MUST | 8 | S4 | US-BE-22 | `TODO` |
| MVP | EP-F09 Export | US-FE-24 | Export DOCX/PDF & export history | MUST | 5 | S4 | US-BE-23, US-BE-24 | `TODO` |
| MVP | EP-F10 Quality | US-FE-25 | E2E tests, a11y, deployment & CI/CD | MUST | 8 | S4 | US-BE-27 | `TODO` |
| P2 | EP-F11 Knowledge | US-FE-26 | Company knowledge library UI | MUST | 8 | — | US-BE-28 | `TODO` |
| P2 | EP-F12 Templates | US-FE-27 | Template builder & branding | SHOULD | 8 | — | US-BE-29 | `TODO` |
| P2 | EP-F07 Versioning | US-FE-28 | Version compare (diff view) | SHOULD | 5 | — | US-BE-30 | `TODO` |
| P2 | EP-F08 Review | US-FE-29 | Advanced review insights | SHOULD | 5 | — | US-BE-31 | `TODO` |
| P2 | EP-F13 Collaboration | US-FE-30 | Proposal roles & section comments | SHOULD | 5 | — | US-BE-32 | `TODO` |
| P2 | EP-F14 Integrations | US-FE-31 | CRM connect & import opportunity | COULD | 8 | — | US-BE-33 | `TODO` |
| P2 | EP-F15 SaaS | US-FE-32 | Plans, usage & AI cost dashboard | SHOULD | 8 | — | US-BE-34 | `TODO` |
| P2 | EP-F03 Documents | US-FE-33 | Additional formats & URL import | COULD | 5 | — | US-BE-35 | `TODO` |
| P3 | EP-F16 Enterprise | US-FE-34 | SSO login & IdP configuration | MUST | 5 | — | US-BE-36 | `TODO` |
| P3 | EP-F16 Enterprise | US-FE-35 | RBAC admin & approval matrix | MUST | 8 | — | US-BE-37 | `TODO` |
| P3 | EP-F16 Enterprise | US-FE-36 | Audit log viewer | SHOULD | 5 | — | US-BE-38 | `TODO` |
| P3 | EP-F16 Enterprise | US-FE-37 | Data residency & retention settings | SHOULD | 6 | — | US-BE-39 | `TODO` |
| P4 | EP-F17 Agents | US-FE-38 | Agent run console & human checkpoints | MUST | 13 | — | US-BE-42 | `TODO` |
| P4 | EP-F17 Agents | US-FE-39 | Architecture diagrams & compliance matrix | SHOULD | 8 | — | US-BE-43, US-BE-44 | `TODO` |
| P4 | EP-F17 Agents | US-FE-40 | Commercial estimation UI | COULD | 5 | — | US-BE-45 | `TODO` |
| P4 | EP-F18 Integrations | US-FE-41 | Jira/ADO & Teams/Slack settings | COULD | 5 | — | US-BE-46 | `TODO` |

### 1.3 Sprint gợi ý cho MVP (đồng bộ với Backend)

| Sprint | Trọng tâm FE | Demo |
|---|---|---|
| S1 | App shell, đăng ký/login, workspace switcher, thành viên & lời mời, dashboard, create proposal wizard | Đăng ký → mời đồng nghiệp → đồng nghiệp chấp nhận → tạo proposal → thấy trên dashboard |
| S2 | Upload, processing status, requirement review | Upload RFP → xem & duyệt requirement kèm nguồn |
| S3 | Outline, generation, proposal workspace, editor, evidence, AI actions | Generate proposal → edit → xem evidence |
| S4 | Reorder, version, review, approval, export, E2E, deploy | Review → approve → tải DOCX/PDF |

---

## 2. Open Decisions (Frontend)

| ID | Quyết định | Phương án | Ảnh hưởng story | Owner | Status |
|---|---|---|---|---|---|
| FDEC-01 | Rich text editor | TipTap (ProseMirror) — gợi ý; Lexical; Slate | US-FE-17 → US-FE-20 | | `TODO` |
| FDEC-02 | Định dạng lưu nội dung | JSON (TipTap) vs HTML — **phải thống nhất với DEC-06 backend** | US-FE-17 | | `TODO` |
| FDEC-03 | Cơ chế session | Backend (DEC-01) trả `accessToken` 15' + `refreshToken` 14 ngày trong JSON body. Chọn: HttpOnly cookie qua Next.js BFF route (gợi ý) vs access token trong memory + refresh token cookie | US-FE-02, US-FE-42, US-FE-43 | | `TODO` |
| FDEC-04 | Next.js routing | App Router (gợi ý) — Server Components cho trang đọc, Client Components cho editor | US-FE-01 | | `TODO` |
| FDEC-05 | Theo dõi job async | Polling (TanStack Query `refetchInterval`) vs SSE | US-FE-09, US-FE-10, US-FE-15 | | `TODO` |
| FDEC-06 | Ngôn ngữ UI | Chỉ tiếng Anh ở MVP hay i18n (EN/VI) — spec không nêu | US-FE-01 | | `TODO` |
| FDEC-07 | PDF viewer cho source viewer | `react-pdf` (pdf.js) vs hiển thị text chunk | US-FE-13 | | `TODO` |

---

# PHASE MVP (Phase 1)

## EP-F01 — Foundation

### US-FE-01 — Project bootstrap & app shell

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** developer, **tôi muốn** có dự án Next.js chuẩn hóa với layout, design system và tooling, **để** team phát triển UI nhất quán. |
| Priority / SP / Sprint | MUST / 5 / S1 |
| Spec ref | §23 Frontend, §43, TASK-001 |
| BE Dep | US-BE-01 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Given repo FE, When chạy `npm run build` và `npm run test`, Then pass.
- [ ] **AC2** — App shell có sidebar (Dashboard, Proposals, Knowledge*, Settings), top bar (workspace switcher, user menu), khu vực nội dung. (*Knowledge ẩn tới Phase 2.)
- [ ] **AC3** — Tailwind + shadcn/ui được cấu hình; có theme token (màu, spacing, typography) và dark mode tùy chọn.
- [ ] **AC4** — Biến môi trường (`NEXT_PUBLIC_API_BASE_URL`, …) validate bằng Zod khi khởi động; không có secret phía client.
- [ ] **AC5** — Trang gọi `GET /actuator/health` qua API client hiển thị trạng thái backend (dev only).

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-01.1 | Khởi tạo Next.js (App Router) + TypeScript strict | Build pass | 1 | — | | `TODO` |
| FE-01.2 | Cài Tailwind, shadcn/ui, lucide icons, theme tokens | AC3 | 2 | — | | `TODO` |
| FE-01.3 | ESLint, Prettier, Husky + lint-staged | Lint pass trên pre-commit | 1 | — | | `TODO` |
| FE-01.4 | Vitest + RTL + MSW (mock API) + Playwright setup | Test mẫu pass | 3 | — | | `TODO` |
| FE-01.5 | Env schema (Zod) | AC4 | 1 | — | | `TODO` |
| FE-01.6 | App shell layout: sidebar, top bar, breadcrumb | AC2 | 4 | — | | `TODO` |
| FE-01.7 | Cấu trúc thư mục feature-based (`features/proposals`, `features/documents`, …) + README | Tài liệu ngắn | 1 | — | | `TODO` |
| FE-01.8 | CI: lint, typecheck, test, build | Pipeline xanh | 2 | — | | `TODO` |

---

### US-FE-02 — Login / logout / protected routes

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người dùng, **tôi muốn** đăng nhập và đăng xuất an toàn, **để** chỉ tôi truy cập proposal của mình. |
| Priority / SP / Sprint | MUST / 5 / S1 |
| Spec ref | FR-01, §4 |
| BE Dep | US-BE-02, FDEC-03 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Given chưa đăng nhập, When truy cập route bất kỳ trong app, Then chuyển về `/login` kèm `returnUrl` (chỉ cho phép URL nội bộ — chống open redirect).
- [ ] **AC2** — Form login validate email/password bằng Zod; lỗi 401 hiển thị thông báo chung "Email hoặc mật khẩu không đúng".
- [ ] **AC3** — Đăng nhập thành công → về `returnUrl` hoặc Dashboard.
- [ ] **AC4** — Logout xóa session, cache TanStack Query và chuyển về `/login`.
- [ ] **AC5** — Token hết hạn → tự refresh (nếu có) hoặc về login, không mất dữ liệu đang soạn chưa lưu mà không cảnh báo.
- [ ] **AC6** — Token không lưu trong `localStorage`/`sessionStorage`.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-02.1 | Trang `/login` (RHF + Zod) | AC2 | 3 | — | | `TODO` |
| FE-02.2 | Session handling theo FDEC-03 (BFF route handler / cookie) | AC3, AC6 | 4 | US-BE-02 | | `TODO` |
| FE-02.3 | Middleware bảo vệ route + safe `returnUrl` | AC1 | 2 | — | | `TODO` |
| FE-02.4 | Logout + clear cache | AC4 | 1 | — | | `TODO` |
| FE-02.5 | Xử lý 401 toàn cục + refresh | AC5 | 2 | FE-04.1 | | `TODO` |
| FE-02.6 | Tests (component + E2E login/logout) | Pass | 3 | — | | `TODO` |

---

### US-FE-03 — User profile & workspace switcher

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người dùng thuộc nhiều workspace, **tôi muốn** xem profile và chuyển workspace, **để** làm việc đúng ngữ cảnh công ty/team. |
| Priority / SP / Sprint | MUST / 5 / S1 |
| Spec ref | FR-01, FR-02 · spec `US-BE-03-workspace-membership.md` (D3) |
| BE Dep | US-BE-02, US-BE-03 (`GET /api/me`, `GET /api/workspaces`) |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — User menu hiển thị tên, email, workspace hiện tại + role (OWNER/MEMBER); trang `/profile` hiển thị thông tin từ `GET /api/me`.
- [ ] **AC2** — Workspace switcher liệt kê `workspaces` từ `GET /api/me` (tên + role); chuyển workspace → reset cache TanStack Query và điều hướng về Dashboard.
- [ ] **AC3** — Workspace đang chọn được lưu (cookie hoặc URL segment) và giữ khi reload; API client gửi header **`X-Workspace-Id`** cho mọi request dữ liệu.
- [ ] **AC4** — Workspace đã chọn không còn hợp lệ (API trả `404` — bị xóa khỏi workspace) → tự chuyển về workspace đầu tiên còn lại và hiện thông báo; không còn workspace nào → trang "Bạn chưa thuộc workspace nào".
- [ ] **AC5** — Lần đầu đăng nhập/đăng ký: chọn mặc định workspace trả về từ đăng ký (`workspaceId`) hoặc workspace đầu tiên.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-03.1 | `useCurrentUser` hook + user menu + trang profile | AC1 | 2 | US-BE-02 | | `TODO` |
| FE-03.2 | Workspace context (store + persist) + switcher | AC2, AC3, AC5 | 3 | US-BE-03 | | `TODO` |
| FE-03.3 | API client gắn `X-Workspace-Id`; xử lý workspace không hợp lệ (404) + empty state | AC3, AC4 | 2 | FE-04.1 | | `TODO` |
| FE-03.4 | Tests (switch, reload, workspace bị gỡ) | Pass | 2 | — | | `TODO` |

---

### US-FE-04 — API client, error handling & shared UI states

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** developer, **tôi muốn** một API client có type và cách xử lý lỗi thống nhất, **để** mọi màn hình phản hồi lỗi nhất quán. |
| Priority / SP / Sprint | MUST / 5 / S1 |
| Spec ref | §25 |
| BE Dep | US-BE-04 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Type API sinh từ OpenAPI backend (`openapi-typescript`) — không định nghĩa type tay trùng lặp.
- [ ] **AC2** — Lỗi Problem Details được map: 400 → lỗi field trên form; 401 → login; 403/404 → trang "Không tìm thấy hoặc không có quyền"; 409 → thông báo trạng thái; 5xx → toast kèm `traceId`.
- [ ] **AC3** — Component dùng chung: `LoadingState`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `StatusBadge`, toast.
- [ ] **AC4** — Error boundary toàn cục + trang 404/500.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-04.1 | API client (fetch wrapper) + workspace header + TanStack Query provider | AC1 | 3 | US-BE-01 | | `TODO` |
| FE-04.2 | Script generate types từ OpenAPI | AC1 | 1 | US-BE-01 | | `TODO` |
| FE-04.3 | Error mapper + form error binding | AC2 | 3 | US-BE-04 | | `TODO` |
| FE-04.4 | Shared state components + error boundary | AC3, AC4 | 3 | — | | `TODO` |
| FE-04.5 | Tests | Pass | 2 | — | | `TODO` |

---

### US-FE-42 — Đăng ký tài khoản

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người dùng mới, **tôi muốn** tự đăng ký tài khoản và có ngay workspace riêng, **để** bắt đầu làm proposal mà không cần chờ ai tạo tài khoản. |
| Priority / SP / Sprint | MUST / 5 / S1 |
| Spec ref | FR-01 · spec `US-BE-03-workspace-membership.md` (D1, BR-01–BR-03, BR-10) |
| BE Dep | US-BE-03 (`POST /api/auth/register`) |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Trang `/register` (link từ `/login` và ngược lại) có: Email, Họ tên hiển thị, Mật khẩu, Xác nhận mật khẩu, Tên workspace (tùy chọn, placeholder "<Tên>'s workspace").
- [ ] **AC2** — Validate phía client bằng Zod khớp backend: email hợp lệ; mật khẩu **12–128 ký tự**, không trùng email, xác nhận khớp; tên hiển thị ≤ 200; tên workspace ≤ 200. Có chỉ báo độ dài mật khẩu.
- [ ] **AC3** — Thành công (`201`) → lưu session như login (FDEC-03), chọn workspace `workspaceId` trả về, chuyển tới Dashboard kèm lời chào.
- [ ] **AC4** — Lỗi: `409` → "Email đã được đăng ký" + link Đăng nhập; `400` → lỗi theo field; `429` → thông báo thử lại sau (dùng `Retry-After`).
- [ ] **AC5** — Người đã đăng nhập truy cập `/register` → chuyển về Dashboard. Mật khẩu không bao giờ được log hay lưu vào storage.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-42.1 | Trang `/register` + form (RHF + Zod schema dùng chung với backend rules) | AC1, AC2 | 3 | — | | `TODO` |
| FE-42.2 | Gọi API, lưu session, chọn workspace mặc định, redirect | AC3, AC5 | 2 | US-BE-03, FE-02.2 | | `TODO` |
| FE-42.3 | Map lỗi 400/409/429 | AC4 | 1 | FE-04.3 | | `TODO` |
| FE-42.4 | Tests (component + E2E đăng ký → dashboard) | Pass | 2 | — | | `TODO` |

---

### US-FE-43 — Chấp nhận lời mời (link mời)

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người được mời, **tôi muốn** mở link mời để xem mình được mời vào workspace nào và tham gia (đăng nhập hoặc đăng ký), **để** cùng làm proposal với team. |
| Priority / SP / Sprint | MUST / 5 / S1 |
| Spec ref | spec `US-BE-03-workspace-membership.md` (BR-04, BR-07, BR-08) |
| BE Dep | US-BE-03 (`POST /api/invitations/lookup`, `POST /api/invitations/accept`, `POST /api/auth/register` + `invitationToken`) |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Route `/invitations/accept?token=...` (khớp `APP_FRONTEND_BASE_URL` backend): đọc token rồi **xóa token khỏi URL** (`history.replaceState`) và giữ trong memory/sessionStorage trong suốt luồng; không log URL chứa token.
- [ ] **AC2** — Gọi `lookup` → hiển thị tên workspace, email được mời, role, hạn. Token không hợp lệ/hết hạn/đã dùng (`404`) → trang lỗi chung "Lời mời không còn hiệu lực" + gợi ý liên hệ người mời.
- [ ] **AC3** — Chưa đăng nhập: 2 lựa chọn **Đăng nhập** (email điền sẵn) hoặc **Tạo tài khoản** (form đăng ký với email khóa theo lời mời, gửi kèm `invitationToken`, không có ô tên workspace). Sau khi đăng nhập quay lại đúng luồng chấp nhận.
- [ ] **AC4** — Đã đăng nhập với **đúng email** → nút "Tham gia workspace" gọi `accept` → chọn workspace đó làm hiện tại và chuyển về Dashboard.
- [ ] **AC5** — Đã đăng nhập với **email khác** → cảnh báo rõ (email được mời vs email hiện tại) + nút Đăng xuất để đăng nhập tài khoản đúng; `403` từ API hiển thị cùng thông điệp.
- [ ] **AC6** — `409` (đã là thành viên) → thông báo và nút "Mở workspace".

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-43.1 | Route accept + xử lý token an toàn + lookup | AC1, AC2 | 2 | US-BE-03 | | `TODO` |
| FE-43.2 | Nhánh chưa đăng nhập: login/register có `invitationToken`, returnUrl | AC3 | 3 | FE-42.1, FE-02.3 | | `TODO` |
| FE-43.3 | Nhánh đã đăng nhập: accept, sai email, đã là thành viên | AC4, AC5, AC6 | 2 | US-BE-03 | | `TODO` |
| FE-43.4 | Tests (E2E: mời → đăng ký bằng link → vào workspace; sai email) | Pass | 3 | — | | `TODO` |

---

## EP-F19 — Workspace & Team

### US-FE-44 — Quản lý thành viên & lời mời

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** OWNER của workspace, **tôi muốn** mời đồng nghiệp, xem lời mời đang chờ, đổi vai trò và gỡ thành viên, **để** quản lý ai được truy cập dữ liệu proposal của team. |
| Priority / SP / Sprint | MUST / 8 / S1 |
| Spec ref | spec `US-BE-03-workspace-membership.md` (D2, D4, BR-04–BR-06, BR-09) |
| BE Dep | US-BE-03 (`/api/workspaces/{id}/members`, `/api/workspaces/{id}/invitations`) |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Trang `Settings › Members` (`/settings/members`) cho workspace hiện tại: bảng thành viên (tên, email, role, ngày tham gia); mọi thành viên đều xem được.
- [ ] **AC2** — **Chỉ OWNER** thấy: nút "Mời thành viên", tab "Lời mời đang chờ", menu đổi role / gỡ thành viên. MEMBER không thấy các control này (và UI xử lý `403` nếu có).
- [ ] **AC3** — Dialog mời: email + role (MEMBER/OWNER). Thành công → hiển thị **link mời một lần** với nút Copy và ghi chú "Link hết hạn sau 7 ngày, chỉ hiển thị lần này — hãy gửi cho người được mời" (MVP chưa gửi email). Mời lại cùng email → cảnh báo lời mời cũ sẽ bị thay thế. `409` → "Người này đã là thành viên".
- [ ] **AC4** — Tab lời mời đang chờ: email, role, ngày tạo, hạn; nút **Thu hồi** có ConfirmDialog; không bao giờ hiển thị lại token/link.
- [ ] **AC5** — Đổi role và gỡ thành viên có ConfirmDialog; lỗi `409` (OWNER cuối cùng) hiển thị "Workspace phải có ít nhất một OWNER"; danh sách tự refresh sau thao tác.
- [ ] **AC6** — Email/tên hiển thị được escape (không render HTML).

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-44.1 | Trang Members + bảng thành viên + điều hướng Settings | AC1, AC6 | 3 | US-BE-03 | | `TODO` |
| FE-44.2 | `useWorkspaceRole` + ẩn/hiện control theo role | AC2 | 1 | FE-03.2 | | `TODO` |
| FE-44.3 | Dialog mời + hiển thị/copy link một lần | AC3 | 3 | US-BE-03 | | `TODO` |
| FE-44.4 | Tab lời mời đang chờ + thu hồi | AC4 | 2 | US-BE-03 | | `TODO` |
| FE-44.5 | Đổi role / gỡ thành viên + xử lý 409 | AC5 | 2 | US-BE-03 | | `TODO` |
| FE-44.6 | Tests (OWNER vs MEMBER, mời, thu hồi, owner cuối) | Pass | 3 | — | | `TODO` |

---

### US-FE-45 — Cài đặt workspace (đổi tên, rời workspace)

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** thành viên workspace, **tôi muốn** xem/đổi tên workspace (OWNER) và rời workspace, **để** quản lý không gian làm việc của mình. |
| Priority / SP / Sprint | MUST / 3 / S1 |
| Spec ref | spec `US-BE-03-workspace-membership.md` (D4, BR-03, BR-09) |
| BE Dep | US-BE-03 (`PATCH /api/workspaces/{id}`, `DELETE /api/workspaces/{id}/members/{userId}`) |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Trang `Settings › General` (`/settings/workspace`): tên workspace, ngày tạo, role của tôi.
- [ ] **AC2** — OWNER đổi tên (1–200 ký tự, trim); tên mới cập nhật ngay trên switcher và header. MEMBER chỉ xem.
- [ ] **AC3** — "Rời workspace" (mọi role) có ConfirmDialog; thành công → bỏ workspace khỏi switcher, chuyển sang workspace khác (US-FE-03 AC4). OWNER cuối cùng → `409` → hướng dẫn chuyển quyền OWNER cho người khác trước.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-45.1 | Trang General + form đổi tên | AC1, AC2 | 2 | US-BE-03 | | `TODO` |
| FE-45.2 | Rời workspace + xử lý 409 | AC3 | 2 | FE-03.3 | | `TODO` |
| FE-45.3 | Tests | Pass | 1 | — | | `TODO` |

---

## EP-F02 — Proposal Management

### US-FE-05 — Dashboard — danh sách proposal

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** Solution Architect, **tôi muốn** xem tất cả proposal với trạng thái và thời gian cập nhật, **để** biết việc cần làm tiếp. |
| Priority / SP / Sprint | MUST / 5 / S1 |
| Spec ref | §29 Screen 1 |
| BE Dep | US-BE-05 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Hiển thị danh sách: tên, khách hàng, status badge, deadline, "Updated x giờ trước".
- [ ] **AC2** — Tìm kiếm theo tên/khách hàng, filter theo status, sort theo updated/deadline, phân trang.
- [ ] **AC3** — Nút "+ New Proposal" mở wizard; click proposal → mở màn hình phù hợp với status (vd. `REQUIREMENTS_REVIEW` → tab Requirements).
- [ ] **AC4** — Empty state hướng dẫn tạo proposal đầu tiên.
- [ ] **AC5** — Deadline sắp đến (≤ 3 ngày) được highlight.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-05.1 | `useProposals` query (pagination, filter, sort) | AC2 | 2 | US-BE-05 | | `TODO` |
| FE-05.2 | Proposal list/table + status badge + relative time | AC1, AC5 | 3 | — | | `TODO` |
| FE-05.3 | Search/filter bar (sync URL params) | AC2 | 2 | — | | `TODO` |
| FE-05.4 | Điều hướng theo status + empty state | AC3, AC4 | 2 | — | | `TODO` |
| FE-05.5 | Tests | Pass | 2 | — | | `TODO` |

---

### US-FE-06 — Create Proposal wizard

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** Solution Architect, **tôi muốn** tạo proposal qua wizard từng bước, **để** nhập đủ thông tin khách hàng, tài liệu và template. |
| Priority / SP / Sprint | MUST / 8 / S1 |
| Spec ref | FR-03, §29 Screen 2 |
| BE Dep | US-BE-05, US-BE-14 (bước Documents dùng US-BE-07 — S2) |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Wizard 5 bước: **1. Basic Info → 2. Documents → 3. Company Knowledge → 4. Template → 5. Generate**; có stepper, Back/Next.
- [ ] **AC2** — Bước 1 có field bắt buộc: Proposal name, Customer name, Customer industry, Opportunity description, Deadline, Language, Currency, Template; field optional: Customer website, Account manager, Solution architect, Sales owner, Opportunity value, Internal notes.
- [ ] **AC3** — Validate bằng Zod (URL hợp lệ, deadline ≥ hôm nay, currency ISO); không Next khi bước hiện tại lỗi.
- [ ] **AC4** — Proposal được tạo (`POST /api/proposals`) khi hoàn thành bước 1 → các bước sau gắn với proposal đã có (không mất dữ liệu khi thoát giữa chừng).
- [ ] **AC5** — Bước 2 & 3 tái sử dụng component upload (US-FE-08) với category mặc định (customer vs company).
- [ ] **AC6** — Bước 5 hiển thị tóm tắt và nút "Analyze documents" (bắt đầu US-FE-10), **không** có nút "Generate whole proposal" một chạm (theo §46).

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-06.1 | Wizard framework (stepper, state, route `/proposals/new`) | AC1 | 3 | — | | `TODO` |
| FE-06.2 | Bước 1 Basic Info form + Zod schema | AC2, AC3 | 4 | US-BE-05 | | `TODO` |
| FE-06.3 | Tạo proposal sau bước 1 + resume wizard | AC4 | 2 | US-BE-05 | | `TODO` |
| FE-06.4 | Bước 2/3 nhúng DocumentUploader | AC5 | 2 | FE-08.1 | | `TODO` |
| FE-06.5 | Bước 4 chọn template (preview danh sách section) | AC2 | 2 | US-BE-14 | | `TODO` |
| FE-06.6 | Bước 5 Summary + Analyze CTA | AC6 | 2 | US-BE-11 | | `TODO` |
| FE-06.7 | Tests (validation, navigation, resume) | Pass | 3 | — | | `TODO` |

---

### US-FE-07 — Proposal overview, edit metadata, delete & status stepper

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** proposal owner, **tôi muốn** xem tổng quan proposal, trạng thái vòng đời và chỉnh thông tin, **để** biết proposal đang ở bước nào. |
| Priority / SP / Sprint | MUST / 5 / S1 |
| Spec ref | §4, §5, FR-03 |
| BE Dep | US-BE-05, US-BE-06 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Trang `/proposals/[id]` có header (tên, khách hàng, status) và tabs: Overview, Documents, Requirements, Proposal, Review, Exports.
- [ ] **AC2** — Lifecycle stepper hiển thị các trạng thái §5; trạng thái `FAILED` hiển thị lỗi + nút **Retry**.
- [ ] **AC3** — Edit metadata qua dialog/form; lỗi 409 hiển thị rõ.
- [ ] **AC4** — Delete chỉ hiển thị khi `DRAFT`, có ConfirmDialog.
- [ ] **AC5** — Tabs không khả dụng theo trạng thái được disable kèm tooltip giải thích.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-07.1 | Proposal layout + tabs routing | AC1, AC5 | 3 | US-BE-05 | | `TODO` |
| FE-07.2 | Lifecycle stepper + Retry | AC2 | 3 | US-BE-06 | | `TODO` |
| FE-07.3 | Edit metadata dialog | AC3 | 2 | US-BE-05 | | `TODO` |
| FE-07.4 | Delete draft | AC4 | 1 | US-BE-05 | | `TODO` |
| FE-07.5 | Tests | Pass | 2 | — | | `TODO` |

---

## EP-F03 — Document Management

### US-FE-08 — Document upload

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** Presales Engineer, **tôi muốn** kéo-thả nhiều tài liệu và chọn category, **để** đưa RFP và tài liệu công ty vào hệ thống nhanh. |
| Priority / SP / Sprint | MUST / 5 / S2 |
| Spec ref | §7.1, §7.2 |
| BE Dep | US-BE-07 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Drag & drop hoặc chọn file; hỗ trợ nhiều file; chỉ chấp nhận PDF, DOCX, TXT, MD.
- [ ] **AC2** — Kiểm tra phía client: định dạng và dung lượng (theo giới hạn backend) — báo lỗi từng file trước khi upload.
- [ ] **AC3** — Mỗi file chọn category (§7.2) — mặc định `RFP` ở bước Documents, `COMPANY_PROFILE` ở bước Company Knowledge.
- [ ] **AC4** — Hiển thị progress từng file; cho phép hủy; lỗi 413/415/503 hiển thị thông điệp cụ thể, `422` = file nhiễm malware (không cho retry), `409` = proposal đang ở trạng thái không cho thêm tài liệu; retry file lỗi 503.
- [ ] **AC5** — Tên file hiển thị được escape (không render HTML).

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-08.1 | `DocumentUploader` component (dropzone, danh sách file chờ) | AC1, AC5 | 3 | — | | `TODO` |
| FE-08.2 | Client validation + category select | AC2, AC3 | 2 | — | | `TODO` |
| FE-08.3 | Upload với progress/cancel (XHR/axios) + retry | AC4 | 3 | US-BE-07 | | `TODO` |
| FE-08.4 | Tests | Pass | 2 | — | | `TODO` |

---

### US-FE-09 — Document list & processing status

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người dùng, **tôi muốn** thấy trạng thái xử lý từng tài liệu, **để** biết khi nào có thể phân tích requirement. |
| Priority / SP / Sprint | MUST / 5 / S2 |
| Spec ref | §7.3, §25 Documents |
| BE Dep | US-BE-07, US-BE-08, US-BE-09 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Tab Documents liệt kê: tên, category, dung lượng, người upload, thời gian, processing status (`UPLOADED`, `EXTRACTING`, `CHUNKING`, `EMBEDDING`, `READY`, `FAILED`, `REJECTED`).
- [ ] **AC2** — Trạng thái tự cập nhật (polling/SSE theo FDEC-05), dừng polling khi tất cả ở trạng thái cuối.
- [ ] **AC3** — `FAILED` hiển thị lý do + nút Reprocess; `REJECTED` (malware) không cho reprocess.
- [ ] **AC4** — Xóa tài liệu có ConfirmDialog, cảnh báo requirement liên quan có thể mất nguồn; nút xóa chỉ hiện với người upload hoặc OWNER (BE trả `403` cho người khác).
- [ ] **AC5** — Nhóm tài liệu theo Customer vs Company knowledge.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-09.1 | Document table + grouping | AC1, AC5 | 3 | US-BE-07 | | `TODO` |
| FE-09.2 | Status polling hook | AC2 | 2 | US-BE-08 | | `TODO` |
| FE-09.3 | Reprocess / delete actions | AC3, AC4 | 2 | US-BE-08 | | `TODO` |
| FE-09.4 | Tests | Pass | 2 | — | | `TODO` |

---

## EP-F04 — Requirement Analysis & Review

### US-FE-10 — Trigger requirement analysis & progress

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** Solution Architect, **tôi muốn** bắt đầu phân tích tài liệu và theo dõi tiến độ, **để** biết khi nào requirement sẵn sàng review. |
| Priority / SP / Sprint | MUST / 3 / S2 |
| Spec ref | §8, §12 |
| BE Dep | US-BE-11 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Nút "Analyze documents" chỉ bật khi có ≥1 tài liệu customer `READY`.
- [ ] **AC2** — Trong `ANALYZING` hiển thị progress (theo tài liệu/batch) và cho phép rời trang; quay lại vẫn thấy tiến độ.
- [ ] **AC3** — Xong → thông báo và chuyển sang tab Requirements; lỗi → hiển thị lý do + Retry.
- [ ] **AC4** — Chạy lại phân tích cảnh báo: requirement đã confirm/edit sẽ được giữ nguyên.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-10.1 | Analyze CTA + điều kiện enable | AC1, AC4 | 2 | US-BE-11 | | `TODO` |
| FE-10.2 | Progress panel (polling) + notifications | AC2, AC3 | 3 | US-BE-11 | | `TODO` |
| FE-10.3 | Tests | Pass | 1 | — | | `TODO` |

---

### US-FE-11 — Requirement review table & actions

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** Solution Architect, **tôi muốn** duyệt từng requirement (confirm, reject, edit, đánh dấu assumption, đặt câu hỏi, thêm mới), **để** chỉ requirement đã xác nhận được dùng trong proposal. |
| Priority / SP / Sprint | MUST / 8 / S2 |
| Spec ref | §9, TASK-006 |
| BE Dep | US-BE-13 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Bảng cột: ID, Requirement, Category, Priority, Source (tài liệu + trang, click được), Confidence, Status.
- [ ] **AC2** — Filter theo category/priority/status; sort; search text; hiển thị số lượng theo status.
- [ ] **AC3** — Action từng dòng: **Confirm, Reject (bắt buộc lý do), Edit (inline/dialog), Mark as assumption, Ask clarification, Link to source**.
- [ ] **AC4** — Chọn nhiều dòng → bulk Confirm/Reject.
- [ ] **AC5** — Confidence thấp (< ngưỡng cấu hình, vd. 0.7) và priority `UNKNOWN` được highlight để ưu tiên review.
- [ ] **AC6** — Thêm requirement thủ công (nhãn `USER_PROVIDED`).
- [ ] **AC7** — Nút "Continue to outline" bị chặn khi còn requirement `MUST` chưa review; hiển thị danh sách và cho phép override kèm xác nhận.
- [ ] **AC8** — Optimistic update có rollback khi API lỗi.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-11.1 | Requirement table (TanStack Table) + filter/sort/search | AC1, AC2, AC5 | 5 | US-BE-13 | | `TODO` |
| FE-11.2 | Row actions + dialogs (reject reason, edit, ask clarification) | AC3 | 4 | US-BE-13 | | `TODO` |
| FE-11.3 | Bulk actions | AC4 | 2 | US-BE-13 | | `TODO` |
| FE-11.4 | Add requirement dialog | AC6 | 2 | US-BE-13 | | `TODO` |
| FE-11.5 | Readiness gate + override | AC7 | 2 | US-BE-13 | | `TODO` |
| FE-11.6 | Optimistic updates | AC8 | 1 | — | | `TODO` |
| FE-11.7 | Tests (component + E2E review flow) | Pass | 3 | — | | `TODO` |

---

### US-FE-12 — Questions / Assumptions / Conflicts tabs

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** Solution Architect, **tôi muốn** xem riêng câu hỏi mở, giả định và mâu thuẫn, **để** chuẩn bị làm rõ với khách hàng. |
| Priority / SP / Sprint | MUST / 5 / S2 |
| Spec ref | §9, §29 Screen 3 |
| BE Dep | US-BE-12 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Tab Requirements có sub-tabs: **Requirements | Questions | Assumptions | Conflicts** kèm badge số lượng.
- [ ] **AC2** — Assumption do AI đề xuất có nhãn "Proposed by AI" và action Accept/Reject; không tự trở thành requirement.
- [ ] **AC3** — Conflict hiển thị các requirement liên quan cạnh nhau, link tới nguồn.
- [ ] **AC4** — Questions có thể ghi câu trả lời và export danh sách (copy/CSV) để gửi khách hàng.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-12.1 | Sub-tabs + counts | AC1 | 1 | US-BE-12 | | `TODO` |
| FE-12.2 | Assumptions list + actions | AC2 | 2 | US-BE-12 | | `TODO` |
| FE-12.3 | Conflicts side-by-side view | AC3 | 3 | US-BE-12 | | `TODO` |
| FE-12.4 | Questions list + answer + export CSV | AC4 | 3 | US-BE-12 | | `TODO` |
| FE-12.5 | Tests | Pass | 2 | — | | `TODO` |

---

### US-FE-13 — Source viewer

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** reviewer, **tôi muốn** click vào nguồn để xem đoạn gốc trong tài liệu, **để** kiểm chứng requirement/claim. |
| Priority / SP / Sprint | MUST / 5 / S2 |
| Spec ref | §8 sourceLocation, §37 (1) |
| BE Dep | US-BE-08, US-BE-11, FDEC-07 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Click source mở drawer: tên tài liệu, trang/section, đoạn text của chunk với phần liên quan được highlight.
- [ ] **AC2** — Có thể mở tài liệu gốc tại trang tương ứng (theo FDEC-07).
- [ ] **AC3** — Nội dung tài liệu được render **dưới dạng text** (không thực thi HTML/script).
- [ ] **AC4** — Component tái sử dụng cho Requirements, Evidence panel và Review.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-13.1 | `SourceDrawer` component + highlight | AC1, AC3, AC4 | 4 | US-BE-11 | | `TODO` |
| FE-13.2 | Mở tài liệu gốc tại trang | AC2 | 3 | FDEC-07 | | `TODO` |
| FE-13.3 | Tests (XSS payload trong chunk) | Pass | 1 | — | | `TODO` |

---

## EP-F05 — Outline & Generation

### US-FE-14 — Outline generation & requirement mapping

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** Solution Architect, **tôi muốn** xem outline do AI đề xuất, requirement được map vào section nào và thông tin còn thiếu, **để** chỉnh kế hoạch trước khi viết. |
| Priority / SP / Sprint | MUST / 8 / S3 |
| Spec ref | §11, §12, §13 Agent 3, TASK-007 |
| BE Dep | US-BE-15 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Nút "Generate outline" → hiển thị danh sách section theo thứ tự, mỗi section có số requirement được map và badge "Missing inputs".
- [ ] **AC2** — Mở section → xem requirement được map, required evidence, missing inputs.
- [ ] **AC3** — Kéo-thả hoặc chọn để đổi mapping requirement ↔ section; danh sách **Unmapped requirements** luôn hiển thị.
- [ ] **AC4** — Section yêu cầu input người dùng (vd. Commercial Overview) được đánh dấu "Input required — AI sẽ không tự sinh giá".
- [ ] **AC5** — Từ missing input có thể nhập thông tin bổ sung (lưu là `USER_PROVIDED`) hoặc upload tài liệu.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-14.1 | Outline view + generate CTA | AC1 | 3 | US-BE-15 | | `TODO` |
| FE-14.2 | Section detail panel | AC2, AC4 | 3 | US-BE-15 | | `TODO` |
| FE-14.3 | Mapping editor (dnd-kit) + unmapped list | AC3 | 5 | US-BE-15 | | `TODO` |
| FE-14.4 | Missing input form | AC5 | 2 | US-BE-15 | | `TODO` |
| FE-14.5 | Tests | Pass | 2 | — | | `TODO` |

---

### US-FE-15 — Generate proposal sections với progress

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** Solution Architect, **tôi muốn** generate từng section hoặc lần lượt tất cả với tiến độ hiển thị, **để** kiểm soát quá trình sinh nội dung. |
| Priority / SP / Sprint | MUST / 5 / S3 |
| Spec ref | §12, TASK-008 |
| BE Dep | US-BE-17 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Có thể generate một section hoặc "Generate all sections" (backend chạy tuần tự).
- [ ] **AC2** — Progress hiển thị trạng thái từng section (`PENDING`, `GENERATING`, `DONE`, `FAILED`); section xong hiển thị ngay.
- [ ] **AC3** — Section lỗi có Retry riêng, không ảnh hưởng section khác.
- [ ] **AC4** — Section đã generate và input không đổi hiển thị "Up to date" (không gọi lại).

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-15.1 | Generate actions (single/all) | AC1, AC4 | 2 | US-BE-17 | | `TODO` |
| FE-15.2 | Progress tracker per section (polling) | AC2, AC3 | 3 | US-BE-17 | | `TODO` |
| FE-15.3 | Tests | Pass | 2 | — | | `TODO` |

---

## EP-F06 — Proposal Workspace & Editor

### US-FE-16 — Proposal Workspace 3-column layout

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người dùng, **tôi muốn** một workspace gồm danh sách section, editor và evidence, **để** viết và kiểm chứng trên cùng một màn hình. |
| Priority / SP / Sprint | MUST / 5 / S3 |
| Spec ref | §29 Screen 4 |
| BE Dep | US-BE-15 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Layout 3 cột: **Sections | Editor | Evidence**; cột trái/phải thu gọn được; kích thước có thể resize.
- [ ] **AC2** — Section list hiển thị trạng thái (not generated, generated, edited, có issue) và số unsupported claims.
- [ ] **AC3** — Chọn section → editor & evidence cập nhật; URL chứa `sectionId` (deep link).
- [ ] **AC4** — Keyboard shortcut chuyển section (↑/↓ với modifier).

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-16.1 | Resizable 3-panel layout | AC1 | 3 | — | | `TODO` |
| FE-16.2 | Section navigator + status indicators | AC2, AC3 | 3 | US-BE-15 | | `TODO` |
| FE-16.3 | Shortcuts + tests | AC4 | 2 | — | | `TODO` |

---

### US-FE-17 — Rich text editor & autosave

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người dùng, **tôi muốn** chỉnh sửa nội dung section như trình soạn thảo văn bản, **để** hoàn thiện proposal mà không cần công cụ khác. |
| Priority / SP / Sprint | MUST / 8 / S3 |
| Spec ref | §18 |
| BE Dep | US-BE-19, FDEC-01, FDEC-02 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Hỗ trợ: headings, bold/italic, bullet/numbered list, tables (thêm/xóa hàng cột), links, inline editing.
- [ ] **AC2** — Autosave (debounce ~2s) + chỉ báo "Saving… / Saved / Error"; Ctrl/Cmd+S lưu ngay.
- [ ] **AC3** — Xung đột 409 (optimistic lock) → hiển thị dialog: reload bản mới hoặc giữ bản của tôi (tạo revision).
- [ ] **AC4** — Cảnh báo khi rời trang có thay đổi chưa lưu.
- [ ] **AC5** — Marker `[ASSUMPTION]` và `[INPUT REQUIRED]` được render nổi bật (chip màu) và có thể click để xử lý.
- [ ] **AC6** — Paste từ Word/web được làm sạch (chỉ giữ định dạng được hỗ trợ).
- [ ] **AC7** — Editor read-only khi proposal ở `APPROVAL_PENDING`/`APPROVED` (hiển thị lý do).

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-17.1 | Tích hợp editor (FDEC-01) + toolbar | AC1 | 5 | FDEC-01 | | `TODO` |
| FE-17.2 | Custom node/mark cho marker & claim | AC5 | 4 | US-BE-17 | | `TODO` |
| FE-17.3 | Autosave + optimistic lock handling | AC2, AC3 | 4 | US-BE-19 | | `TODO` |
| FE-17.4 | Unsaved-changes guard | AC4 | 1 | — | | `TODO` |
| FE-17.5 | Paste sanitization | AC6 | 2 | — | | `TODO` |
| FE-17.6 | Read-only mode theo status | AC7 | 1 | US-BE-06 | | `TODO` |
| FE-17.7 | Tests | Pass | 3 | — | | `TODO` |

---

### US-FE-18 — Evidence panel & claim labeling

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** reviewer, **tôi muốn** thấy mỗi claim quan trọng được hỗ trợ bởi nguồn nào và loại nguồn gì, **để** tin tưởng hoặc sửa nội dung. |
| Priority / SP / Sprint | MUST / 8 / S3 |
| Spec ref | §16, §17, §18 Sources, §37 (1) |
| BE Dep | US-BE-17 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Evidence panel liệt kê sources của section (vd. "RFP.pdf — Page 14", "Company Security Guide — Section 3").
- [ ] **AC2** — Hover/chọn claim trong editor → highlight evidence tương ứng và ngược lại.
- [ ] **AC3** — Claim được gắn nhãn màu theo loại: `CUSTOMER_SOURCE`, `COMPANY_SOURCE`, `USER_PROVIDED`, `ASSUMPTION`, `GENERATED_RECOMMENDATION`; có legend.
- [ ] **AC4** — Claim `UNSUPPORTED` hoặc `USER_EDITED` được cảnh báo rõ.
- [ ] **AC5** — Panel có các nhóm tách biệt: **Facts | Assumptions | Recommendations | Open Questions** — không trộn lẫn.
- [ ] **AC6** — Click source mở `SourceDrawer` (US-FE-13).

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-18.1 | Evidence panel + grouping | AC1, AC5 | 4 | US-BE-17 | | `TODO` |
| FE-18.2 | Claim ↔ evidence linking highlight | AC2 | 4 | FE-17.2 | | `TODO` |
| FE-18.3 | Claim labels + legend + warnings | AC3, AC4 | 3 | US-BE-17 | | `TODO` |
| FE-18.4 | Tích hợp SourceDrawer | AC6 | 1 | FE-13.1 | | `TODO` |
| FE-18.5 | Tests | Pass | 2 | — | | `TODO` |

---

### US-FE-19 — AI actions: rewrite / expand / shorten / regenerate

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người dùng, **tôi muốn** dùng AI để viết lại, mở rộng, rút gọn hoặc tạo lại nội dung với chỉ dẫn, **để** chỉnh sửa nhanh hơn. |
| Priority / SP / Sprint | MUST / 5 / S3 |
| Spec ref | §18 |
| BE Dep | US-BE-18 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Nút **[AI Rewrite] [Expand] [Shorten] [Regenerate]** cho toàn section; bubble menu cho đoạn được chọn.
- [ ] **AC2** — Có ô instruction tùy chọn (giới hạn ký tự hiển thị bộ đếm).
- [ ] **AC3** — Kết quả hiển thị dạng **preview/diff** với Accept / Reject; chỉ Accept mới thay nội dung và tạo revision.
- [ ] **AC4** — Trong lúc chạy: loading, có thể hủy; lỗi hiển thị và giữ nguyên nội dung cũ.
- [ ] **AC5** — Regenerate toàn section cảnh báo nếu section có chỉnh sửa tay.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-19.1 | AI action toolbar + bubble menu | AC1 | 2 | FE-17.1 | | `TODO` |
| FE-19.2 | Instruction dialog | AC2 | 1 | — | | `TODO` |
| FE-19.3 | Preview/diff + accept/reject | AC3 | 4 | US-BE-18 | | `TODO` |
| FE-19.4 | Loading/cancel/error + warning | AC4, AC5 | 2 | — | | `TODO` |
| FE-19.5 | Tests | Pass | 2 | — | | `TODO` |

---

### US-FE-20 — Section insert / delete / reorder

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người dùng, **tôi muốn** thêm, xóa và sắp xếp lại section, **để** cấu trúc proposal phù hợp khách hàng. |
| Priority / SP / Sprint | MUST / 3 / S4 |
| Spec ref | §18 |
| BE Dep | US-BE-19 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Kéo-thả để reorder trong section navigator (có hỗ trợ keyboard).
- [ ] **AC2** — Insert section (tiêu đề + vị trí); Delete có ConfirmDialog và cảnh báo requirement đang map vào section đó.
- [ ] **AC3** — Thất bại API → khôi phục thứ tự cũ.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-20.1 | Reorder dnd-kit + keyboard | AC1, AC3 | 3 | US-BE-19 | | `TODO` |
| FE-20.2 | Insert/delete dialogs | AC2 | 2 | US-BE-19 | | `TODO` |
| FE-20.3 | Tests | Pass | 1 | — | | `TODO` |

---

## EP-F07 — Versioning

### US-FE-21 — Version history & restore

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người dùng, **tôi muốn** xem lịch sử phiên bản và khôi phục bản cũ, **để** không sợ mất nội dung tốt. |
| Priority / SP / Sprint | MUST / 5 / S4 |
| Spec ref | §20 |
| BE Dep | US-BE-20 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Drawer "History" liệt kê version: số, người tạo, thời gian, loại thay đổi (AI generation, Human edit, Regeneration, Restore, Approval).
- [ ] **AC2** — Xem nội dung version ở chế độ read-only.
- [ ] **AC3** — Restore có xác nhận → tạo version mới; version đã approve có badge "Approved — immutable".

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-21.1 | History drawer + list | AC1 | 3 | US-BE-20 | | `TODO` |
| FE-21.2 | Version viewer read-only | AC2 | 2 | US-BE-20 | | `TODO` |
| FE-21.3 | Restore flow + tests | AC3 | 2 | US-BE-20 | | `TODO` |

---

## EP-F08 — Review & Approval

### US-FE-22 — Review screen

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** reviewer, **tôi muốn** xem requirement coverage, claim không có evidence, input còn thiếu, giả định và câu hỏi mở, **để** quyết định proposal đã sẵn sàng duyệt chưa. |
| Priority / SP / Sprint | MUST / 8 / S4 |
| Spec ref | §13 Agent 5, §29 Screen 5 |
| BE Dep | US-BE-21 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Nút "Run review" → hiển thị các khối: **Requirement Coverage, Unsupported Claims, Missing Inputs, Assumptions, Open Questions**.
- [ ] **AC2** — Coverage hiển thị % và danh sách requirement chưa được bao phủ (link tới requirement).
- [ ] **AC3** — Mỗi issue có severity và nút "Go to" mở đúng section/claim trong editor.
- [ ] **AC4** — Ghi chú rõ: "Internal review signal — không hiển thị cho khách hàng"; không gọi là "quality score".
- [ ] **AC5** — Nút "Submit for approval" chỉ bật khi đã chạy review trên version hiện tại; có cảnh báo nếu còn issue BLOCKER. Dialog submit cho phép chọn reviewer bổ sung (US-FE-23 AC2) và nhắc rằng approve của version trước sẽ bị hủy (AR-06).

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-22.1 | Review page layout + run review | AC1, AC4 | 3 | US-BE-21 | | `TODO` |
| FE-22.2 | Coverage widget + uncovered list | AC2 | 3 | US-BE-21 | | `TODO` |
| FE-22.3 | Issue list + deep link vào editor | AC3 | 3 | FE-16.2 | | `TODO` |
| FE-22.4 | Submit for approval gate | AC5 | 2 | US-BE-22 | | `TODO` |
| FE-22.5 | Tests | Pass | 2 | — | | `TODO` |

---

### US-FE-23 — Approval screen

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người tạo proposal hoặc reviewer, **tôi muốn** chọn người cùng duyệt, theo dõi tiến độ approve và duyệt/yêu cầu chỉnh sửa một version cụ thể, **để** chỉ nội dung đã được người xác nhận mới xuất cho khách hàng. |
| Priority / SP / Sprint | MUST / 8 / S4 |
| Spec ref | §19, §29 Screen 6 · quy tắc AR-01–AR-08 trong WBS-Backend US-BE-22 |
| BE Dep | US-BE-22 (`/api/proposals/{id}/reviewers`, `/submit-review`, `/approve`, `/reject`) |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Hiển thị "Proposal Version: N", tóm tắt review, người submit, thời gian, và **tiến độ duyệt** `approvalsReceived / approvalsRequired` (vd. "1/2 approve"); chỉ có người tạo → hiển thị "Tự duyệt (1/1)".
- [ ] **AC2** — Panel **Reviewers**: danh sách reviewer với trạng thái từng người (Chờ duyệt / Đã approve + thời gian / Yêu cầu sửa); người tạo luôn có mặt, đánh dấu "Người tạo", không có nút gỡ. Thêm reviewer bằng ô chọn thành viên cùng workspace (không trùng). Hiện gợi ý: "Có từ 2 reviewer trở lên thì cần ít nhất 2 approve".
- [ ] **AC3** — Quyền sửa reviewer: trước khi nộp duyệt, người tạo và OWNER được sửa; khi `APPROVAL_PENDING` **chỉ OWNER** thấy nút thêm/gỡ. Gỡ reviewer đã approve → ConfirmDialog nêu rõ approve đó sẽ không còn được tính; sau thay đổi, refresh tiến độ và trạng thái proposal (có thể chuyển `APPROVED` ngay — AR-08).
- [ ] **AC4** — Nút **[Approve]** (comment tùy chọn; acknowledge nếu còn BLOCKER) và **[Request Changes]** (comment bắt buộc) chỉ hiện với reviewer chưa approve version hiện tại. Người tạo tự duyệt thấy nhãn "Tự duyệt".
- [ ] **AC5** — Sau Approve: nếu chưa đủ số approve → hiển thị "Đã ghi nhận, chờ N approve nữa"; nếu đủ → proposal `APPROVED`, hiển thị danh sách người approve/thời gian/version, mở khóa Export.
- [ ] **AC6** — Request Changes → proposal quay về `REVIEW` ngay (AR-05); hiển thị comment của reviewer trên Review screen. Khi nộp lại version mới, UI thông báo các approve cũ đã bị hủy (AR-06).
- [ ] **AC7** — Người không phải reviewer không thấy nút duyệt; lỗi `403`/`409` từ backend (approve trùng, không có quyền, trạng thái đổi) hiển thị thông điệp rõ và refresh dữ liệu.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-23.1 | Approval page + summary + tiến độ approve | AC1, AC5 | 3 | US-BE-22 | | `TODO` |
| FE-23.2 | Panel Reviewers: danh sách, trạng thái, thêm/gỡ theo quyền (người tạo/OWNER, pending → OWNER) | AC2, AC3 | 4 | US-BE-22, US-FE-44 | | `TODO` |
| FE-23.3 | Approve / Request changes dialogs (BLOCKER acknowledge, comment bắt buộc) | AC4, AC5, AC6 | 3 | US-BE-22 | | `TODO` |
| FE-23.4 | Permission-aware UI + xử lý 403/409 | AC7 | 2 | US-BE-22 | | `TODO` |
| FE-23.5 | Tests (tự duyệt 1/1, 2 reviewer cần 2/2, 3 reviewer cần 2/3, request changes, OWNER đổi reviewer lúc pending) | Pass | 3 | — | | `TODO` |

---|---|
| User Story | **Là** approver, **tôi muốn** duyệt hoặc yêu cầu chỉnh sửa một version cụ thể, **để** chỉ nội dung đã được người xác nhận mới xuất cho khách hàng. |
| Priority / SP / Sprint | MUST / 5 / S4 |
| Spec ref | §19, §29 Screen 6 |
| BE Dep | US-BE-22 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Hiển thị "Proposal Version: N", tóm tắt review, người submit, thời gian.
- [ ] **AC2** — Nút **[Approve]** (comment tùy chọn, xác nhận nếu còn BLOCKER) và **[Request Changes]** (comment bắt buộc).
- [ ] **AC3** — Sau approve: hiển thị approvedBy/approvedAt/version, proposal chuyển `APPROVED`, mở khóa Export.
- [ ] **AC4** — User không có quyền approve không thấy nút (và backend 403 được xử lý).

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-23.1 | Approval page + summary | AC1 | 2 | US-BE-22 | | `TODO` |
| FE-23.2 | Approve / Request changes dialogs | AC2, AC3 | 3 | US-BE-22 | | `TODO` |
| FE-23.3 | Permission-aware UI + tests | AC4 | 2 | US-BE-22 | | `TODO` |

---

## EP-F09 — Export

### US-FE-24 — Export DOCX/PDF & export history

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người dùng, **tôi muốn** xuất proposal đã duyệt ra DOCX/PDF và tải lại các bản cũ, **để** gửi khách hàng. |
| Priority / SP / Sprint | MUST / 5 / S4 |
| Spec ref | §5, §21, TASK-010 |
| BE Dep | US-BE-23, US-BE-24 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Nút Export DOCX / Export PDF chỉ bật khi `APPROVED`/`EXPORTED`.
- [ ] **AC2** — Khi chưa approve: tùy chọn **"Draft Export"** với cảnh báo và xác nhận tường minh; file có watermark DRAFT.
- [ ] **AC3** — Export chặn khi còn `[INPUT REQUIRED]` → hiển thị danh sách vị trí cần xử lý.
- [ ] **AC4** — Tab Exports liệt kê lịch sử (format, version, người export, thời gian, Draft/Final) và nút Download.
- [ ] **AC5** — Trong khi sinh file hiển thị progress; lỗi có Retry.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-24.1 | Export actions + gating | AC1, AC3 | 2 | US-BE-23 | | `TODO` |
| FE-24.2 | Draft export flow | AC2 | 2 | US-BE-23 | | `TODO` |
| FE-24.3 | Exports history + download | AC4, AC5 | 3 | US-BE-24 | | `TODO` |
| FE-24.4 | Tests | Pass | 2 | — | | `TODO` |

---

## EP-F10 — Quality & Delivery

### US-FE-25 — E2E tests, accessibility, deployment & CI/CD

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** team, **tôi muốn** frontend được kiểm thử end-to-end, đạt chuẩn accessibility cơ bản và deploy tự động lên Azure, **để** demo MVP ổn định. |
| Priority / SP / Sprint | MUST / 8 / S4 |
| Spec ref | §32 Day 7, §33, §34, §40 |
| BE Dep | US-BE-27 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Playwright E2E cho luồng MVP: login → create → upload → review requirements → outline → generate → edit → review → approve → export (chạy với backend test hoặc mock).
- [ ] **AC2** — Kiểm tra a11y tự động (axe) cho các màn hình chính, không có lỗi critical.
- [ ] **AC3** — Security headers (CSP, X-Frame-Options, Referrer-Policy) cấu hình trong Next.js.
- [ ] **AC4** — Dockerfile (Next.js standalone output) chạy trên Azure Container Apps; pipeline build → test → deploy `dev`.
- [ ] **AC5** — UX cleanup: rà soát loading/empty/error states trên tất cả màn hình.

| ID | Task | Task AC | Est (h) | BE Dep | Owner | Status |
|---|---|---|---|---|---|---|
| FE-25.1 | Playwright E2E MVP flow | AC1 | 6 | — | | `TODO` |
| FE-25.2 | axe a11y checks + fix | AC2 | 3 | — | | `TODO` |
| FE-25.3 | Security headers / CSP | AC3 | 2 | — | | `TODO` |
| FE-25.4 | Dockerfile + CD to ACA | AC4 | 4 | US-BE-27 | | `TODO` |
| FE-25.5 | UX cleanup pass | AC5 | 4 | — | | `TODO` |

---

# PHASE 2 — Professional

### US-FE-26 — Company knowledge library UI

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** workspace admin, **tôi muốn** quản lý thư viện company knowledge có quy trình duyệt, **để** AI chỉ dùng nội dung đã phê duyệt. |
| Priority / SP | MUST / 8 |
| BE Dep | US-BE-28 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Trang Knowledge: list/filter theo type, tags, status (`DRAFT/APPROVED/ARCHIVED`), ngày hết hạn.
- [ ] **AC2** — Tạo/sửa item (upload file hoặc nhập text), submit/approve/archive.
- [ ] **AC3** — Item sắp/đã hết hạn (certification, reference) được cảnh báo.
- [ ] **AC4** — Evidence panel hiển thị knowledge item + version.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-26.1 | Knowledge list + filters | AC1 | 4 | | `TODO` |
| FE-26.2 | Create/edit + approval actions | AC2 | 5 | | `TODO` |
| FE-26.3 | Expiry warnings + evidence integration | AC3, AC4 | 3 | | `TODO` |
| FE-26.4 | Tests | Pass | 2 | | `TODO` |

### US-FE-27 — Template builder & branding

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** workspace admin, **tôi muốn** tạo template, chỉnh section và branding, **để** proposal theo chuẩn công ty. |
| Priority / SP | SHOULD / 8 |
| BE Dep | US-BE-29 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Clone template, thêm/xóa/reorder section, sửa writing rules.
- [ ] **AC2** — Upload logo, chọn màu/font; preview trang bìa.
- [ ] **AC3** — Workspace rules (tone, glossary) chỉnh được.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-27.1 | Template editor | AC1 | 6 | | `TODO` |
| FE-27.2 | Branding settings + preview | AC2 | 4 | | `TODO` |
| FE-27.3 | Workspace rules form + tests | AC3 | 3 | | `TODO` |

### US-FE-28 — Version compare (diff view)

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** reviewer, **tôi muốn** so sánh 2 version cạnh nhau, **để** thấy chính xác những gì thay đổi. |
| Priority / SP | SHOULD / 5 |
| BE Dep | US-BE-30 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Chọn 2 version → diff side-by-side/inline theo section, highlight thêm/xóa.
- [ ] **AC2** — Hiển thị claim/evidence thay đổi.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-28.1 | Diff viewer | AC1 | 5 | | `TODO` |
| FE-28.2 | Claim diff + tests | AC2 | 3 | | `TODO` |

### US-FE-29 — Advanced review insights

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** reviewer, **tôi muốn** thấy mâu thuẫn giữa section và thuật ngữ không nhất quán, **để** proposal nhất quán. |
| Priority / SP | SHOULD / 5 |
| BE Dep | US-BE-31 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Khối Contradictions và Terminology trong Review, deep link tới vị trí.
- [ ] **AC2** — Biểu đồ xu hướng chỉ số review qua các version.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-29.1 | Contradiction & terminology panels | AC1 | 4 | | `TODO` |
| FE-29.2 | Trend chart + tests | AC2 | 3 | | `TODO` |

### US-FE-30 — Proposal roles & section comments

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** team lead, **tôi muốn** gán vai trò trên từng proposal và comment theo section, **để** cả team cùng làm proposal. |
| Priority / SP | SHOULD / 5 |
| BE Dep | US-BE-32 |
| Status | `TODO` |

> Quản lý thành viên & lời mời workspace đã chuyển lên MVP (US-FE-44). Gửi lời mời qua email tự động thuộc story backend sau (spec US-BE-03 D2).

**Acceptance Criteria**

- [ ] **AC1** — Gán vai trò trên proposal (Owner, Contributor, Reviewer, Approver).
- [ ] **AC2** — Comment thread theo section, @mention, resolve.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-30.1 | Proposal roles UI | AC1 | 3 | | `TODO` |
| FE-30.2 | Comments sidebar + tests | AC2 | 6 | | `TODO` |

### US-FE-31 — CRM connect & import opportunity

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** sales owner, **tôi muốn** kết nối CRM và tạo proposal từ opportunity, **để** không nhập lại dữ liệu. |
| Priority / SP | COULD / 8 |
| BE Dep | US-BE-33 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Trang Integrations: connect/disconnect CRM (OAuth).
- [ ] **AC2** — Wizard bước 1 có "Import from CRM" → chọn opportunity → điền sẵn form.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-31.1 | Integrations page | AC1 | 3 | | `TODO` |
| FE-31.2 | Opportunity picker in wizard + tests | AC2 | 4 | | `TODO` |

### US-FE-32 — Plans, usage & AI cost dashboard

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** workspace owner, **tôi muốn** xem gói dịch vụ, mức sử dụng và chi phí AI, **để** kiểm soát chi phí. |
| Priority / SP | SHOULD / 8 |
| BE Dep | US-BE-34 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Hiển thị quota đã dùng/còn lại; cảnh báo gần hết quota.
- [ ] **AC2** — Dashboard tokens & cost estimate theo tháng/proposal.
- [ ] **AC3** — Trang nâng cấp gói (giá lấy từ backend — **không hardcode**).

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-32.1 | Usage & quota widgets | AC1 | 3 | | `TODO` |
| FE-32.2 | Cost dashboard charts | AC2 | 4 | | `TODO` |
| FE-32.3 | Plans/upgrade page + tests | AC3 | 4 | | `TODO` |

### US-FE-33 — Additional formats & URL import

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** người dùng, **tôi muốn** upload PPTX/XLSX/HTML/email và nhập URL, **để** dùng mọi loại tài liệu. |
| Priority / SP | COULD / 5 |
| BE Dep | US-BE-35 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Uploader chấp nhận định dạng mới; source viewer hiển thị slide/sheet location.
- [ ] **AC2** — Form "Import from URL" với validate URL và thông báo lỗi bị chặn (SSRF policy).

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-33.1 | Uploader + source viewer mở rộng | AC1 | 3 | | `TODO` |
| FE-33.2 | URL import form + tests | AC2 | 2 | | `TODO` |

---

# PHASE 3 — Enterprise

### US-FE-34 — SSO login & IdP configuration

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** IT admin, **tôi muốn** cấu hình SSO và người dùng đăng nhập qua IdP công ty, **để** quản lý truy cập tập trung. |
| Priority / SP | MUST / 5 |
| BE Dep | US-BE-36 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Login page có "Sign in with SSO" (nhập email/domain → redirect IdP).
- [ ] **AC2** — Trang admin cấu hình OIDC/SAML, group mapping, bật SSO-only.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-34.1 | SSO login flow | AC1 | 3 | | `TODO` |
| FE-34.2 | IdP config admin + tests | AC2 | 5 | | `TODO` |

### US-FE-35 — RBAC admin & approval matrix

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** admin, **tôi muốn** quản lý role, permission và ma trận phê duyệt, **để** tuân thủ chính sách nội bộ. |
| Priority / SP | MUST / 8 |
| BE Dep | US-BE-37 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Role editor (permission checklist), gán role cho user.
- [ ] **AC2** — Approval matrix editor (điều kiện → approvers, nhiều cấp).
- [ ] **AC3** — UI ẩn/disable action theo permission của user hiện tại.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-35.1 | Role/permission editor | AC1 | 5 | | `TODO` |
| FE-35.2 | Approval matrix editor | AC2 | 5 | | `TODO` |
| FE-35.3 | `usePermission` + refactor gating + tests | AC3 | 3 | | `TODO` |

### US-FE-36 — Audit log viewer

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** compliance officer, **tôi muốn** tra cứu và xuất audit log, **để** phục vụ kiểm toán. |
| Priority / SP | SHOULD / 5 |
| BE Dep | US-BE-38 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Bảng audit với filter (actor, action, entity, thời gian), phân trang server-side.
- [ ] **AC2** — Export CSV.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-36.1 | Audit table + filters | AC1 | 4 | | `TODO` |
| FE-36.2 | Export + tests | AC2 | 2 | | `TODO` |

### US-FE-37 — Data residency & retention settings

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** workspace owner doanh nghiệp, **tôi muốn** xem/cấu hình region dữ liệu và chính sách lưu trữ, **để** tuân thủ quy định. |
| Priority / SP | SHOULD / 6 |
| BE Dep | US-BE-39 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Hiển thị region hiện tại, retention policy; chỉnh sửa có xác nhận 2 bước.
- [ ] **AC2** — Yêu cầu xóa workspace (hard delete) với xác nhận gõ tên workspace.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-37.1 | Residency & retention settings | AC1 | 4 | | `TODO` |
| FE-37.2 | Workspace deletion flow + tests | AC2 | 3 | | `TODO` |

---

# PHASE 4 — Agent Platform

### US-FE-38 — Agent run console & human checkpoints

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** Solution Architect, **tôi muốn** theo dõi các agent đang chạy và phê duyệt tại các checkpoint, **để** tự động hóa mà vẫn kiểm soát. |
| Priority / SP | MUST / 13 |
| BE Dep | US-BE-42 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Timeline/graph các bước agent (trạng thái, input/output tóm tắt, tokens, cost).
- [ ] **AC2** — Checkpoint yêu cầu người duyệt: xem đề xuất, Accept/Edit/Reject; run dừng chờ.
- [ ] **AC3** — Hủy run, retry bước lỗi, hiển thị budget còn lại.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-38.1 | Run timeline/graph view | AC1 | 8 | | `TODO` |
| FE-38.2 | Checkpoint review UI | AC2 | 6 | | `TODO` |
| FE-38.3 | Run controls + budget + tests | AC3 | 5 | | `TODO` |

### US-FE-39 — Architecture diagrams & compliance matrix

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** Solution Architect, **tôi muốn** xem/chỉnh sơ đồ kiến trúc và ma trận compliance do agent đề xuất, **để** đưa vào proposal sau khi kiểm tra. |
| Priority / SP | SHOULD / 8 |
| BE Dep | US-BE-43, US-BE-44 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Render Mermaid diagram, chỉnh source, chèn vào section (export được).
- [ ] **AC2** — Compliance matrix: requirement × capability × evidence × gap; filter gap.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-39.1 | Diagram renderer/editor + insert | AC1 | 6 | | `TODO` |
| FE-39.2 | Compliance matrix view + tests | AC2 | 5 | | `TODO` |

### US-FE-40 — Commercial estimation UI

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** sales owner, **tôi muốn** xem và điều chỉnh ước lượng effort/chi phí do agent đề xuất, **để** hoàn thiện phần commercial. |
| Priority / SP | COULD / 5 |
| BE Dep | US-BE-45 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Bảng estimate (role, effort, rate, total) có giải thích nguồn từng số.
- [ ] **AC2** — Chỉnh tay và phê duyệt trước khi chèn vào section Commercial.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-40.1 | Estimate table + explainability | AC1 | 4 | | `TODO` |
| FE-40.2 | Approve & insert + tests | AC2 | 3 | | `TODO` |

### US-FE-41 — Jira/ADO & Teams/Slack settings

| Thuộc tính | Giá trị |
|---|---|
| User Story | **Là** team lead, **tôi muốn** kết nối Jira/ADO và Teams/Slack, **để** đẩy câu hỏi mở thành issue và nhận thông báo. |
| Priority / SP | COULD / 5 |
| BE Dep | US-BE-46 |
| Status | `TODO` |

**Acceptance Criteria**

- [ ] **AC1** — Connect/disconnect từng integration; chọn project/channel.
- [ ] **AC2** — Từ open question: "Create Jira/ADO issue" hiển thị link issue.

| ID | Task | Task AC | Est (h) | Owner | Status |
|---|---|---|---|---|---|
| FE-41.1 | Integration settings | AC1 | 3 | | `TODO` |
| FE-41.2 | Create issue action + tests | AC2 | 3 | | `TODO` |

---

## Phụ lục A — Màn hình (Spec §29) → User Stories

| Màn hình | Route gợi ý | Stories |
|---|---|---|
| Đăng nhập / Đăng ký | `/login`, `/register` | US-FE-02, US-FE-42 |
| Chấp nhận lời mời | `/invitations/accept?token=` | US-FE-43 |
| Cài đặt workspace / Thành viên | `/settings/workspace`, `/settings/members` | US-FE-45, US-FE-44 |
| Screen 1 — Dashboard | `/` hoặc `/proposals` | US-FE-05 |
| Screen 2 — Create Proposal wizard | `/proposals/new` | US-FE-06, US-FE-08 |
| Screen 3 — Requirements | `/proposals/[id]/requirements` | US-FE-10 → US-FE-13 |
| Screen 4 — Proposal Workspace | `/proposals/[id]/workspace?section=` | US-FE-14 → US-FE-21 |
| Screen 5 — Review | `/proposals/[id]/review` | US-FE-22 |
| Screen 6 — Approval | `/proposals/[id]/approval` | US-FE-23 |
| Exports | `/proposals/[id]/exports` | US-FE-24 |

## Phụ lục B — MVP Definition of Done (§33) → Stories FE

| Checklist §33 | Story FE |
|---|---|
| User authenticated | US-FE-02, US-FE-42, US-FE-43 |
| Proposal created | US-FE-06 |
| RFP uploaded / processed | US-FE-08, US-FE-09 |
| Requirements extracted / reviewed | US-FE-10, US-FE-11, US-FE-12 |
| Proposal outline generated | US-FE-14 |
| Proposal sections generated | US-FE-15 |
| Sources visible | US-FE-13, US-FE-18 |
| Human can edit | US-FE-17, US-FE-20 |
| AI can regenerate | US-FE-19 |
| Review completed | US-FE-22 |
| Proposal approved | US-FE-23 |
| DOCX / PDF exported | US-FE-24 |
