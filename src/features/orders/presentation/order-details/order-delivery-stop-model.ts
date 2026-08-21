export function deliveryStopAddress(snapshot: unknown) {
  try {
    const value =
      typeof snapshot === "string"
        ? (JSON.parse(snapshot) as Record<string, unknown>)
        : (snapshot as Record<string, unknown>);
    return String(value?.address ?? "العنوان غير مضاف");
  } catch {
    return "العنوان غير مضاف";
  }
}
