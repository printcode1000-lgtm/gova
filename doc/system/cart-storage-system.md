# Cart Local Storage System

The shopping cart is stored only in the local `AsolDB` IndexedDB database. It does not use `localStorage`, an API, Turso, or any other cloud store.

## Storage

- AsolDB version: `8`
- Object store: `cart`
- Record key: `asol:cart:v1`
- Value: normalized `CartItem[]`

All reads and mutations use `asolDbGet` and `asolDbSet`. Mutations are serialized through an internal promise queue so rapid add/update/remove operations cannot overwrite each other with stale data.

## UI Synchronization

- Same-document components synchronize through `asol:cart:changed` and `asol:cart:item-added` events.
- Other tabs synchronize through `BroadcastChannel` when the platform supports it.
- `useCart` loads from IndexedDB asynchronously and updates the header quantity and cart page after each committed mutation.

## Platform Behavior

IndexedDB is available to the web build and Capacitor WebViews on Android and iOS. Cart contents remain on the current browser/app installation and are removed when application data is cleared.
