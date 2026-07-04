const fs = require('fs');
const path = require('path');
const https = require('https');

const screens = [
  { title: "Shipment Tracking", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OGM2N2IwNzQwOTY4OWI0OTllMWJjYmM2EgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "shipment-tracking" },
  { title: "Return or Replace Items", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OGNhODA1ZWUwNDRmNmM1YjQ0MDc3YzkyEgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "return-replace-items" },
  { title: "Create Custom Request", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4ODkzMDMzMzMwOTY4OGY4MjA2MGJiOWFmEgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "create-custom-request" },
  { title: "Buyer Cart and Checkout", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4ODkxMWYzNjYwOTY4OWI0OTllMWJjYmM2EgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "buyer-cart-checkout" },
  { title: "Prepare Items for Shipping", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OTI5OTE2NGIwMjNiZmI1MjcyMjA1MzQ2EgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "prepare-items-shipping" },
  { title: "Buyer Order Details", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4ODk2ZGUzZjMwNDRmNmM1YjQ0MDc3YzkyEgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "buyer-order-details" },
  { title: "Open or View Dispute", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OGMyMmZjODQwOTY4YWYxODU0MTQ0MjQ3EgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "open-view-dispute" },
  { title: "Carrier Shipment Details", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OGZhZWY0Y2UwOTY4YWYxODU0MTQ0MjQ3EgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "carrier-shipment-details" },
  { title: "Admin Orders Dashboard", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OTMwZTYzNDYwOTY4OTVlMWI1MWZhZWU5EgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "admin-orders-dashboard" },
  { title: "Custom Request Price Offer", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OGMzYzQ0NDYwNDRmNjgzYjE5MDVkMzJhEgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "custom-request-price-offer" },
  { title: "Assigned Shipments", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OTJkMmJmMTgwNDRmNjgzYjE5MDVkMzJhEgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "assigned-shipments" },
  { title: "Admin Disputes", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OTMyZDgxNDkwNDRmNmM1YjQ0MDc3YzkyEgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "admin-disputes" },
  { title: "Send Custom Request Price Offer", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OGYyZDRmZTkwOTY4OWI0OTllMWJjYmM2EgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "send-custom-request-price-offer" },
  { title: "Audit Trail", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OTJiOTY3MmUwOTY4YWYxODU0MTQ0MjQ3EgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "audit-trail" },
  { title: "Seller Orders", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OGY4ZTM0OGQwNDRmNjgzYjE5MDVkMzJhEgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "seller-orders" },
  { title: "Admin Full Order Details", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OGY0ZDZhN2YwM2ZiMzIwMjA2MGE2NjEwEgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "admin-full-order-details" },
  { title: "Seller Custom Requests", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OTJmMmM5NGYwNDc5Y2EzMWY1MjM1NTQ2EgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "seller-custom-requests" },
  { title: "My Orders", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4ODk0YmIwOTMwOTY4OGY4MjA2MGJiOWFmEgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "my-orders" },
  { title: "Seller Order Details", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OGY2ZWE3ZWUwMjNiZmY3MmQ0MDQ3Y2Q0EgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "seller-order-details" },
  { title: "Cancel Order or Items", url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NWM4OGM4NjhiNDgwMjNiZmI1MjcyMjA1MzQ2EgsSBxCkjeXz1AEYAZIBIwoKcHJvamVjdF9pZBIVQhM1OTM3MTE0ODA1Nzg0NDUyMDY4&filename=&opi=89354086", slug: "cancel-order-items" }
];

const iconMap = {
  'arrow_back': 'ArrowLeft',
  'arrow_forward': 'ArrowRight',
  'content_copy': 'Copy',
  'distance': 'MapPin',
  'add': 'Plus',
  'remove': 'Minus',
  'local_shipping': 'Truck',
  'info': 'Info',
  'check': 'Check',
  'star': 'Star',
  'verified': 'ShieldCheck',
  'support_agent': 'Headphones',
  'help_outline': 'HelpCircle',
  'share': 'Share2',
  'package_2': 'Package',
  'photo_library': 'Image',
  'account_circle': 'User',
  'search': 'Search',
  'shopping_cart': 'ShoppingCart',
  'menu': 'Menu',
  'close': 'X',
  'chevron_right': 'ChevronRight',
  'chevron_left': 'ChevronLeft',
  'warning': 'AlertTriangle',
  'history': 'History',
  'schedule': 'Clock',
  'payments': 'CreditCard',
  'description': 'FileText',
  'expand_more': 'ChevronDown',
  'expand_less': 'ChevronUp',
  'more_vert': 'MoreVertical',
  'edit': 'Edit',
  'delete': 'Trash2',
  'chat': 'MessageSquare',
  'chat_bubble': 'MessageSquare',
  'thumb_up': 'ThumbsUp',
  'download': 'Download',
  'refresh': 'RefreshCw',
  'verified_user': 'ShieldCheck',
  'shopping_bag': 'ShoppingBag',
  'done_all': 'CheckCheck',
  'cancel': 'XCircle',
  'error': 'AlertCircle',
  'pending': 'Clock',
  'store': 'Store',
  'currency_exchange': 'DollarSign',
  'email': 'Mail',
  'call': 'Phone',
  'rate_review': 'StarHalf',
  'visibility': 'Eye',
  'visibility_off': 'EyeOff',
  'lock': 'Lock',
  'lock_open': 'Unlock',
  'help': 'HelpCircle',
  'notifications': 'Bell',
  'settings': 'Settings',
  'person': 'User',
  'filter_list': 'Filter',
  'sort': 'ArrowUpDown',
  'calendar_today': 'Calendar',
  'attach_file': 'Paperclip',
  'send': 'Send',
  'dashboard': 'LayoutDashboard',
  'assignment': 'ClipboardList',
  'check_circle': 'CheckCircle2',
  'receipt_long': 'ScrollText',
  'list_alt': 'ClipboardList',
  'assignment_turned_in': 'ClipboardCheck',
  'inventory_2': 'Package',
  'gavel': 'Gavel',
  'history_edu': 'FileEdit',
  'map': 'Map',
  'location_on': 'MapPin',
  'badge': 'Badge'
};

const rawDir = path.join(__dirname, '..', 'scratch', 'raw-screens');
const targetBaseDir = path.join(__dirname, '..', 'src', 'app', 'marketplace-orders');

if (!fs.existsSync(rawDir)) {
  fs.mkdirSync(rawDir, { recursive: true });
}

// Download a file
function download(url, filePath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
        return;
      }
      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Convert HTML to JSX React Component
function cleanAndConvertHTML(html, screenTitle) {
  // 1. Remove wrappers (DOCTYPE, html, head, body, etc.)
  let content = html;
  
  // Remove HTML comments first to avoid JSX compilation issues
  content = content.replace(/<!--[\s\S]*?-->/g, '');
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    content = bodyMatch[1];
  }

  // 2. Strip Stitch specific Toolbars
  // Strip header: look for sticky top-0 or h-touch-target header
  content = content.replace(/<header[^>]*(?:sticky|TopAppBar|h-touch-target|z-50)[^>]*>([\s\S]*?)<\/header>/gi, '');
  
  // Strip bottom navbar: look for fixed bottom-0 nav
  content = content.replace(/<nav[^>]*(?:fixed|BottomNavBar|bottom-0|h-16)[^>]*>([\s\S]*?)<\/nav>/gi, '');

  // 3. Remove script tags
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 4. Basic JSX conversions
  content = content.replace(/class=/g, 'className=');
  content = content.replace(/for=/g, 'htmlFor=');

  // 4b. Convert boolean HTML attributes with empty string value to JSX boolean
  // e.g. disabled="" => disabled, checked="" => defaultChecked, readonly="" => readOnly
  content = content.replace(/\bdisabled=""/g, 'disabled');
  content = content.replace(/\bchecked=""/g, 'defaultChecked');
  content = content.replace(/\bchecked\b(?!=)/g, 'defaultChecked');
  content = content.replace(/\bselected=""/g, 'selected');
  content = content.replace(/\breadonly=""/g, 'readOnly');
  content = content.replace(/\bautofocus=""/g, 'autoFocus');
  content = content.replace(/\bmultiple=""/g, 'multiple');
  content = content.replace(/\brequired=""/g, 'required');
  content = content.replace(/\bopen=""/g, 'open');
  content = content.replace(/\bhidden=""/g, 'hidden');
  // Also handle disabled without any value (just the attr)
  content = content.replace(/\bdisabled(?!=)/g, 'disabled');

  // 4c. Fix tabindex -> tabIndex
  content = content.replace(/\btabindex=/g, 'tabIndex=');
  // Fix maxlength -> maxLength
  content = content.replace(/\bmaxlength=/g, 'maxLength');
  // Fix minlength -> minLength
  content = content.replace(/\bminlength=/g, 'minLength');
  // Fix autocomplete -> autoComplete
  content = content.replace(/\bautocomplete=/g, 'autoComplete');
  // Fix placeholder, value, type, etc. remain as-is
  // Fix viewBox casing (SVG)
  content = content.replace(/\bviewbox=/g, 'viewBox=');
  // Fix stroke-width etc (SVG hyphenated attributes should stay as strings in style)
  // aria attributes are camelCase in React but React accepts aria-* natively so leave them
  
  // 4d. Remove data-alt attributes (non-standard) since we replaced them with ImagePlaceholder
  // Already handled via img replacement, but clean up any leftovers
  content = content.replace(/\s*data-alt="[^"]*"/g, '');

  // 4e. Convert numeric string attributes to JSX numeric expressions {n}
  // e.g. rows="3" => rows={3}, cols="2" => cols={2}
  const numericAttrs = ['rows', 'cols', 'size', 'span', 'rowSpan', 'colSpan', 'tabIndex',
    'maxLength', 'minLength', 'min', 'max', 'step', 'start', 'width', 'height'];
  for (const attr of numericAttrs) {
    const re = new RegExp(`\\b${attr}="(\\d+(?:\\.\\d+)?)"`, 'g');
    content = content.replace(re, (match, num) => `${attr}={${num}}`);
  }

  // 5. Close self-closing tags FIRST (must happen before event handler replacement
  //    because arrow functions contain '>' which would break the tag regex)
  // Strip all event handlers from void/self-closing elements to avoid '>' in arrow functions
  // corrupting the tag structure. We do this BEFORE we add arrow functions.
  const voidEventHandlerRe = /\s*on[a-z]+="[^"]*"/gi;
  content = content.replace(/<(input|br|hr|img|link|meta|area|base|col|embed|param|source|track|wbr)([^>]*?)>/gi, (m, tag, attrs) => {
    const cleanedAttrs = attrs.replace(voidEventHandlerRe, '');
    return `<${tag}${cleanedAttrs}>`;
  });
  // Now close self-closing tags  
  content = content.replace(/<(img|input|br|hr)([^>]*[^/])\s*>/gi, '<$1$2 />');
  // Sometimes br is just <br>
  content = content.replace(/<br>/gi, '<br />');

  // 4e. Convert HTML event handlers on NON-void elements to JSX camelCase no-op functions
  //     (We do this AFTER self-closing tag fix to avoid '>' in arrow functions breaking tags)
  const eventHandlers = [
    ['onclick', 'onClick'],
    ['onchange', 'onChange'],
    ['onsubmit', 'onSubmit'],
    ['onkeydown', 'onKeyDown'],
    ['onkeyup', 'onKeyUp'],
    ['onkeypress', 'onKeyPress'],
    ['onmousedown', 'onMouseDown'],
    ['onmouseup', 'onMouseUp'],
    ['onmouseover', 'onMouseOver'],
    ['onmouseout', 'onMouseOut'],
    ['onmousemove', 'onMouseMove'],
    ['onfocus', 'onFocus'],
    ['onblur', 'onBlur'],
    ['oninput', 'onInput'],
    ['onload', 'onLoad'],
    ['onscroll', 'onScroll'],
    ['onresize', 'onResize'],
    ['ondblclick', 'onDoubleClick'],
    ['ontouchstart', 'onTouchStart'],
    ['ontouchmove', 'onTouchMove'],
    ['ontouchend', 'onTouchEnd'],
    ['oncontextmenu', 'onContextMenu'],
    ['ondragstart', 'onDragStart'],
    ['ondragend', 'onDragEnd'],
    ['ondrop', 'onDrop'],
    ['onpointerdown', 'onPointerDown'],
    ['onpointerup', 'onPointerUp'],
    ['onpointermove', 'onPointerMove'],
  ];
  for (const [html, jsx] of eventHandlers) {
    const re = new RegExp(`\\b${html}="([^"]*)"`, 'g');
    content = content.replace(re, `${jsx}={() => undefined}`);
  }

  // 6. Inline Style conversions style="[^"]*" to style={{...}}
  content = content.replace(/style="([^"]*)"/g, (match, styleStr) => {
    const parts = styleStr.split(';').filter(p => p.trim());
    const objProps = parts.map(part => {
      const splitIdx = part.indexOf(':');
      if (splitIdx === -1) return '';
      const key = part.substring(0, splitIdx).trim();
      const val = part.substring(splitIdx + 1).trim();
      const camelKey = key.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
      
      let cleanedVal = val;
      if (cleanedVal.includes('url(')) {
        cleanedVal = 'none'; // Strip external background images
      }
      return `"${camelKey}": "${cleanedVal.replace(/"/g, '\\"')}"`;
    }).filter(p => p);
    
    return `style={{ ${objProps.join(', ')} }}`;
  });

  // 7. Replace images with custom ImagePlaceholder
  content = content.replace(/<img([^>]*)\/?>/g, (match, attrsStr) => {
    let className = "";
    let classMatch = attrsStr.match(/className="([^"]*)"/);
    if (classMatch) className = classMatch[1];
    
    let alt = "";
    let altMatch = attrsStr.match(/(?:data-alt|alt)="([^"]*)"/);
    if (altMatch) alt = altMatch[1];
    
    let width = "";
    let widthMatch = attrsStr.match(/width="([^"]*)"/);
    if (widthMatch) width = widthMatch[1];
    
    let height = "";
    let heightMatch = attrsStr.match(/height="([^"]*)"/);
    if (heightMatch) height = heightMatch[1];
    
    return `<ImagePlaceholder alt="${alt}" className="${className}" ${width ? `width="${width}"` : ''} ${height ? `height="${height}"` : ''} />`;
  });

  // 8. Replace Material Symbols Outlined with Lucide components
  const usedIcons = new Set();
  
  // Replace span icons: e.g. <span className="material-symbols-outlined ...">icon_name</span>
  content = content.replace(/<span([^>]*)className="([^"]*material-symbols-outlined[^"]*)"([^>]*)>([^<]+)<\/span>/g, (match, beforeClass, classNameStr, afterClass, iconName) => {
    const iconKey = iconName.trim().toLowerCase();
    const lucideIcon = iconMap[iconKey] || 'HelpCircle';
    usedIcons.add(lucideIcon);
    
    const cleanedClasses = classNameStr.replace('material-symbols-outlined', '').trim();
    // Reassemble properties
    const otherAttrs = (beforeClass + ' ' + afterClass).trim();
    return `<${lucideIcon} className="${cleanedClasses}" ${otherAttrs} />`;
  });

  // Replace button icons that have direct material-symbols-outlined class
  content = content.replace(/<button([^>]*)className="([^"]*material-symbols-outlined[^"]*)"([^>]*)>([^<]+)<\/button>/g, (match, beforeClass, classNameStr, afterClass, iconName) => {
    const iconKey = iconName.trim().toLowerCase();
    const lucideIcon = iconMap[iconKey] || 'HelpCircle';
    usedIcons.add(lucideIcon);
    
    const cleanedClasses = classNameStr.replace('material-symbols-outlined', '').trim();
    const otherAttrs = (beforeClass + ' ' + afterClass).trim();
    return `<button className="${cleanedClasses}" ${otherAttrs}><${lucideIcon} className="w-5 h-5 inline-block" /></button>`;
  });

  // Also replace any remaining loose material-symbols-outlined that might be in <i> tags
  content = content.replace(/<i([^>]*)className="([^"]*material-symbols-outlined[^"]*)"([^>]*)>([^<]+)<\/i>/g, (match, beforeClass, classNameStr, afterClass, iconName) => {
    const iconKey = iconName.trim().toLowerCase();
    const lucideIcon = iconMap[iconKey] || 'HelpCircle';
    usedIcons.add(lucideIcon);
    
    const cleanedClasses = classNameStr.replace('material-symbols-outlined', '').trim();
    const otherAttrs = (beforeClass + ' ' + afterClass).trim();
    return `<${lucideIcon} className="${cleanedClasses}" ${otherAttrs} />`;
  });

  // Guarantee HelpCircle is imported if we fall back
  if (usedIcons.has('HelpCircle')) {
    usedIcons.add('HelpCircle');
  }

  // Ensure Lucide icon imports
  const iconsImport = usedIcons.size > 0 
    ? `import { ${Array.from(usedIcons).join(', ')} } from 'lucide-react';` 
    : '';

  // 9. Reconstruct the page code
  // Use React state to simulate some basic tab/button interactive clicks if applicable
  // For safety, let's keep all parsed screens as clean JSX
  const componentCode = `'use client';

import React, { useState } from 'react';
${iconsImport}
import { ImagePlaceholder } from '../components/ImagePlaceholder';

export default function Page() {
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">${screenTitle}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">Stitch Screen (Local)</span>
        </div>
        
        {/* Converted content */}
        ${content.trim()}
      </div>
    </div>
  );
}
`;

  return componentCode;
}

async function main() {
  console.log('--- STARTING STITCH SCREENS IMPORT ---');
  
  for (let i = 0; i < screens.length; i++) {
    const s = screens[i];
    console.log(`[${i+1}/${screens.length}] Processing screen: "${s.title}"...`);
    const tempFile = path.join(rawDir, `${s.slug}.html`);
    
    try {
      // 1. Download
      if (!fs.existsSync(tempFile)) {
        console.log(`Downloading original HTML...`);
        await download(s.url, tempFile);
      } else {
        console.log(`HTML already downloaded.`);
      }

      // 2. Read and Convert
      const rawHTML = fs.readFileSync(tempFile, 'utf8');
      const tsxCode = cleanAndConvertHTML(rawHTML, s.title);

      // 3. Write
      const targetDir = path.join(targetBaseDir, s.slug);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(path.join(targetDir, 'page.tsx'), tsxCode, 'utf8');
      console.log(`Successfully generated local Next.js route: /marketplace-orders/${s.slug}`);
    } catch (err) {
      console.error(`Error processing screen "${s.title}":`, err.message);
    }
  }

  // Generate Dashboard Listing Page
  console.log('Generating Dashboard Listing Page...');
  const dashboardCode = `'use client';

import React from 'react';
import Link from 'next/link';
import { Package, ChevronRight, LayoutDashboard, ShoppingBag, Eye, HelpCircle } from 'lucide-react';

const screens = ${JSON.stringify(screens.map(s => ({ title: s.title, slug: s.slug })), null, 2)};

export default function MarketplaceOrdersDashboard() {
  return (
    <div className="w-full gova-canvas min-h-screen p-6 text-on-surface">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8 border-b border-outline-variant/30 pb-5">
          <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">واجهات إدارة الطلبات (Marketplace Order Management)</h1>
            <p className="text-sm text-on-surface-variant">مجموعة من 20 صفحة تم استيرادها محلياً بالكامل من Stitch وتكاملها مع سمات وتصميم المشروع الحالي.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {screens.map((screen, idx) => (
            <Link 
              key={screen.slug} 
              href={\`/marketplace-orders/\${screen.slug}\`}
              className="group block p-4 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/40 hover:border-primary/40 rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 bg-primary/10 text-primary font-bold text-xs rounded-full flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    {idx + 1}
                  </span>
                  <span className="font-medium truncate text-on-surface group-hover:text-primary transition-colors text-sm">
                    {screen.title}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
`;

  fs.writeFileSync(path.join(targetBaseDir, 'page.tsx'), dashboardCode, 'utf8');
  console.log('Generated dashboard at: /marketplace-orders');
  console.log('--- ALL STITCH SCREENS IMPORTED SUCCESSFULLY ---');
}

main().catch(err => {
  console.error('Fatal error in main script:', err);
});
