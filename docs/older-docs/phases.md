# Phases — Personal Productivity Dashboard

## Phase 1 — Core Capture and Organization

**Goal:** A working single-user dashboard where items can be captured,
typed, tagged, and viewed in configurable blocks.

**Includes:**
- Items domain: CaptureItem, UpdateItem, PromoteItem, ArchiveItem,
  RestoreItem, all queries
- Relationships domain: CreateTag, RenameTag, DeleteTag, TagItem,
  UntagItem, GetAllTags, GetTagsForItem, GetTagsForItems (batch),
  GetItemsForTag, GetTagUsageCounts
- Views domain: InitializeDashboard, AddBlock, RemoveBlock,
  UpdateBlock, ReorderBlocks, GetDashboard
- Sort Orders domain: GetSortOrders, SaveSortOrders (per-context
  drag-and-drop ordering for tag and maturity views)
- Import domain: CreateImportJob, ExecuteImport, all queries
  (markdown parsing, batch item creation, duplicate detection,
  tag_source tracking for folder/file imports)
- Export domain: ExportTag, ExportUntagged, ExportAll (markdown)
- MCP server: stdio-based AI agent access to all operations
- Basic responsive UI: dashboard grid, persistent CaptureBar header,
  sidebar with tags, Ideas view, Tag view
- Block types: ActionableTasks, RecentItems, TagCloud, ItemsByTag,
  Notes, Ideas, BlockedTasks, OverdueTasks
- Docker Compose deployment (app + PostgreSQL + daily backup)
- Operational: environment validation, rate limiting (200 req/min),
  health endpoint with version/uptime, Docker healthchecks

**Excludes:**
- Dependencies (all of them — Phase 2)
- Task status operations (CompleteTask, StartTask, BlockTask)
- Block types: DependencyGraph

**Test gate:**
- All contract tests pass for Items, Tags, and Views operations
- All unit tests pass with >= 80% coverage
- Dashboard loads in under 2 seconds with 100 test items
- Item capture round trip under 500ms
- Search returns results in under 1 second
- Responsive layout verified on desktop, tablet, and phone widths
- bandit reports zero HIGH severity findings

**Acceptance:**
- User can capture an item in under 3 seconds
- User can promote an item to any type
- User can create and apply tags
- User can configure dashboard blocks
- Dashboard displays correct data in all block types
- All operations work from phone browser

**Depends on:** Nothing — this is the foundation.

---

## Phase 2 — Dependencies, Tasks, and Import

**Goal:** Full task lifecycle with dependencies, and the ability
to import existing markdown notebooks.

**Includes:**
- Relationships domain: AddDependency, RemoveDependency,
  AddCrossReference, RemoveCrossReference, circular dependency
  detection, ResolveDependencies subscription, all dependency queries
- Items domain: CompleteTask, StartTask, BlockTask
- Import domain: CreateImportJob, ExecuteImport, all queries
- Block types: ActionableTasks, BlockedTasks, OverdueTasks
- Dependency visualization (simple list view, not graph)
- Markdown file upload UI
- Import report UI

**Excludes:**
- Conditional dependencies (Phase 3)
- DependencyGraph block with visual graph (Phase 3)
- Ideas maturity grouping block (Phase 3)
- OR dependencies (Phase 3 — Phase 2 is AND-only)
- Multi-user / authentication
- Calendar integration

**Test gate:**
- All Phase 1 tests still pass (regression)
- All contract tests pass for Dependencies, Task operations, Import
- Circular dependency detection tested with chains up to depth 20
- Import tested with files containing 1, 10, 100, and 500 items
- Single item failure in import batch does not prevent rest from importing
- Task blocking/unblocking correctly responds to dependency resolution
- Coverage >= 80% across all domains

**Acceptance:**
- User can add dependencies between items
- User can see which tasks are blocked and why
- User can complete a task and see dependent tasks unblock
- User can import a markdown file and see items appear with tags
- Import report shows exact counts of success/skip/fail
- Existing Phase 1 functionality is unaffected

**Depends on:** Phase 1 test gate passed.

---

## Phase 3 — Advanced Dependencies and Visualization

**Goal:** Conditional dependencies, OR logic, visual dependency
graph, and the Ideas maturity pipeline.

**Includes:**
- Conditional dependencies: outcome-based, external condition,
  property-based
- OR dependency logic
- DependencyGraph block with interactive visual graph
- Ideas block with maturity stage grouping
- Dependency chain critical path highlighting
- Advanced search: filter by dependency status, maturity, etc.

**Excludes:**
- AI-assisted prioritization
- Calendar integration
- Multi-user / authentication
- Collaboration features

**Test gate:**
- All Phase 1 and 2 tests still pass
- Conditional dependency evaluation engine tested exhaustively
- OR logic tested with complex multi-path scenarios
- Graph rendering tested with up to 100 connected items
- Coverage >= 80%

**Acceptance:**
- User can create conditional dependencies
- User can create OR dependencies
- Dependency graph visually shows the full chain
- Critical path is highlighted
- Ideas pipeline view shows maturity stages

**Depends on:** Phase 2 test gate passed.

---

## Phase 4 — Multi-User and Authentication

**Goal:** Transform from single-user to multi-tenant with
proper authentication, data isolation, and user management.

**Includes:**
- User authentication (registration, login, session management)
- Data isolation (user_id filter becomes dynamic)
- User profile and preferences
- API authentication middleware
- HTTPS and security hardening
- Deployment to VPS or cloud hosting

**Excludes:**
- Collaboration (users sharing items)
- Calendar integration
- AI features

**Test gate:**
- All previous phase tests pass
- Authentication tested: login, logout, session expiry
- Data isolation tested: user A cannot see user B's data
- API endpoints reject unauthenticated requests
- Security scan passes with zero HIGH findings
- Penetration test (at minimum, the .ispec security review)

**Acceptance:**
- Multiple users can register and log in
- Each user sees only their own data
- Session management works correctly
- System is accessible via HTTPS

**Depends on:** Phase 3 test gate passed.

---

## Phase 5 — Calendar, Collaboration, and AI

**Goal:** Integration features and intelligent assistance.

**Includes:**
- Calendar integration (view due dates, reminders on calendar)
- Collaboration: share items, shared tags, shared views
- AI-assisted "what should I do next" suggestions
- AI-assisted item classification on capture
- Notification system

**Excludes:**
- Defined by future discovery at this stage

**Test gate:**
- Defined during Phase 4 when scope is finalized

**Acceptance:**
- Defined during Phase 4

**Depends on:** Phase 4 test gate passed.
