// TODO: Replace with actual availability check from bookings table.
// For now this is a stub: a bike is available if the dates exist and are
// in the future. The real implementation will query `bikes` + `bookings`
// (and the `create_bike_hold` window) for the given bike id and date range.

export type Availability = "available" | "unavailable" | "loading" | "idle";

export async function checkBikeAvailability(
  _bikeId: string,
  fromDate: Date | undefined | null,
  toDate: Date | undefined | null,
): Promise<boolean> {
  // Simulate small async latency so the loading state is observable.
  await new Promise((r) => setTimeout(r, 250));
  if (!fromDate || !toDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return fromDate >= today && toDate >= fromDate;
}
