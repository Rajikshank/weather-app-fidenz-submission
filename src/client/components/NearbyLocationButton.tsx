import { LoaderCircle, LocateFixed, MapPin } from "lucide-react";

export type LocationStatus = "idle" | "requesting" | "success" | "denied" | "unsupported" | "error";

interface NearbyLocationButtonProps {
  status: LocationStatus;
  cityName?: string;
  message?: string;
  active?: boolean;
  onRequest: () => void;
}

/** Permission is requested only after an explicit click; status copy remains
 * outside the icon so location state is clear without relying on color. */
export function NearbyLocationButton({ status, cityName, message, active = false, onRequest }: NearbyLocationButtonProps) {
  const requesting = status === "requesting";
  const successful = status === "success";
  const label = requesting ? "Locating…" : successful && cityName ? `Near ${cityName}` : status === "idle" ? "Use my location" : "Try location again";

  return (
    <div className="location-control">
      <button className={`location-button ${active ? "location-button--active" : ""}`} type="button" onClick={onRequest} disabled={requesting} aria-pressed={successful ? active : undefined}>
        {requesting ? <LoaderCircle className="location-button__spinner" size={16} /> : successful ? <MapPin size={16} /> : <LocateFixed size={16} />}
        <span>{label}</span>
      </button>
      <span className="location-control__status" role="status" aria-live="polite">{message}</span>
    </div>
  );
}
