package hgh.asol.app;

import android.os.Bundle;

import com.getcapacitor.JSObject;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

/**
 * One pending notification, exactly as it arrived.
 *
 * <h2>Why the whole data map is kept</h2>
 *
 * The previous inbox reconstructed a generic record from whatever the Android
 * tray happened to still be showing — a title, a body, a tag — and inferred
 * everything else from the channel. Anything the sender attached that the tray
 * did not display was lost, which meant metadata, template id, group key, and
 * the business route could not survive a background delivery.
 *
 * This record keeps two things instead: the <em>complete, untouched</em> FCM
 * data map, and the normalized fields the native display path needs. The bridge
 * hands the untouched map back to the web layer, which maps it with exactly the
 * same domain mapper a live foreground push goes through — so a notification
 * that arrived while the process was dead produces byte-identical stored fields
 * to one that arrived while it was running.
 *
 * The normalized fields exist only so the notification can be posted correctly
 * without JavaScript. They are never the source of truth for what is stored.
 */
public final class AsolNotificationRecord {
    /** Stable, opaque, derived from uid + notificationId. */
    public final String recordId;
    /** The user this push was addressed to. Empty only for a malformed send. */
    public final String uid;
    public final String notificationId;
    public final String dedupeKey;
    public final String title;
    public final String body;
    public final String routeHref;
    public final String routeLabel;
    public final String category;
    public final String priority;
    public final String sound;
    public final String groupKey;
    public final String templateId;
    /** The ASOL channel the notification was posted on. */
    public final String channelId;
    /** Sender-declared creation time, ISO-8601. */
    public final String createdAt;
    /** When this device received it. Drives retention and ordering. */
    public final long receivedAt;
    /** The system notification id this record was posted under. */
    public final int systemNotificationId;
    /** The system notification tag this record was posted under. */
    public final String systemTag;
    /** The complete original FCM data map. */
    public final Map<String, String> data;

    private AsolNotificationRecord(Builder builder) {
        this.recordId = builder.recordId;
        this.uid = builder.uid;
        this.notificationId = builder.notificationId;
        this.dedupeKey = builder.dedupeKey;
        this.title = builder.title;
        this.body = builder.body;
        this.routeHref = builder.routeHref;
        this.routeLabel = builder.routeLabel;
        this.category = builder.category;
        this.priority = builder.priority;
        this.sound = builder.sound;
        this.groupKey = builder.groupKey;
        this.templateId = builder.templateId;
        this.channelId = builder.channelId;
        this.createdAt = builder.createdAt;
        this.receivedAt = builder.receivedAt;
        this.systemNotificationId = builder.systemNotificationId;
        this.systemTag = builder.systemTag;
        this.data = builder.data;
    }

    // ---- normalization ------------------------------------------------------

    private static final List<String> CATEGORIES = new ArrayList<String>() {{
        add("orders"); add("chat"); add("system"); add("promotions");
        add("account"); add("security"); add("delivery"); add("payment");
    }};
    private static final List<String> PRIORITIES = new ArrayList<String>() {{
        add("low"); add("normal"); add("high"); add("critical");
    }};
    private static final List<String> SOUNDS = new ArrayList<String>() {{
        add("default"); add("silent"); add("urgent");
    }};

    /**
     * Build a record from an FCM data map.
     *
     * Validation is by repair, never by rejection: a field that fails its
     * allow-list falls back to its default, because dropping the notification
     * because its `priority` was misspelled would be worse than showing it on
     * the general channel. The one field that can make a record unusable is the
     * identity, and it has three fallbacks before that happens.
     *
     * @param fallbackId FCM's own message id, used only when the sender
     *                   attached no identity of its own.
     * @return null when no identity at all could be established.
     */
    public static AsolNotificationRecord fromData(
        Map<String, String> incoming,
        String fallbackTitle,
        String fallbackBody,
        String fallbackId,
        long receivedAt
    ) {
        Map<String, String> data = new LinkedHashMap<>();
        if (incoming != null) {
            for (Map.Entry<String, String> entry : incoming.entrySet()) {
                if (entry.getKey() == null) continue;
                data.put(entry.getKey(), entry.getValue() == null ? "" : entry.getValue());
            }
        }

        String notificationId = trim(data.get("notificationId"));
        String dedupeKey = trim(data.get("dedupeKey"));
        if (notificationId.isEmpty()) notificationId = dedupeKey;
        if (notificationId.isEmpty()) notificationId = trim(fallbackId);
        if (notificationId.isEmpty()) return null;
        if (dedupeKey.isEmpty()) dedupeKey = notificationId;

        String uid = trim(data.get("uid"));
        // Ownership is mandatory. Persisting or displaying an unowned record
        // would create an orphan that can never be imported safely and could be
        // mistaken for the next authenticated account's notification.
        if (uid.isEmpty()) return null;
        String title = trim(data.get("title"));
        if (title.isEmpty()) title = trim(fallbackTitle);
        String body = trim(data.get("body"));
        if (body.isEmpty()) body = trim(fallbackBody);

        String category = oneOf(trim(data.get("category")), CATEGORIES, "system");
        String priority = oneOf(trim(data.get("priority")), PRIORITIES, "normal");
        String sound = oneOf(trim(data.get("sound")), SOUNDS, "default");
        String createdAt = trim(data.get("createdAt"));
        if (createdAt.isEmpty()) createdAt = isoTimestamp(receivedAt);

        Builder builder = new Builder();
        builder.uid = uid;
        builder.recordId = AsolNotificationInboxStore.recordId(uid, notificationId);
        builder.notificationId = notificationId;
        builder.dedupeKey = dedupeKey;
        builder.title = title;
        builder.body = body;
        builder.routeHref = trim(data.get("routeHref"));
        builder.routeLabel = trim(data.get("routeLabel"));
        builder.category = category;
        builder.priority = priority;
        builder.sound = sound;
        builder.groupKey = trim(data.get("groupKey"));
        builder.templateId = trim(data.get("templateId"));
        // The sender declares the channel, and this side resolves it too. The
        // declared value wins when it names a channel this build actually has,
        // which keeps a single answer on the wire; anything else — an older
        // sender, a channel generation this app predates, a forged value — falls
        // back to resolving locally rather than posting to a channel that does
        // not exist and losing the custom sound.
        String declaredChannel = trim(data.get("androidChannelId"));
        builder.channelId = AsolNotificationChannels.requiredChannelIds().contains(declaredChannel)
            ? declaredChannel
            : AsolNotificationChannels.resolveChannelId(
                category,
                priority,
                sound,
                trim(data.get("meta_source"))
            );
        builder.createdAt = createdAt;
        builder.receivedAt = receivedAt;
        builder.systemTag = dedupeKey.length() > 64 ? dedupeKey.substring(0, 64) : dedupeKey;
        // Stable across process deaths, because it is derived from the record id
        // rather than from a counter: a redelivery updates the same tray entry
        // instead of stacking a second copy of the same notification.
        builder.systemNotificationId = builder.recordId.hashCode();
        builder.data = data;
        return new AsolNotificationRecord(builder);
    }

    // ---- serialization ------------------------------------------------------

    /** The on-disk form. Round-trips through {@link #fromJson}. */
    public JSONObject toStorageJson() throws JSONException {
        JSONObject json = new JSONObject();
        json.put("recordId", recordId);
        json.put("uid", uid);
        json.put("notificationId", notificationId);
        json.put("dedupeKey", dedupeKey);
        json.put("title", title);
        json.put("body", body);
        json.put("routeHref", routeHref);
        json.put("routeLabel", routeLabel);
        json.put("category", category);
        json.put("priority", priority);
        json.put("sound", sound);
        json.put("groupKey", groupKey);
        json.put("templateId", templateId);
        json.put("channelId", channelId);
        json.put("createdAt", createdAt);
        json.put("receivedAt", receivedAt);
        json.put("systemNotificationId", systemNotificationId);
        json.put("systemTag", systemTag);
        JSONObject payload = new JSONObject();
        for (Map.Entry<String, String> entry : data.entrySet()) {
            payload.put(entry.getKey(), entry.getValue());
        }
        json.put("data", payload);
        return json;
    }

    public static AsolNotificationRecord fromJson(JSONObject json) {
        if (json == null) return null;
        String recordId = trim(json.optString("recordId"));
        if (recordId.isEmpty()) return null;
        Builder builder = new Builder();
        builder.recordId = recordId;
        builder.uid = trim(json.optString("uid"));
        builder.notificationId = trim(json.optString("notificationId"));
        builder.dedupeKey = trim(json.optString("dedupeKey"));
        builder.title = json.optString("title", "");
        builder.body = json.optString("body", "");
        builder.routeHref = json.optString("routeHref", "");
        builder.routeLabel = json.optString("routeLabel", "");
        builder.category = json.optString("category", "system");
        builder.priority = json.optString("priority", "normal");
        builder.sound = json.optString("sound", "default");
        builder.groupKey = json.optString("groupKey", "");
        builder.templateId = json.optString("templateId", "");
        builder.channelId = json.optString("channelId", AsolNotificationChannels.GENERAL);
        builder.createdAt = json.optString("createdAt", "");
        builder.receivedAt = json.optLong("receivedAt", 0L);
        builder.systemNotificationId = json.optInt("systemNotificationId", recordId.hashCode());
        builder.systemTag = json.optString("systemTag", builder.dedupeKey);
        Map<String, String> data = new LinkedHashMap<>();
        JSONObject payload = json.optJSONObject("data");
        if (payload != null) {
            Iterator<String> keys = payload.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                data.put(key, payload.optString(key, ""));
            }
        }
        builder.data = data;
        return new AsolNotificationRecord(builder);
    }

    /**
     * The bridge form the web layer consumes.
     *
     * `payload` is deliberately shaped like the module's `InboundPushPayload`,
     * carrying the complete original data map, so the web layer runs it through
     * the very same mapper and sanitizer a live push goes through. Nothing here
     * is a second, parallel definition of what a notification is.
     */
    public JSObject toBridgeJson() {
        JSObject data = new JSObject();
        for (Map.Entry<String, String> entry : this.data.entrySet()) {
            data.put(entry.getKey(), entry.getValue());
        }

        JSObject payload = new JSObject();
        payload.put("id", notificationId);
        payload.put("title", title);
        payload.put("body", body);
        payload.put("tag", systemTag);
        payload.put("channelId", channelId);
        payload.put("data", data);

        JSObject item = new JSObject();
        item.put("recordId", recordId);
        item.put("uid", uid);
        item.put("notificationId", notificationId);
        item.put("dedupeKey", dedupeKey);
        item.put("channelId", channelId);
        item.put("createdAt", createdAt);
        item.put("receivedAt", receivedAt);
        item.put("payload", payload);
        return item;
    }

    /** Whether this record is a silent signal rather than something to show. */
    public boolean isDataOnly() {
        if ("true".equalsIgnoreCase(trim(data.get("meta_dataOnly")))) return true;
        if ("specialty_receipt".equals(trim(data.get("meta_specialtyChatKind")))) return true;
        if (!trim(data.get("meta_receiptStatus")).isEmpty()
            && !trim(data.get("meta_targetMessageId")).isEmpty()) {
            return true;
        }
        return title.isEmpty() && body.isEmpty();
    }

    /** Extras carried by the launch Intent of the notification this posted. */
    public Bundle toIntentExtras() {
        Bundle extras = new Bundle();
        extras.putString(AsolNotificationTapProtocol.EXTRA_RECORD_ID, recordId);
        extras.putString(AsolNotificationTapProtocol.EXTRA_UID, uid);
        extras.putString(AsolNotificationTapProtocol.EXTRA_NOTIFICATION_ID, notificationId);
        return extras;
    }

    // ---- helpers ------------------------------------------------------------

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private static String oneOf(String value, List<String> allowed, String fallback) {
        return allowed.contains(value) ? value : fallback;
    }

    static String isoTimestamp(long epochMillis) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(epochMillis));
    }

    private static final class Builder {
        String recordId = "";
        String uid = "";
        String notificationId = "";
        String dedupeKey = "";
        String title = "";
        String body = "";
        String routeHref = "";
        String routeLabel = "";
        String category = "system";
        String priority = "normal";
        String sound = "default";
        String groupKey = "";
        String templateId = "";
        String channelId = AsolNotificationChannels.GENERAL;
        String createdAt = "";
        long receivedAt = 0L;
        int systemNotificationId = 0;
        String systemTag = "";
        Map<String, String> data = new LinkedHashMap<>();
    }
}
