# Nd shop — Sync EVERYTHING

**Rule:** Every `localStorage` key starting with `nd_` is synced to Supabase `app_state` and realtime — **no exclusions** except internal poll cache.

## Synced automatically (all `nd_*`)

| Category | Keys |
|----------|------|
| Products | `nd_products_data` |
| Sales | `nd_sales_history`, `nd_sales_history_fixed_payout_v2` |
| Orders | `nd_requests_data`, `nd_user_cart_data` |
| Debt | `nd_debt_requests`, `nd_debtor_notes` |
| Finance | `nd_expenses_notebook`, `nd_Tax_records`, `nd_income_allocations`, `nd_payout_rate`, `nd_payout_enabled`, `nd_reward_purchase_enabled` |
| Messages | `nd_messages`, `nd_pinned_chats`, `nd_blocked_messaging_users` |
| Community | `nd_comm_messages`, `nd_comm_settings`, `nd_comm_last_viewed_*` |
| AI | `nd_ai_chat_threads`, `nd_ai_chat_history`, `nd_user_ai_chat_threads` |
| Users | `nd_users`, `nd_user_last_seen`, `nd_logged_in_user` |
| Branding | `nd_shop_name`, `nd_shop_owner_phone` |
| Bank | `nd_bank_account_num`, `nd_bank_account_name`, `nd_bank_name` |
| Admin security | `nd_admin_name`, `nd_admin_id`, `nd_admin_pwd`, `nd_admin_locks`, `nd_delete_pin`, `nd_admin_cloud_*` |
| UI state | `nd_active_tab`, `nd_admin_active_tab`, `nd_user_page_state`, `nd_admin_page_state`, `nd_page_state` |
| System | `nd_maintenance_mode`, `nd_last_backup_date`, `nd_xai_api_key` |
| Migrations | `nd_migrated_*` (any migration flag) |
| **Future keys** | Any new `nd_*` key syncs automatically |

## Not synced

| Item | Reason |
|------|--------|
| `nd_storage_poll_cache` | Internal polling only (prevents loops) |
| `sessionStorage` | Browser session (not shared storage) |
| Non-`nd_` keys | Outside app namespace |

## Behaviour

- `setItem` → cloud upsert  
- `removeItem` → cloud delete  
- `clear` → deletes all synced keys from cloud  
- Admin login / bypass → `pushAllLocalStateToCloud()` uploads **all** `nd_*` keys  
