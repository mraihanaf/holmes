import { driver, type Driver, type DriveStep } from "driver.js";

let activeTour: Driver | null = null;

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

function step(
  element: string,
  title: string,
  description: string,
  side: Side = "right",
  align: Align = "start",
): DriveStep {
  return {
    element,
    popover: { title, description, side, align },
  };
}

function centered(title: string, description: string): DriveStep {
  return {
    popover: { title, description },
  };
}

export function startFeatureTour(cityCount: number) {
  if (activeTour?.isActive()) return;

  const visible = (selector: string) => {
    const element = document.querySelector(selector);
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const steps: DriveStep[] = [
    centered(
      "HOLMES · EARTH SYSTEM DETECTIVE",
      `Ask the planet a question. The globe is the answer surface: ${cityCount.toLocaleString()} cities, 10 NASA climate variables, and a statistical evidence file for each city.`,
    ),
  ];
  const add = (
    selector: string,
    title: string,
    description: string,
    side: Side = "right",
    align: Align = "start",
  ) => {
    if (visible(selector)) steps.push(step(selector, title, description, side, align));
  };

  add(
    "#tour-map-controls",
    "Map controls",
    "Zoom, switch between the 3D globe and the 2D map, reset the camera, and turn Fire Watch on or off. The active projection stays highlighted.",
    "right",
    "center",
  );
  add(
    "#tour-lens",
    "The Lens",
    "The Lens changes what the map colors mean.<br/><b>Effect</b>: trend size. <b>Evidence</b>: confidence after FDR. <b>Agreement</b>: whether the selected variables move together. <b>Coverage</b>: how much data exists.",
  );
  add(
    "#tour-window",
    "Window",
    "Set the time span: the full 1981 to 2025 record, or the last 35, 25, or 15 years. Shorter windows react faster but are noisier. Slopes are shown per decade.",
  );
  add(
    "#tour-season",
    "Season",
    "Filter the months: all year, DJF, MAM, JJA, or SON. The trend is recomputed for the selected months.",
  );
  add(
    "#tour-variables",
    "Variables",
    "Pick one variable for a single trend, or two or more and switch MODE to COMBINED for a standardized composite. AOD starts in 2001, so the window adjusts automatically.",
  );
  add(
    "#tour-layers",
    "Layers",
    "Show or hide city footprints, Fire Watch detections, the MERRA cell grid, city labels, and the night side.",
  );
  add(
    "#tour-city-search",
    "Find a city",
    `Search ${cityCount.toLocaleString()} cities by name, country, region, or alias. Press / to focus, use the arrow keys, and press Enter to open a city file.`,
    "top",
    "center",
  );

  if (visible("#tour-cases")) {
    add(
      "#tour-cases",
      "Starter cases",
      "Starter cases load a complete view: place, variable, window, season, and lens. Use them to see how an investigation is framed.",
      "top",
      "center",
    );
  } else {
    steps.push(
      centered(
        "Starter cases",
        "When no city is selected, starter cases load a complete view: place, variable, window, season, and lens.",
      ),
    );
  }

  if (visible("#tour-city-file")) {
    add(
      "#tour-city-file",
      "City File",
      "The City File is the evidence: verdict, slope per decade, confidence interval, p and q values, evidence stack, time-series chart, provenance, and Then & Now imagery.",
      "left",
      "start",
    );
  } else if (visible("#tour-fire-watch")) {
    add(
      "#tour-fire-watch",
      "Fire Watch",
      "Fire Watch lists NASA FIRMS hot-pixel clusters with detection counts and fire radiative power. A detection is not a confirmed wildfire.",
      "left",
      "start",
    );
  } else {
    steps.push(
      centered(
        "City File",
        "Select a city footprint or search for a city to open its evidence file: verdict, trend statistics, chart, provenance, and satellite comparison.",
      ),
    );
  }

  add(
    "#tour-methods",
    "Methods and limitations",
    "Open Methods + Limitations for the exact tests, thresholds, sources, and caveats. Use it when you need to check or defend a result.",
    "right",
    "center",
  );
  add(
    "#tour-share",
    "Share",
    "Share copies a deep link that restores the current city, variables, window, season, lens, and layers.",
    "bottom",
    "end",
  );
  add(
    "#tour-help",
    "Replay the tour",
    "Click ? to replay this tour. Press ? on the keyboard for the shortcut sheet. Help is always one click away.",
    "bottom",
    "end",
  );

  activeTour = driver({
    steps,
    animate: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 6,
    allowClose: true,
    smoothScroll: false,
    scrollIntoView: { block: "center", inline: "nearest" },
    skipMissingElement: true,
    disableActiveInteraction: true,
    overlayClickBehavior: "none",
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    popoverClass: "holmes-tour",
    nextBtnText: "NEXT",
    prevBtnText: "BACK",
    doneBtnText: "DONE",
    onDestroyed: () => {
      activeTour = null;
    },
  });
  activeTour.drive();
}
