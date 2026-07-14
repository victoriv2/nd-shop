# Workspace Style Guidelines & Architecture Rules

## Centralized Stock Calculations

To prevent stock level discrepancies between the User side and the Admin side, **NEVER** write custom inline calculations for remaining stock, out-of-stock states, or running-low thresholds.

Always reuse the central functions defined in `global-fixes.js`:
- `window.getRemainingProductStock(productNameOrId, variantType, excludeRequestId)`
- `window.checkProductOutOfStock(productNameOrId)`
- `window.checkProductRunningLow(productNameOrId)`

### Key Alignment Rules:
1. **Sales Mapping**: When associating sales history with products, always use `window.isSaleAssociatedWithProduct(sale, p, products)` to correctly resolve batches with different IDs and dates.
2. **Item Parsing**: Always parse sale items using `window.parseSaleItem(saleItem, knownBaseName)` to accurately strip variant structures, pricing details (e.g. `(N250)`), or parentheses without mangling product names.
3. **Pending Orders**: Central calculations must include pending orders (`nd_pending_stock_data` / `nd_requests_data`) for real-time inventory count alignment.
