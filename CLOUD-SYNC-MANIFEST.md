# Nd shop — Full cloud sync manifest

Everything below syncs across browsers/devices via **Supabase `app_state`** + **realtime**, when logged in as an admin (including bypass PIN with cloud session).

## Synced — store & business data

| Group | localStorage keys | Where used |
|-------|-----------------|------------|
| **Products & inventory** | `nd_products_data` | Products tab, restock, top-up, recycle bin, hidden products, product details, user shop, financial settings |
| **Sales & register** | `nd_sales_history` | Register, sales table, sales book, delete sales, payout purchase, yearly overview, tax records, AI context |
| **Orders & cart** | `nd_requests_data`, `nd_user_cart_data` | Request tab, user cart, manage users, payout, AI |
| **Debt** | `nd_debt_requests`, `nd_debtor_notes` | Debt requests, debtor book, pay debt, AI |
| **Expenses & finance** | `nd_expenses_notebook`, `nd_Tax_records`, `nd_income_allocations`, `nd_payout_rate`, `nd_payout_enabled`, `nd_reward_purchase_enabled` | Expenses notebook, tax records, income structure, financial settings, restock |
| **Messaging** | `nd_messages`, `nd_pinned_chats`, `nd_blocked_messaging_users` | Admin inbox, user chat (+ Supabase `messages` inserts) |
| **Community** | `nd_comm_messages`, `nd_comm_settings` | Community feed (+ Supabase `community_messages` inserts) |
| **AI mode** | `nd_ai_chat_threads`, `nd_ai_chat_history`, `nd_user_ai_chat_threads` | Admin AI mode, user AI / credit AI chat history |
| **Users** | `nd_users`, `nd_user_last_seen` | Manage users, customer insights, receipts, auth cache |
| **Branding** | `nd_shop_name`, `nd_shop_owner_phone` | Logo, contact owner, receipts, AI prompts |
| **Banking** | `nd_bank_account_num`, `nd_bank_account_name`, `nd_bank_name` | Debtor book, pay debt |
| **System** | `nd_maintenance_mode`, `nd_last_backup_date` | Maintenance gate, backup timestamp |

## Not synced — device / security (by design)

| Keys | Reason |
|------|--------|
| `nd_admin_pwd`, `nd_admin_id`, `nd_admin_name`, `nd_admin_locks`, `nd_delete_pin` | Local admin security |
| `nd_admin_cloud_login`, `nd_admin_cloud_password`, `nd_admin_cloud_login_type` | Cloud sign-in cache (per device) |
| `nd_xai_api_key` | API secret |
| `nd_logged_in_user` | Current session user |
| `nd_active_tab`, `nd_admin_active_tab`, `nd_*_page_state` | UI position per device |
| `nd_comm_last_viewed_*` | Per-user read timestamps |
| `nd_storage_poll_cache`, migration flags | Internal |

## How it works

1. Any `localStorage.setItem('nd_*')` for a synced key → upsert to `app_state`.
2. Supabase realtime `app_state` changes → update localStorage → refresh open screens.
3. New messages also use `messages` / `community_messages` realtime INSERT.
4. Admin bypass PIN → `establishAdminCloudSession()` → Supabase auth → full sync.

## Files

- `cloud-sync-config.js` — registry & exclusions
- `real-time-sync.js` — bridge + Supabase channels
- `real-time-sync-handlers.js` — UI refresh for every module
- `admin/admin-cloud-session.js` — bypass → cloud auth
