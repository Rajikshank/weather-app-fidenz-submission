// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RankedCity } from "../../src/shared/contracts";
import { CityRanking } from "../../src/client/components/CityRanking";
import { CityComparisonChart } from "../../src/client/components/CityComparisonChart";
import { FactorProfileChart } from "../../src/client/components/FactorProfileChart";
import { OcularPulse } from "../../src/client/components/OcularPulse";
import { getOcularVisualState } from "../../src/client/components/ocular-visual-state";
import { OcuLoader } from "../../src/client/components/OcuLoader";
import { NearbyLocationButton } from "../../src/client/components/NearbyLocationButton";

const makeCity = (rank: number, cityName: string, score: number): RankedCity => ({
  rank,
  cityId: String(rank),
  cityName,
  country: "XX",
  description: "clear sky",
  iconCode: "01d",
  temperatureC: 22,
  feelsLikeC: 22,
  relativeHumidity: 50,
  windSpeedMps: 2,
  pressureHpa: 1012,
  visibilityM: 10000,
  observedAt: "2026-08-26T09:00:00.000Z",
  score,
  classification: "Mostly favourable",
  dominantFactor: "moisture",
  summary: "Dry air is the strongest environmental factor right now.",
  dewPointC: 12,
  factors: [
    { key: "moisture", label: "Moisture balance", stress: 0.2, weight: 0.75, deduction: 15, severity: "low" },
    { key: "airflow", label: "Airflow", stress: 0.1, weight: 0.25, deduction: 3, severity: "low" },
  ],
  algorithmVersion: "ocular-baseline",
  cacheStatus: "HIT",
  cacheAgeSeconds: 10,
});

describe("dashboard components", () => {
  it("lets a keyboard user filter and select a ranked city", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CityRanking cities={[makeCity(1, "Paris", 92), makeCity(2, "Tokyo", 80)]} selectedId="1" onSelect={onSelect} />);
    await user.type(screen.getByRole("textbox", { name: "Search cities" }), "tok");
    expect(screen.queryByRole("button", { name: /Paris/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Tokyo/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ cityName: "Tokyo" }));
  });

  it("gives the proprietary visualization an accessible textual name", () => {
    const city = makeCity(1, "Paris", 92);
    const { container } = render(<OcularPulse score={city.score} factors={city.factors} cityName={city.cityName} classification={city.classification} />);
    expect(screen.getByRole("figure", { name: "Paris Ocular Environment Pulse: score 92 out of 100" })).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "/assets/ocular-eye-v3.webp");
    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getByText("/ 100")).toBeInTheDocument();
    const scorePod = screen.getByLabelText("Comfort score 92 out of 100, Mostly favourable");
    expect(scorePod).not.toHaveTextContent("Mostly favourable");
    expect(scorePod.querySelector(".score-pod__signal svg")).toBeInTheDocument();
  });

  it("maps comfort boundaries to restrained semantic eye states", () => {
    expect(getOcularVisualState(100).name).toBe("calm");
    expect(getOcularVisualState(85).name).toBe("calm");
    expect(getOcularVisualState(84).name).toBe("watchful");
    expect(getOcularVisualState(70).name).toBe("watchful");
    expect(getOcularVisualState(69).name).toBe("elevated");
    expect(getOcularVisualState(50).name).toBe("elevated");
    expect(getOcularVisualState(49).name).toBe("stressed");
    expect(getOcularVisualState(30).name).toBe("stressed");
    expect(getOcularVisualState(29).name).toBe("severe");
    expect(getOcularVisualState(15).tintOpacity).toBeGreaterThanOrEqual(0.4);
    expect(getOcularVisualState(-20).name).toBe("severe");
  });

  it("keeps long city names available without removing ranking controls", () => {
    const longName = "San Fernando del Valle de Catamarca";
    render(<CityRanking cities={[makeCity(1, longName, 92)]} selectedId="1" onSelect={vi.fn()} />);
    expect(screen.getByText(longName)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Best first" })).toBeInTheDocument();
  });

  it("renders meaningful comparison and factor charts", () => {
    const city = makeCity(1, "Paris", 92);
    const { container } = render(<><CityComparisonChart cities={[city]} selectedId={city.cityId} /><FactorProfileChart factors={city.factors} /></>);
    expect(screen.getByRole("heading", { name: "Comfort landscape" })).toBeInTheDocument();
    expect(screen.getByLabelText("Environmental stress profile")).toBeInTheDocument();
    expect(container.querySelectorAll(".recharts-wrapper").length).toBeGreaterThanOrEqual(2);
  });

  it("announces the proprietary loading state", () => {
    const { container } = render(<OcuLoader message="Reading test observations…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Reading test observations…");
    expect(screen.getByRole("progressbar", { name: "Loading observations" })).toHaveAttribute("aria-valuenow");
    expect(container.querySelector(".ocu-loader__sensor")).toBeInTheDocument();
    expect(container.querySelector(".ocu-loader img")).not.toBeInTheDocument();
  });

  it("makes nearby permission and selection state explicit", async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    const { rerender } = render(<NearbyLocationButton status="idle" onRequest={onRequest} />);
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    expect(onRequest).toHaveBeenCalledOnce();

    rerender(<NearbyLocationButton status="success" cityName="Colombo" message="Nearby observation selected." active onRequest={onRequest} />);
    expect(screen.getByRole("button", { name: "Near Colombo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Nearby observation selected.");
  });
});
