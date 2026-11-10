# GitHub issues creation
_Exported on 17/10/2026 at 15:33:16 BST from Cursor (3.24.9)_

---

**User**

can you create github issues?

---

**Cursor**

**Yes, I can create GitHub issues for you** using the GitHub CLI (`gh issue create`). I can set titles, issue bodies (markdown formatted), labels, milestones, and assignees.

### Current Setup in this Project:
- **Repository:** `hugheshallettj/vineme2.0`
- **CLI Status:** The GitHub CLI (`gh`) is installed, but your stored GitHub authentication token has expired or is invalid:
  ```text
  Failed to log in to github.com account hugheshallettj (keyring)
  The token in keyring is invalid.
  ```

### How to Authenticate:
Run the following in your terminal to log back in:
```bash
gh auth login
```
*(Alternatively, you can set the `GH_TOKEN` environment variable with a personal access token that has the `repo` scope).*

Once you're logged in, just let me know what issue(s) you would like opened (or describe the bug/feature) and I will create them for you!

---

**User**

have a look at this. We want to make some big changes, and I'll need your help to scope this project/plan and create issues accordingly.

I want to link churches in vineme to churches in churchsuite. However the churchsuite api is somewhat limiting in that there arent many POST api endpoints.

With regards to the ChurchSuite Integration with VineMe 
•⁠  ⁠The ChurchSuite functions should be created as Edge Functions

•⁠  ⁠Make it Compulsory for new Church Signup on supabase to input the Church_id (Move *Church_id* to sign up page for new Churchs and make it a requirement to sign-up)

•⁠  ⁠When a Church Signs in ChurchSuite > Push it to VineMe >> Create a Cron job that checks every hour and pulls any changes

•⁠  ⁠Every time a user signs up to VineMe, check if their phone number and/or phone number exists in ChurchSuite. For Every new VineMe user who DOES NOT Exist in ChurchSuite > Create a Contact in the ChurchSuite account for them

•⁠  ⁠When group members change on VineMe (Members added / remove), this should be reflected on ChurchSuite Instantly... (e.g. If a user is added to a group on VineMe, then that same user should be added to the matching group on ChurchSuite

•⁠  ⁠Each VineMe Group should have a matching ChurchSuite group ID that can be referenced. Please also check the group ID against the ChurchID so that they both match before any operations can be performed...

Using existing ID's for everything
•⁠  ⁠Each Group in VineMe (Supabase) should have an associated Service_ID and Church_ID 

Useful Information & Links
•⁠  ⁠https://developer.churchsuite.com/corev2#tag/ministries/GET/rotas/ministries

Before you execute creating issues, do you have any questions?

---

**Cursor**

I have thoroughly reviewed your requirements and examined the existing codebase (including the database schema in Supabase, the existing ChurchSuite Edge Functions, DB triggers, admin screens, and the official ChurchSuite Core API v2 OpenAPI specifications).

Before creating the GitHub issues and scoping the project milestones, there are a few critical technical and workflow questions to clarify.

---

### 1. Small Groups vs. Rotas / Ministries API Mapping (Critical)
* **What we found in ChurchSuite API v2:**
  * You provided the link to [`/rotas/ministries`](https://developer.churchsuite.com/corev2#tag/ministries/GET/rotas/ministries) (the Rotas module).
  * However, ChurchSuite's **Rotas module is strictly read-only** for members (`GET /rotas/ministries`, `GET /rotas/ministry_members`). There is **no `POST` or `DELETE` endpoint** in the ChurchSuite Rotas API for adding or removing ministry members.
  * In contrast, ChurchSuite's **Small Groups module** (`/smallgroups`) has write endpoints for memberships:
    * `POST /smallgroups/members` (adds a contact to a small group)
    * `DELETE /smallgroups/members/{id}` (removes a member from a small group)
    * `GET /smallgroups/groups` and `GET /smallgroups/groups/{id}`
* **Question:** Do VineMe groups map to **ChurchSuite Small Groups** (`/smallgroups`), or are you specifically using **Rotas Ministries** (`/rotas/ministries`)? If it is Rotas Ministries, how should member additions/removals be handled given that ChurchSuite does not provide a POST/DELETE endpoint for ministry members?

---

### 2. "Church Signup" & Compulsory `church_id`
* **Current state in VineMe:**
  * Users sign up via phone OTP (`src/app/(auth)/phone-signup.tsx`), then enter their name and email, and choose their church & service at **Step 3** (`ChurchStep.tsx`).
  * Churches in Supabase are currently stored in the `churches` table, and connected to ChurchSuite in the admin dashboard (`/admin/churchsuite`) by entering ChurchSuite credentials.
* **Questions:**
  1. When you say *"Make it Compulsory for new Church Signup on supabase to input the Church_id (Move Church_id to sign up page for new Churchs and make it a requirement to sign-up)"*:
     * Does this refer to **new end-user signup** (moving church selection from onboarding Step 3 directly onto the initial phone/account signup page and making it mandatory)?
     * Or does this refer to an **organisation / church registration page** where a church administrator registers a new church into VineMe/Supabase?
  2. What is `Church_id` here? Is it the internal VineMe `churches.id` (UUID), or is it the **ChurchSuite account identifier** (e.g. `kingshope` in `https://kingshope.churchsuite.com`)?

---

### 3. Hourly Cron Job: Direction & Scope of Changes
* **Current state:** VineMe already has a `pg_cron` setup calling edge functions (e.g. `sync-churchsuite-vulnerable-tags` scheduled via `supabase/migrations/20260828140000_schedule_churchsuite_vulnerable_tags_sync.sql`).
* **Questions regarding:** *"When a Church Signs in ChurchSuite > Push it to VineMe >> Create a Cron job that checks every hour and pulls any changes"*:
  1. Because ChurchSuite does not support outbound webhooks, this hourly cron job will pull changes into VineMe. What specific changes should be pulled every hour?
     * **Groups:** Pull new or updated groups from ChurchSuite into VineMe?
     * **Group Memberships:** If an admin adds or removes a person in ChurchSuite directly, sync that back to VineMe's `group_memberships` table (two-way sync)?
     * **Contacts:** Pull contact detail updates?
  2. What did you mean by *"When a Church Signs in ChurchSuite > Push it to VineMe"*? (Does this mean when an admin first authorizes/connects ChurchSuite, trigger an immediate initial pull/sync rather than waiting for the next hourly cron run?)

---

### 4. User Signup & Contact Matching
* **Current state:** `supabase/functions/create-churchsuite-contact/index.ts` already exists and is triggered by a database trigger on `public.users` when `church_id` is set.
* **Questions:**
  1. In your note *"check if their phone number and/or phone number exists"* — confirming you mean **phone number and/or email**?
  2. In `create-churchsuite-contact`, there is currently a rollout restriction:
     ```ts
     const ALLOWED_EMAIL_DOMAIN = '@vineme.app';
     ```
     Should we completely remove this domain restriction so it runs for all users?
  3. Search precedence: If phone matches one contact and email matches another, or if one is missing, how should matching be prioritized (e.g., check phone first with normalisation `+44` $\to$ `0`, and if not found, search by email)?

---

### 5. Group Member Sync & ChurchSuite ID Validation
* **Current state:**
  * In VineMe, `group_memberships` has statuses: `'pending'`, `'active'`, `'inactive'`, `'archived'`.
  * In ChurchSuite, adding a member returns a distinct `member_id`. Deleting a member requires `DELETE /smallgroups/members/{member_id}`.
* **Questions:**
  1. Should the instant sync fire when a membership becomes `'active'` (approved/joined) to add them to ChurchSuite, and when it becomes `'inactive'` (or deleted) to remove them from ChurchSuite?
  2. If a user is added to a group but does not yet have a `churchsuite_id` (contact ID), should the Edge Function automatically create/find their ChurchSuite contact first?
  3. Should we store ChurchSuite's `churchsuite_member_id` directly on VineMe's `group_memberships` table so deletions can be executed directly without having to query ChurchSuite first?
  4. How should groups be linked initially? Since ChurchSuite's API has no `POST /smallgroups/groups` (groups cannot be created via the API), will church admins select/link an existing ChurchSuite group from a dropdown in VineMe's admin panel (similar to how `services` link to `churchsuite_site_id`), or will the cron job auto-link them by name?

---

### Proposed Issues Breakdown (Preview)

Once clarified, I suggest breaking this initiative into the following GitHub issues:

1. **DB Migration & Schema Updates:**
   * Add `churchsuite_group_id` to `public.groups`.
   * Add `churchsuite_member_id` to `public.group_memberships` (if confirmed).
   * Ensure `groups.church_id` integrity constraints.
2. **Signup Flow & Mandatory Church ID:**
   * Update signup/onboarding to enforce mandatory `church_id` at the required stage.
   * Remove `@vineme.app` restriction in `create-churchsuite-contact`.
   * Improve contact lookup to search both phone and email.
3. **Real-time Group Member Sync Edge Function & Trigger:**
   * Create `sync-churchsuite-group-membership` Edge Function (`POST` and `DELETE` on ChurchSuite `/smallgroups/members`).
   * Add Postgres trigger on `group_memberships` (on insert/update/delete of active status) via `pg_net`.
   * Add security validation verifying group `church_id` matches the ChurchSuite connection before making API calls.
4. **Hourly Cron Sync Edge Function & `pg_cron` Schedule:**
   * Create `sync-churchsuite-changes` Edge Function to pull updates from ChurchSuite.
   * Add `pg_cron` job scheduled hourly (`0 * * * *`) via DB migration.
5. **Admin UI / Group Linking:**
   * Allow Church Admins to link VineMe groups to their matching ChurchSuite groups.

*(Note: We are currently in Ask mode, so no file changes or CLI executions will be performed until you are ready and switch to Agent mode.)*

Please let me know your thoughts on the above questions so we can finalize the scope and issue specifications!

---

**User**

Not sure this answers your question, but i think it does. Here is the response from claude, and here is my response. Let me know if its missing anything. I then want you to give me a full comprehensive answer (if there's anything I missed) to give back to claude. Essentially just tidy up my response, and prepare it ready for Claude. Feel free to bring up anything I've missed.

## Claude:

Each request
1. ChurchSuite functions as Edge Functions
This is mostly done already. Every ChurchSuite API call runs in an edge function, and the app only calls them with supabase.functions.invoke. The one gap is the group-ID matching (syncChurchsuiteGroupIds). It only runs inside export-groups-csv, so I'd give it its own edge function that the cron job can also use. I read this request as a rule: all new ChurchSuite work goes in edge functions, never in the app.

2. ChurchSuite details required at church sign-up
I'm least sure about this one. There is no church sign-up page in the app today. A user fills in the "request a church" form (support.ts writes to new_church_requests), and someone then creates the church by hand in Supabase. ChurchSuite credentials are added later, by a church admin, on admin/churchsuite.tsx.

VineMe's church_id is a UUID that's generated automatically, so I assume you mean the ChurchSuite account details (Client ID / secret, or the account ID). My reading is that a church shouldn't exist in VineMe without its ChurchSuite link, so that form moves into church sign-up and becomes required.

3. Hourly cron that pulls ChurchSuite changes into VineMe
I'd copy the existing daily vulnerable-tags cron (pg_cron → pg_net → edge function, looping over every church in churchsuite_connections), but run it hourly. What I'm not sure of is what it should pull (see question 2 below).

4. Find or create a ChurchSuite contact for every new user
I take "phone number and/or phone number" to mean email and/or phone. Most of this already exists in create-churchsuite-contact, which runs from a trigger when a user gets a church_id. What's left:

Rollout gate: it currently skips everyone except @vineme.app emails (create-churchsuite-contact/index.ts:15). I assume this gate gets removed.
Matching: it searches by phone or email (phone first), not both. It also takes the first fuzzy q= result, which could link someone to the wrong contact.
Phone format: phone.replace('44', '0') replaces the first "44" anywhere in the number, not just the country code.
Email field: it reads new_email, which is the pending email-change field, instead of email.
5. Membership changes reach ChurchSuite instantly
None of this exists yet. Memberships are written from about five client services (groups.ts, joinRequests.ts, admin.ts, groupCreation.ts), so I wouldn't add calls in each one. Instead I'd put a database trigger on group_memberships that calls a new edge function, the same way the contact sync works:

When a membership becomes active, it calls POST /smallgroups/members.
When it goes from active to inactive, archived or deleted, it calls DELETE /smallgroups/members/{id}.
This needs the user's churchsuite_id and the group's churchsuite_group_id. It also needs a new smallgroups.write scope, and I'd store the ChurchSuite member ID on the membership so we can delete it later.

6. Group ID must match the church ID before any operation
Before any ChurchSuite write, I'd check that:

The user's church, group.church_id and group.service.church_id are all the same.
That church has a ChurchSuite connection.
churchsuite_group_id exists in that church's ChurchSuite account. In practice I'd fetch the group with that church's token, so a group can't point at another church's ChurchSuite group.
Possibly also: the ChurchSuite group's site matches the service's churchsuite_site_id.
If any check fails, it skips and logs.

7. Use existing IDs; every group has a service_id and church_id
groups.service_id is already required, but groups.church_id is nullable. I'd make it required and make sure it always matches the service's church. "Use existing IDs" I read as: link records by the stored IDs (church_id, service_id, churchsuite_group_id, users.churchsuite_id, services.churchsuite_site_id). Name matching would only fill in a missing ID, and we wouldn't add new ID columns.

Questions before I start
Small Groups or Ministries? Your link points to Rotas / Ministries, but I think VineMe groups should map to Small Groups. The ChurchSuite API is read-only for ministry members: there's no endpoint to add or remove them. Small Groups has POST and DELETE for members, and your current code already uses Small Groups. Can I use Small Groups?
What does the hourly cron pull, and does ChurchSuite win? For example:
Group IDs only?
New ChurchSuite groups created in VineMe?
Members added or removed in ChurchSuite also applied in VineMe?
Contact details updated?
Where does church sign-up happen? Should I:
add the ChurchSuite fields to the "request a church" form,
build a new church sign-up screen, or
make the ChurchSuite details required in Supabase when the church row is created?
What about VineMe groups with no ChurchSuite match? Should we create the group in ChurchSuite automatically, or skip it and leave it to the CSV export? And should only active members sync, with pending requests left out?

## My response:

Points
1. Great
2. ⁠⁠Yes you are right. There is no sign up form for a church. Basically, as you said, it ‘a church shouldn't exist in vineme without its churchsuite link’. We dont need a form for sign up (just a request a church form that already exists will do). The manual creation will be done, but basically it shouldnt work without the church having a churchsuite link.
3. ⁠Yes this sounds good. I'll answer this below. 4. Looks good. 5. Looks good. 6. Looks good 7. Yes, and actually, as you said, group.church_id should not be nullable, and it should be the same as group.service.church_id.

Questions:
1. Yes, link to small groups not ministries. Yes use these post and delete endpoints for the small group users. Yes use small groups.
2. ⁠We should be pulling the groups, but also a bunch of their metadata that would fit into our database. There are several fields from the ‘list groups’ GET endpoint: {
  "data": [
    {
      "id": 12,
      "identifier": "gi8fj4sj",
      "name": "Wednesday Women",
      "cluster_id": 12,
      "starts_at": "2018-01-01",
      "ends_at": "2014-02-01",
      "frequency": "weekly",
      "day": "wednesday",
      "time": "10:10",
      "location": {
        "name": "Zoom",
        "type": "online",
        "address": "NG1 1PR",
        "latitude": 52.952089,
        "longitude": -1.1448,
        "url": "https:zoom.us/123456789"
      },
      "description": "Learning to apply the bible in our everyday.",
      "visibility": {
        "my": true,
        "embed": true,
        "connect": true,
        "members": true
      },
      "signup_options": {
        "capacity": 200,
        "my_signup": true,
        "embed_signup": true,
        "starts_at": "2018-01-01",
        "ends_at": "2014-02-01",
        "default_status": "pending",
        "confirmation_email": {
          "sender_email": "admin@kingshopechurch.co.uk",
          "sender_name": "Kings Hope Booking",
          "subject": "You're booked!",
          "body": "<div>Dear ::first_name::,</div> <div>&nbsp;</div> <div>Here are your details!</div>"
        }
      },
      "custom_fields": [
        {
          "id": 1,
          "field_type": "text",
          "value": "support@churchsuite.com"
        }
      ],
      "image": {
        "thumbnail": "https://cdn.churchsuite.com/abcdefgh/smallgroups/groups/x_thumb.jpg",
        "small": "https://cdn.churchsuite.com/abcdefgh/smallgroups/groups/x_sm.jpg",
        "medium": "https://cdn.churchsuite.com/abcdefgh/smallgroups/groups/x_md.jpg",
        "large": "https://cdn.churchsuite.com/abcdefgh/smallgroups/groups/x_lg.jpg",
        "uploaded_at": "2014-04-25T10:10:32Z"
      },
      "all_sites": false,
      "site_ids": [
        2,
        7,
        16
      ],
      "created_at": "2014-04-25T10:10:32Z",
      "created_by": "neil",
      "modified_at": "2023-09-19T14:52:40Z",
      "modified_by": "anthony"
    }
  ],
  "pagination": {
    "num_results": 0,
    "per_page": 1,
    "page": 1,
    "next_page": null,
    "prev_page": null
  }
}
Things like group name, day of the week, time the group meets etc. Some stuff churchsuite doesnt have (like which group is attached to which service so we need to make sure there is a way of attaching a group (which is pulled from CS) to a service within vineme. Do you understand this?  So we are actually gonna hide or temporarily remove/comment out the functionality to create a group in Vineme so that we are creating groups only on CS and syncing them to vineme. We want the main source of truth to be primarily in CS and we will store the stuff that can’t be stored in CS on our own database (thats why we are keeping our database and not just entirely relying on CS’s database).  When we update a user on churchsuite, this can be reflected on our database (right now I think there is functionality to link a user between CS and VM by looking at their phone number or email). But if a new user is made, or their metadata is changed (either on VM or CS since there are POST, PUT, and GET requests) we want the changes to be reflected on CS/VM. Yes contact details should be updated.  3. Don’t worry about a church sign up. We will just keep the current ‘request a church’ simple form. And we will manually add it. (Basically just keep the current functionality). Yes perhaps it makes sense to make the CS link required when the row is created.  4. We are working to make sure groups won’t be created in VineMe from now on (only in CS). This means there should be no group in VM that isnt in CS. While we are crossing this point, we will have a few in this transition period. Perhaps these should be marked as “No link to Churchsuite” or something so that the admin can see or something. What do you suggest? Maybe we will keep the Churchsuite CSV export function for this transition period only but probably in future, we wont need it. Does this make sense? Pending users/members for a group on vineme should not yet sync to CS. Only when they get accepted into the group officially in vineme they should be added to the group in churchsuite.   Bear in mind, that we probably need to store a the CS group ids in a new column in our groups table. Is this the only one? 

---

**Cursor**

Here is a breakdown of what was great in your draft, what was missing or needs technical tightening, followed by a **complete, polished response ready to send to Claude**.

---

### What Was Missing or Needs Clarification

1. **The `service_id` Problem (Critical blocker for cron):**
   * In VineMe, `groups.service_id` is `NOT NULL` with a foreign key to `services(id)`.
   * ChurchSuite groups only have `site_ids` (e.g., `[2, 7]`), **not** VineMe service IDs. A church site can have multiple services (e.g. 9:00 AM, 11:00 AM, 6:00 PM).
   * If the hourly cron creates a group pulled from ChurchSuite, it cannot know which `service_id` to attach. We need either:
     - Make `groups.service_id` nullable in Supabase so imported groups can be saved in an `"unassigned"` state until a church admin links them in the admin dashboard, **OR**
     - Default to the church's primary service if only one service exists for that site.
     *(Recommendation: make `service_id` nullable during import and provide a quick dropdown in `admin/manage-groups` to assign the service).*

2. **Is `churchsuite_group_id` the only new column needed? (No):**
   * **`groups.churchsuite_group_id`** (INTEGER, UNIQUE) is definitely needed.
   * **`group_memberships.churchsuite_member_id`** (INTEGER, NULLABLE) is **also critical**.
     * *Why?* ChurchSuite's endpoint to delete/remove a member is `DELETE /smallgroups/members/{member_id}`. ChurchSuite generates a distinct membership ID (e.g. `109`) that is different from both the contact ID and the group ID. If we don't save `churchsuite_member_id` when adding a user to a group, every time a user leaves a group VineMe would have to make an extra `GET` request to search for their membership ID before it could delete them.
   * **`groups.church_id` NOT NULL:** Already agreed, but we must backfill existing groups before applying the constraint.

3. **Two-Way Membership Sync Caveat:**
   * If someone is added to a group in ChurchSuite directly, the cron job can only link them into VineMe's `group_memberships` if that contact **already has a VineMe account** (matching `users.churchsuite_id`). VineMe cannot create a `group_membership` for an external contact without a Supabase auth account.

4. **Day of Week Format Mismatch:**
   * ChurchSuite returns lowercase: `"wednesday"`, `"various days"`, or `null`.
   * VineMe has a strict Postgres constraint: `CHECK (meeting_day IN ('Sunday', 'Monday', 'Tuesday', ...))`.
   * The sync function must capitalize the day and have a fallback (or update the check constraint) if ChurchSuite has `"various days"`.

5. **Where to Disable Group Creation in VineMe:**
   * Specifically hide/disable group creation buttons in `src/app/group/create.tsx`, `src/components/groups/CreateGroupModal.tsx`, and `src/app/admin/manage-groups.tsx`.

---

### Prepared Response Ready to Send to Claude

*(You can copy and paste the block below directly into your conversation with Claude.)*

***

## Answers & Technical Clarifications

### Review of Points 1–7

1. **Edge Functions Rule:** Agreed. All new ChurchSuite operations (syncing, membership updates, group imports) must live in Supabase Edge Functions. App clients should only ever trigger them via `supabase.functions.invoke` or database triggers.
2. **Church Creation & ChurchSuite Requirement:** Agreed. We will keep the existing simple "Request a Church" user form as-is. In Supabase, churches are added manually by admins. To enforce that a church cannot exist or function in VineMe without ChurchSuite, we will ensure that a church is only treated as active/visible once a matching row in `churchsuite_connections` exists with valid credentials.
3. **Hourly Cron Job:** Agreed. Copy the architecture of the existing `sync-churchsuite-vulnerable-tags` cron (`pg_cron` $\to$ `pg_net` $\to$ edge function) and run it hourly (`0 * * * *`). Details on what it pulls are answered in Question 2 below.
4. **Contact Find/Create (`create-churchsuite-contact`):**
   - **Rollout gate:** Remove `ALLOWED_EMAIL_DOMAIN = '@vineme.app'`. It should run for all users.
   - **Matching logic:** First search by normalised phone number (fix the bug: strip the country prefix `+44`/`44` safely from the start of the string rather than doing a global `.replace('44', '0')`). If no exact phone match, search by email. Verify that the search result actually matches either the phone or email to prevent false positives from fuzzy `q=` searches.
   - **Email field:** Fix the lookup to read `authUserData.user.email` (not `new_email`).
5. **Real-time Membership Sync:** Agreed. Put a Postgres trigger on `public.group_memberships` using `pg_net` to call a new edge function `sync-churchsuite-group-membership`:
   - When status becomes `'active'` (joined/approved): call `POST /smallgroups/members`.
   - When status transitions from `'active'` to `'inactive'`, `'archived'`, or deleted: call `DELETE /smallgroups/members/{churchsuite_member_id}`.
   - **Important:** We will store `churchsuite_member_id` directly on `public.group_memberships` so deletion can be done directly by ID without an extra lookup query.
   - Only active memberships sync; pending requests do **not** sync to ChurchSuite.
6. **Integrity Validation:** Agreed. Before any write operation, verify:
   - `user.church_id == group.church_id == service.church_id`.
   - The church has an active connection in `churchsuite_connections`.
   - The call uses the church's authenticated token (ensuring the `churchsuite_group_id` belongs to their account).
   - If validation fails, skip and log.
7. **IDs & Schema:**
   - Make `groups.church_id` `NOT NULL` and enforce consistency with `service.church_id`.
   - New columns needed:
     1. **`groups.churchsuite_group_id`** (`INTEGER`, unique per church): To map VineMe groups to ChurchSuite small groups.
     2. **`group_memberships.churchsuite_member_id`** (`INTEGER`, nullable): Returned by ChurchSuite `POST /smallgroups/members`, required for `DELETE /smallgroups/members/{id}`.

---

### Answers to Questions

#### 1. Small Groups vs. Rotas / Ministries
* **Use Small Groups (`/smallgroups`).**
* VineMe groups map 1:1 to ChurchSuite Small Groups. Use `POST /smallgroups/members` and `DELETE /smallgroups/members/{id}`. Do not use the Rotas module.

#### 2. What the Hourly Cron Pulls & Source of Truth
* **Direction of Truth:** ChurchSuite is the primary source of truth for Groups.
  - Groups will no longer be created inside VineMe. Hide/disable the group creation UI in VineMe (`group/create.tsx`, `CreateGroupModal.tsx`, and admin buttons). Groups will be created in ChurchSuite and synced down to VineMe.
* **Groups Import / Updates:**
  - The hourly cron calls `GET /smallgroups/groups` for each connected church.
  - Pull and upsert group fields into VineMe: `title` (from CS `name`), `description`, `meeting_day` (capitalise CS lowercase day; fallback to default if "various days"), `meeting_time` (from CS `time`), `location` (name, address, lat, lng, url), and image URLs.
  - **Handling `service_id`:** ChurchSuite groups do not contain VineMe `service_id`s (only `site_ids`). Make `groups.service_id` nullable for imported groups. In the VineMe Admin Groups screen (`admin/manage-groups.tsx`), show unassigned groups so church admins can assign them to a service. If a group has not yet been assigned a `service_id`, keep it in `pending` status so regular members don't see an unassigned group.
* **Two-Way User / Contact Sync:**
  - Pull contact updates from ChurchSuite if they have changed. If a contact's details change in ChurchSuite, update `users.first_name`, `last_name`, and name in VineMe.
  - When members are updated or added directly in ChurchSuite: if the ChurchSuite member's `contact_id` matches an existing VineMe user (`users.churchsuite_id`), sync the active membership into `group_memberships`. If the contact does not exist as a user in VineMe, skip creating a membership in VineMe.

#### 3. Church Sign-up & Connection
* Keep the existing user-facing "Request a Church" flow. No new public signup screen is required.
* When a church is created in Supabase, require credentials to be saved in `churchsuite_connections` before marking the church as active/visible in VineMe.

#### 4. Existing Groups & Transition Period
* VineMe groups that do not yet have a `churchsuite_group_id` should display a `"No link to ChurchSuite"` badge in the admin panel.
* Keep the ChurchSuite CSV export functionality during the transition so admins can export any legacy groups if needed.
* Only **active** group members sync to ChurchSuite. Pending requests remain purely internal to VineMe until approved by a leader/admin.

---

**User**

ok to answer your questions:
1. We are only going to attach a group to a service in vineme. It looks like churchsuite only links a group to a site (not a service) which we dont really handle. So you're totally right: we can leave a group's service nullable, and then we will have to attach it to a service within vineme. We don't really need to have a service on a group for it to function -- at the moment i think its just really a kind of label.

2. This totally makes sense. I agree.

3. You are totally right. What we should do is when a user (that is not already in the VM auth users list) is added to a group, we should add an auth account for them in vineme. This works similarly to the referral journey: an auth account is created by another user when they are referred.

4. You'll find that the options for the day of the week is actually a strict set of strings, so we are fine. they are lower case days of the week + the option of 'various days'. How do we handle this do you think? Like when we are filtering by day of week on the map/list?

5. you can decide/figure this out.

Ok either ask me more questions or give me a fuller response for claude.

---

**Cursor**

Here is the full breakdown of how to handle the new points (especially **Points 3, 4, and 5**), followed by a **complete, tidy, and comprehensive response ready to send directly to Claude**.

---

### How We Handle Points 3, 4, and 5

#### 1. Auto-Provisioning Auth Users from ChurchSuite (Point 3)
* **The Flow:**
  1. When the sync job encounters a member in a ChurchSuite group who isn't linked yet (`users.churchsuite_id` does not exist in VineMe), it fetches their contact details from ChurchSuite (`first_name`, `last_name`, `email`, `mobile`).
  2. It follows the exact pattern already established in VineMe’s `create-referred-user` Edge Function:
     * Calls `supabase.auth.admin.createUser({ email, phone, user_metadata: { first_name, last_name, church_id } })` (or `inviteUserByEmail` if email invitations are preferred).
     * Upserts into `public.users` with `first_name`, `last_name`, `church_id`, `churchsuite_id`, and `onboarding_complete = false` (or `newcomer = false`).
     * Creates the `group_memberships` row with `status = 'active'`, `role = 'member'`, and `churchsuite_member_id`.
  3. **The Benefit:** When that person eventually opens VineMe and logs in with their phone number or email OTP, Supabase links them straight into their existing account, church, and group!

#### 2. Meeting Day & "Various Days" (Point 4)
* **Database Check Constraint:**
  * Postgres currently has: `CHECK (meeting_day IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'))`.
  * We will update this constraint in the migration to allow `'Various Days'` (and optionally make `meeting_day` nullable or default to `'Various Days'` if null/empty).
* **Capitalisation:**
  * Map ChurchSuite's lowercase strings (`'monday'` $\to$ `'Monday'`) and `'various days'` $\to$ `'Various Days'`.
* **Filtering on Map & List:**
  * In the filter drawer (`groupFilters.ts` / `GroupFilterModal`), add **"Various Days"** alongside the days of the week.
  * **Search & Filter behavior:** If a user filters by a specific day (e.g. Wednesday), groups marked "Various Days" can either:
    1. Only show when "Various Days" is selected or when no day filter is active (recommended — cleanest user experience so specific day searches remain accurate).
    2. Or be included under an "Open / Flexible Schedule" section.

#### 3. Where Group Creation Will Be Disabled (Point 5)
* In the mobile app:
  1. `src/app/(tabs)/groups.tsx`: Hide the floating/header "+" (Create Group) button.
  2. `src/app/(tabs)/index.tsx`: Hide the "Create Group" action card for leaders.
  3. `src/app/admin/manage-groups.tsx`: Hide the "Add Group" button.
  4. `src/app/group/create.tsx`: Show a polite banner/state: *"Groups are now managed directly in ChurchSuite. New groups created in ChurchSuite will sync automatically."*

---

### Prepared Response Ready to Send to Claude

*(Copy and paste the text below into your chat with Claude)*

***

## Answers & Final Technical Specifications

### Core Clarifications & Decisions

1. **Small Groups Module (`/smallgroups`):**
   * Yes, link VineMe groups to **ChurchSuite Small Groups**, not Rotas/Ministries. Use `POST /smallgroups/members` and `DELETE /smallgroups/members/{id}`.
2. **`service_id` on Groups is Nullable:**
   * ChurchSuite groups only link to sites, not services. We will make `groups.service_id` nullable in Supabase.
   * Groups imported from ChurchSuite will have `service_id = null`. In VineMe, a service is essentially a label/filter, so groups will function fine without one. Church admins can optionally assign a service later via `admin/manage-groups.tsx`.
3. **Database Schema & Required Columns:**
   * `groups.churchsuite_group_id` (`INTEGER`, nullable, unique per church).
   * `groups.church_id` (`UUID`, `NOT NULL`, foreign key to `churches(id)`).
   * `group_memberships.churchsuite_member_id` (`INTEGER`, nullable): Store the unique membership ID returned by ChurchSuite's `POST /smallgroups/members` so subsequent deletions can call `DELETE /smallgroups/members/{id}` directly.
   * `groups.meeting_day`: Update the Postgres check constraint to allow `'Various Days'` in addition to the standard days of the week.
4. **Auto-Provisioning Auth Users from ChurchSuite (Two-Way Sync):**
   * If a contact is added to a group in ChurchSuite and synced to VineMe, but does not yet exist in VineMe's `auth.users`:
     * Fetch their contact info from ChurchSuite (`first_name`, `last_name`, `email`, `phone`).
     * Use the service-role client to create an auth account (`supabase.auth.admin.createUser`) and a `public.users` profile (linked with `churchsuite_id` and `church_id`), identical to how `create-referred-user` operates.
     * Insert their active `group_memberships` record.
     * When the user later logs in to VineMe with their phone/email, they will automatically match to this account and find their group already there.
5. **Day of the Week & "Various Days" Handling:**
   * Normalize incoming ChurchSuite days by capitalizing them (`'monday'` $\to$ `'Monday'`) and converting `'various days'` to `'Various Days'`.
   * Add `"Various Days"` as an explicit filter chip in the group filter options. When a user filters by a specific day (e.g. Wednesday), only Wednesday groups show; selecting "Various Days" shows flexible groups.
6. **Disabling Group Creation in VineMe:**
   * ChurchSuite will be the sole source of truth for creating groups.
   * Hide the "Create Group" buttons across the app:
     - `src/app/(tabs)/groups.tsx` (header & FAB)
     - `src/app/(tabs)/index.tsx` (leader action card)
     - `src/app/admin/manage-groups.tsx` (admin create button)
     - Route `src/app/group/create.tsx` should display an informational banner explaining that groups are managed in ChurchSuite.
7. **Transition Period & Legacy Groups:**
   * Legacy VineMe groups that do not yet have a `churchsuite_group_id` will display a `"No link to ChurchSuite"` badge in the admin panel.
   * Keep the CSV export tool active during the transition.
8. **Contact Creation Rollout Gate & Matching Fixes (`create-churchsuite-contact`):**
   * Remove `ALLOWED_EMAIL_DOMAIN = '@vineme.app'` so all signups sync.
   * Fix phone number normalization (safely strip prefix `+44`/`44` at the start rather than `.replace('44', '0')`).
   * Fix email lookup to read `authUserData.user.email` instead of `new_email`.
   * Search phone first, then email, verifying the returned contact actually matches before linking to prevent false fuzzy matches.
9. **Membership Trigger:**
   * Add a Postgres trigger on `public.group_memberships` that calls `sync-churchsuite-group-membership` via `pg_net`.
   * Only **active** members sync (`POST` on insert/update to active, `DELETE` on inactive/archived/deleted). Pending requests stay internal to VineMe until approved.
   * Perform integrity checks before executing any ChurchSuite API write (`user.church_id == group.church_id`, valid active connection, etc.).
10. **Hourly Cron Job:**
    * Schedule via `pg_cron` (`0 * * * *`) calling an Edge Function via `pg_net`.
    * Pulls group updates, creates new groups in VineMe, pulls member updates, and creates missing auth users as outlined above.

We are ready to proceed with structuring the project phases and GitHub issues based on this specification.

---

**User**

This is good, but could you be more verbose, like I have been. Spare no detail. I explained things in detail for clarity so be verbose please.

---

**Cursor**

Here is a fully detailed, comprehensive, and exhaustive response formatted and ready to send directly to Claude. It elaborates on every architectural nuance, database constraint, API payload detail, edge case, and user flow.

***

# Comprehensive Architectural & Implementation Specification: ChurchSuite Integration for VineMe

Hi Claude,

Thank you for the detailed breakdown. Your analysis of the codebase, existing triggers, and the ChurchSuite API limitations was spot-on. Below is the complete, exhaustive specification addressing all seven architectural points and the specific questions you raised. We have made definitive technical decisions on all ambiguous areas (including database schema constraints, handling unassigned services, two-way user provisioning, and group creation workflows).

---

## Part 1: Detailed Review of the 7 Architectural Requirements

### 1. ChurchSuite Functions as Edge Functions & Dedicated Group-ID Matching
* **Architecture Rule:** The rule stands as strict policy: **zero direct ChurchSuite API calls from the client application**. All communication with ChurchSuite must run through Supabase Edge Functions with authorization handled via `getChurchsuiteAccessToken` using the church's decrypted credentials stored in Supabase Vault. The client app will only ever trigger these via `supabase.functions.invoke()` or indirectly via database events.
* **Extraction of `syncChurchsuiteGroupIds`:**
  * Currently, group ID matching logic is bundled into `supabase/functions/export-groups-csv`.
  * We will extract this into an independent, reusable module/Edge Function (e.g., `sync-churchsuite-groups` or `_shared/group-sync.ts`) so both the manual CSV export and the automated hourly cron job can invoke the exact same matching, querying, and caching logic without code duplication.

### 2. Church Onboarding & Enforcing Mandatory ChurchSuite Connections
* **Clarification of Church Creation:**
  * There is currently no public church signup screen in VineMe, and we will **not** build one. The existing user-facing "Request a Church" flow (`src/services/support.ts` writing to `new_church_requests`) remains completely unchanged.
  * Church rows in `public.churches` will continue to be provisioned manually by system administrators in Supabase.
* **Enforcing the Connection:**
  * What we mean by "a church cannot exist in VineMe without its ChurchSuite link" is operational activation: **a church must have an active row in `churchsuite_connections` before it is treated as an active, usable church in the platform**.
  * When a church row is created in `public.churches`, it will initially have `visible = false` (a column already present in the schema: `supabase/migrations/20260815120000_add_visible_to_churches.sql`).
  * Once the church administrator logs in, navigates to `/admin/churchsuite`, and successfully submits their ChurchSuite Client ID and Secret (via `create_churchsuite_connection`), the church is verified and marked `visible = true`.
  * Any API queries for end-user church selection (e.g. `churchService.getChurches()`) must filter on `visible = true` and `EXISTS (SELECT 1 FROM churchsuite_connections WHERE church_id = churches.id AND is_active = true)`.

### 3. Hourly Bidirectional Cron Job (`pg_cron` $\to$ `pg_net` $\to$ Edge Function)
* **Architecture:** Replicate the pattern used by `sync-churchsuite-vulnerable-tags` (configured in migration `20260828140000_schedule_churchsuite_vulnerable_tags_sync.sql`):
  1. A `pg_cron` schedule running every hour at the top of the hour: `'0 * * * *'`.
  2. The cron job invokes a database function `trigger_sync_all_churchsuite_changes()`, which fetches the webhook secret and functions base URL from Supabase Vault, then fires a `POST` request using `net.http_post` to a new Edge Function: `sync-churchsuite-hourly`.
  3. The Edge Function loops over all active rows in `churchsuite_connections` and synchronizes changes for each church in sequence.
* **Detailed Sync Scope:** Detailed under *Question 2* below (includes group updates, member sync, and auto-provisioning new user accounts).

### 4. Find or Create ChurchSuite Contact for Every VineMe User (`create-churchsuite-contact`)
We will refactor and harden the existing `supabase/functions/create-churchsuite-contact/index.ts` and address every edge case you highlighted:
1. **Rollout Gate Removal:** Completely delete `const ALLOWED_EMAIL_DOMAIN = '@vineme.app';` and its conditional return so every user who signs up or completes onboarding triggers contact synchronization.
2. **Phone Number Normalization Bug:**
   * Currently, line 98 does: `phone ? phone.replace('44', '0') : undefined`. This is dangerous because a phone number containing `44` in the middle or end (e.g., `+447744123445`) would be corrupted.
   * **Fix:** Safely inspect the prefix. If the number starts with `+44`, strip `+44` and prepend `0`. If it starts with `44` without the plus, strip `44` and prepend `0`. Strip all non-digit characters otherwise.
3. **Email Field Selection:**
   * Currently, line 76 reads: `const { new_email: email, phone } = authUserData.user;`.
   * **Fix:** Read `const email = authUserData.user.email ?? authUserData.user.new_email;`. The primary email must be the first source of truth; `new_email` is only for pending email changes.
4. **Disambiguation & Preventing False-Positive Fuzzy Matches:**
   * ChurchSuite’s `GET /addressbook/contacts?q={query}` performs fuzzy string matching across several fields. Taking `results[0]` naively can link a user to an unrelated person who shares a similar string in their name or address.
   * **Fix:** When querying by normalized phone, inspect the returned contacts array and find the contact where `contact.mobile` or `contact.telephone` matches the normalized number. If no match is found, query by email and find the contact where `contact.email.toLowerCase() === userEmail.toLowerCase()`. Only if there is an exact match on either phone or email do we treat them as `matched` and reuse their `churchsuite_id`. Otherwise, treat them as unlinked and call `POST /addressbook/contacts` to create a fresh contact.

### 5. Real-Time Group Membership Synchronization
* **Database Trigger Strategy:**
  * As you noted, memberships are modified across multiple client services (`groups.ts`, `joinRequests.ts`, `admin.ts`, `groupCreation.ts`). Calling Edge Functions from each client service would lead to race conditions, missed updates, and duplicate network calls.
  * **Solution:** Place a Postgres trigger on `public.group_memberships` (similar to `trigger_sync_churchsuite_contact`).
  * The trigger runs `AFTER INSERT OR UPDATE OF status, role OR DELETE ON public.group_memberships` and calls a new Edge Function: `sync-churchsuite-group-membership` via `pg_net`.
* **Membership State Transitions:**
  * **When status transitions to `'active'` (and role is `'member'` or `'leader'`):**
    * Fetch the group's `churchsuite_group_id` and the user's `churchsuite_id`.
    * (If the user does not have a `churchsuite_id` yet, the Edge Function must first find/create their contact via ChurchSuite API and update `users.churchsuite_id`).
    * Issue `POST /smallgroups/members` to ChurchSuite with payload:
      ```json
      {
        "group_id": <churchsuite_group_id>,
        "person": { "type": "addressbook_contact", "id": <churchsuite_id> },
        "status": "active",
        "joined_date": "<YYYY-MM-DD>",
        "privacy": { "use_defaults": true },
        "override_capacity": true
      }
      ```
    * The ChurchSuite API returns the newly created membership object with a unique `id` (e.g. `109`).
    * **Crucial:** Save this returned `id` into `public.group_memberships.churchsuite_member_id`.
  * **When status transitions from `'active'` to `'inactive'`, `'archived'`, or the row is DELETED:**
    * Use the stored `group_memberships.churchsuite_member_id`.
    * Issue `DELETE /smallgroups/members/{churchsuite_member_id}` using that church's access token (`smallgroups.write` scope).
    * If `churchsuite_member_id` was somehow null (e.g. legacy data), the Edge Function queries `GET /smallgroups/members?group_ids[]={groupId}&contact_ids[]={contactId}`, extracts the member ID, and then issues the `DELETE`.
  * **Pending Requests:**
    * Any membership with `status = 'pending'` is strictly internal to VineMe. Do not push pending members to ChurchSuite until an admin or group leader accepts the request.

### 6. Strict Multi-Tenant Integrity & Pre-Operation Validation
Before any write or sync operation is executed against the ChurchSuite API, the Edge Function must enforce these checks:
1. **Tenant Isolation:** Ensure `user.church_id == group.church_id`. If `group.service_id` is set, ensure `service.church_id == group.church_id`.
2. **Active Connection:** Verify that `churchsuite_connections` has an active, authenticated record for `group.church_id`.
3. **Token Scoping & Ownership Validation:** Always request the token using the credentials linked to `group.church_id`. Never pass or trust an arbitrary church token supplied by the client. Because the API token is scoped to that specific church's ChurchSuite tenant, any operation referencing `churchsuite_group_id` will automatically fail with a 404/403 if the group does not belong to that church's ChurchSuite account.
4. **Site Consistency (if applicable):** If the group is attached to a service with a defined `churchsuite_site_id`, verify that the ChurchSuite group's `site_ids` array contains that site ID (or `all_sites == true`). If there is a mismatch, log a warning and skip the operation.

### 7. Database Schema Updates & ID Management
To support all requirements cleanly without adding unnecessary complexity:
1. **`public.groups` Table:**
   * `church_id`: Alter column to `NOT NULL` (run a migration to backfill any legacy nulls using `services.church_id` first).
   * `service_id`: Alter column to **`NULLABLE`** (explained below: ChurchSuite groups only know about sites, not services).
   * Add column: `churchsuite_group_id INTEGER NULL`. Add a unique constraint: `UNIQUE (church_id, churchsuite_group_id)`.
   * Update check constraint on `meeting_day`:
     ```sql
     ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_meeting_day_check;
     ALTER TABLE public.groups ADD CONSTRAINT groups_meeting_day_check
       CHECK (meeting_day IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Various Days'));
     ```
2. **`public.group_memberships` Table:**
   * Add column: `churchsuite_member_id INTEGER NULL`.
   * Add an index: `CREATE INDEX idx_group_memberships_cs_member_id ON public.group_memberships(churchsuite_member_id);`.
3. **No extra unneeded tables:** Everything maps cleanly via these existing and added ID columns.

---

## Part 2: Detailed Answers to Claude's Core Questions

### Question 1: Small Groups vs. Rotas / Ministries
* **Decision:** **Small Groups (`/smallgroups`) is 100% the correct module.**
* **Explanation:**
  * As you discovered, ChurchSuite's Rotas / Ministries module (`/rotas/ministries`) only supports `GET` endpoints for ministry members. It does not provide any `POST` or `DELETE` endpoints for members.
  * In contrast, ChurchSuite's Small Groups module provides full CRUD lifecycle support:
    * `GET /smallgroups/groups`
    * `GET /smallgroups/members`
    * `POST /smallgroups/members` (creates a membership)
    * `PUT /smallgroups/members/{id}` (updates member roles/privacy)
    * `DELETE /smallgroups/members/{id}` (removes a member from the group)
  * VineMe groups are small groups/life groups, so this maps directly to ChurchSuite's Small Groups domain. Proceed exclusively with the `/smallgroups` module with OAuth scopes `smallgroups.read` and `smallgroups.write`.

---

### Question 2: Scope of the Hourly Cron, Data Mapping, Auto-Provisioning & Decoupled `service_id`

#### A. Direction of Truth for Groups
* **ChurchSuite is the primary source of truth for Groups.**
* Moving forward, group creation within VineMe will be disabled. Church administrators will create groups in ChurchSuite, and the hourly cron job will pull them down to VineMe.
* In VineMe, we enrich the group with app-specific metadata that ChurchSuite does not support (such as WhatsApp group invite links, internal service associations, and group join request workflows).

#### B. Group Field Mapping (from `GET /smallgroups/groups`)
When the hourly cron runs, it fetches all groups for each church and upserts them into `public.groups` mapped as follows:
* `churchsuite_group_id` $\leftarrow$ `id`
* `title` $\leftarrow$ `name`
* `description` $\leftarrow$ `description ?? ''`
* `meeting_day` $\leftarrow$ Normalized and capitalized from `day`:
  * `'sunday'` $\to$ `'Sunday'`, `'monday'` $\to$ `'Monday'`, etc.
  * `'various days'` $\to$ `'Various Days'`
  * `null` or empty $\to$ default to `'Various Days'`
* `meeting_time` $\leftarrow$ `time` (if null or invalid format, default to `'19:00:00'`)
* `location` $\leftarrow$ Construct JSONB:
  ```json
  {
    "name": group.location?.name ?? "To be confirmed",
    "type": group.location?.type ?? "physical",
    "address": group.location?.address ?? "",
    "latitude": group.location?.latitude ?? null,
    "longitude": group.location?.longitude ?? null,
    "url": group.location?.url ?? null
  }
  ```
* `image_url` $\leftarrow$ `image?.large ?? image?.medium ?? image?.small ?? null`
* `status` $\leftarrow$ Map active groups to `'approved'`. If a group is archived in ChurchSuite (`ends_at` is in the past, or group is deleted/archived), set `status = 'closed'`.
* `at_capacity` $\leftarrow$ Compare `signup_options.capacity` with existing active members count, or use VineMe's existing logic.

#### C. Handling `service_id` (Decoupling)
* In ChurchSuite, groups are attached to **sites** (`site_ids: [2, 7]`), never services. A single physical site often holds multiple Sunday services (e.g. 9:30 AM and 11:30 AM).
* Therefore, the cron job cannot know which `service_id` a group belongs to.
* **Implementation:**
  * Alter `groups.service_id` to be nullable in Supabase.
  * When groups are ingested via the cron job, they are saved with `service_id = NULL`.
  * In VineMe, a service is essentially a category tag/filter for users. Groups will function normally across the app even if `service_id` is null.
  * In `src/app/admin/manage-groups.tsx`, we will provide a simple selector allowing the church admin to optionally assign or change the `service_id` for each imported group.

#### D. Auto-Provisioning Unlinked ChurchSuite Members into VineMe (Two-Way Sync)
* **Requirement:** When group members are added directly in ChurchSuite, we want those memberships reflected in VineMe. If that person does not yet have an account in VineMe, **automatically create an auth user and profile for them**.
* **Detailed Execution (reusing the pattern from `create-referred-user`):**
  1. The cron job calls `GET /smallgroups/members?group_ids[]={churchsuite_group_id}&status=active`.
  2. For each member returned:
     * Check if a user in `public.users` already has `churchsuite_id = String(member.person.id)`.
     * **If yes:** Ensure an active row exists in `public.group_memberships` with `role = 'member'`, `status = 'active'`, and `churchsuite_member_id = member.id`.
     * **If no:**
       1. Call `GET /addressbook/contacts/{member.person.id}` using the church's access token to fetch their `first_name`, `last_name`, `email`, and `mobile`.
       2. Check if an auth user already exists with that email or phone in Supabase (`auth.users`).
       3. If no auth user exists, invoke `supabase.auth.admin.createUser` (or `supabase.auth.admin.inviteUserByEmail`) with:
          ```ts
          {
            email: contact.email,
            phone: normalizePhone(contact.mobile),
            email_confirm: true,
            user_metadata: {
              first_name: contact.first_name,
              last_name: contact.last_name,
              church_id: churchId,
              provisioned_from_churchsuite: true
            }
          }
          ```
       4. Upsert the profile into `public.users`:
          ```ts
          {
            id: newAuthUser.id,
            first_name: contact.first_name,
            last_name: contact.last_name,
            church_id: churchId,
            churchsuite_id: String(member.person.id),
            newcomer: false,
            onboarding_complete: false
          }
          ```
       5. Create the row in `public.group_memberships`:
          ```ts
          {
            group_id: localGroupId,
            user_id: newAuthUser.id,
            role: 'member',
            status: 'active',
            journey_status: 3,
            joined_at: member.joined_date ?? new Date().toISOString(),
            churchsuite_member_id: member.id
          }
          ```
  3. **The User Experience:** When this person later downloads VineMe and signs in using their phone or email OTP, Supabase naturally authenticates them against this existing auth user. They will immediately see their profile, their church, and their small group ready and waiting.

#### E. Contact Metadata Updates
* If an existing user's name or contact details are modified in ChurchSuite, the hourly sync compares `first_name` and `last_name` and updates `public.users` accordingly so contact data remains in sync.

---

### Question 3: Church Sign-up & Administration Workflow
* **No new public signup screen.** The app will maintain its current architecture:
  * Users can request a church via `new_church_requests`.
  * An administrator manually creates the church row in `public.churches` (`visible = false`).
  * The church admin connects their ChurchSuite credentials under `/admin/churchsuite`.
  * Once the connection is verified and stored in Vault via `create_churchsuite_connection`, the church is flagged `visible = true` and the first sync is triggered immediately so groups populate right away without waiting an hour for the cron.

---

### Question 4: Legacy Groups, Transition Period, and Day-of-Week Handling

#### A. Legacy Groups in VineMe (Transition Period)
* In the database, existing groups that do not have a `churchsuite_group_id` will have `churchsuite_group_id = NULL`.
* In `src/app/admin/manage-groups.tsx`:
  * Groups with `churchsuite_group_id = NULL` will render a visible badge: `"Not linked to ChurchSuite"`.
  * We will retain the existing CSV Export function (`export-groups-csv`) so church admins can export legacy groups and import/recreate them into ChurchSuite if needed.
  * Once all legacy groups have been replicated in ChurchSuite and matched up, the CSV export button can eventually be retired.

#### B. Day of the Week & "Various Days"
* **Check Constraint Update:** As defined in Part 1, update the check constraint to include `'Various Days'`.
* **Capitalization:** All input from ChurchSuite's lowercase strings (`'monday'`, `'tuesday'`, etc.) is normalized via our `normalizeMeetingDay()` utility into proper case (`'Monday'`, `'Various Days'`).
* **Filtering Logic on Map and List:**
  * In `src/utils/groupFilters.ts` and the filter modal, include **"Various Days"** in the list of filterable meeting days:
    `['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Various Days']`.
  * **Behavior:** When a user selects a day filter (e.g. "Tuesday"), only groups that meet on Tuesday will show. If they select "Various Days" (or no day filter), groups with flexible/varying schedules are shown. This ensures precise day filtering while seamlessly supporting flexible groups.

---

## Part 3: UI Modifications to Disable Group Creation in VineMe

Because ChurchSuite is now the single source of truth for creating small groups, we need to disable the group creation entry points in the mobile app:

1. **`src/app/(tabs)/groups.tsx`:**
   * Hide the header/floating action button (`+`) that prompts regular users to create a group.
2. **`src/app/(tabs)/index.tsx`:**
   * Remove or conditionally hide the "Create a Group" quick action card.
3. **`src/app/admin/manage-groups.tsx`:**
   * Remove the "Add Group" / "Create Group" button. Add an informational header note:
     > *"Groups are synchronized from your ChurchSuite account. To add or rename a group, create or edit it in ChurchSuite and it will appear here automatically."*
4. **`src/app/group/create.tsx`:**
   * Guard the route: if a user navigates to this URL directly, display a clean informational view with an illustration/banner stating:
     > *"Group creation is now managed through ChurchSuite. Please contact your church administrator or create groups in your ChurchSuite portal."* with a button to return to the Groups tab.

---

## Part 4: Architectural Plan & Issue Breakdown

With all requirements clarified, we propose breaking this work down into the following structured implementation tasks / GitHub issues:

| Issue / Task | Scope & Deliverables |
| :--- | :--- |
| **Issue 1: Schema Migrations & Constraints** | 1. Add `groups.churchsuite_group_id` (`INT`, unique per church).<br>2. Add `group_memberships.churchsuite_member_id` (`INT`).<br>3. Make `groups.service_id` nullable.<br>4. Enforce `groups.church_id NOT NULL`.<br>5. Update `meeting_day` check constraint to include `'Various Days'`. |
| **Issue 2: User Contact Sync Fixes (`create-churchsuite-contact`)** | 1. Remove `@vineme.app` domain gate.<br>2. Fix phone normalization bug (safe prefix stripping).<br>3. Fix email lookup to read `auth.users.email`.<br>4. Prevent false-positive fuzzy matches by verifying exact phone/email match. |
| **Issue 3: Real-Time Membership Trigger & Edge Function** | 1. Create `sync-churchsuite-group-membership` Edge Function (`POST` & `DELETE` to `/smallgroups/members`).<br>2. Save `churchsuite_member_id` on join; use it on leave/delete.<br>3. Create Postgres trigger on `group_memberships` for active/inactive transitions.<br>4. Implement multi-tenant integrity validations before API writes. |
| **Issue 4: Hourly Cron Sync Edge Function & `pg_cron`** | 1. Create `sync-churchsuite-hourly` Edge Function.<br>2. Ingest & upsert groups from `GET /smallgroups/groups`.<br>3. Ingest active members, auto-provision missing auth users/profiles in Supabase, and link memberships.<br>4. Sync contact details updates.<br>5. Schedule hourly cron (`0 * * * *`) via DB migration. |
| **Issue 5: Mobile App UI & Filter Updates** | 1. Disable/hide "Create Group" buttons across `groups.tsx`, `index.tsx`, and admin screens.<br>2. Add friendly redirect/banner to `group/create.tsx`.<br>3. Add `"Various Days"` filter option in `groupFilters.ts` and filter UI.<br>4. Display `"Not linked to ChurchSuite"` badges for legacy groups in `manage-groups.tsx`. |

Please review this specification and let us know if any further details are required before beginning implementation!

***

