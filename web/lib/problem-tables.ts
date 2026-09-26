import type { CaseId } from "./cases";
import { buildMapUrl, type MapLinkConfig } from "./map-links";
import { enrichMapLink } from "./problem-map-relations";

export type ProblemTableId = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export type ExternalLink = {
  label: string;
  url: string;
};

export type ProblemQuestion = {
  id: string;
  prompt: string;
  solution: string;
  approach: string[];
  mapLinks: MapLinkConfig[];
  sources: ExternalLink[];
  /** Evidence desk case with a pre-built MCP workflow */
  deskCase?: CaseId;
  /** Pre-filled prompt for /chat */
  chatPrompt?: string;
};

export type ProblemTable = {
  id: ProblemTableId;
  title: string;
  theme: string;
  summary: string;
  accent: string;
  questions: ProblemQuestion[];
};

export const PROBLEM_TABLES: ProblemTable[] = [
  {
    id: "A",
    title: "The completion gap",
    theme: "Permissions ≠ homes built",
    summary:
      "Approved schemes often stall before shovels hit the ground. Foundations tracks permissions; delivery lives elsewhere.",
    accent: "#f87171",
    questions: [
      {
        id: "a-completion",
        prompt: "Why don't approved homes get completed?",
        solution:
          "Planning permission is necessary but not sufficient for delivery. Foundations covers application outcomes (Permitted, Rejected, Withdrawn) — not commencements, completions, or sales. The gap between approval and occupation is driven by finance (viability, interest rates), build-out phasing, land-banking incentives, s106/CIL timing, and market absorption — none of which appear in the planning portal scrape alone.",
        approach: [
          "On the map, colour boroughs by Housing in London stock change (2014–24) and compare visually to approval rate — boroughs with high approvals but flat stock growth flag a completion bottleneck.",
          "Filter application points to Permitted + Large to see where major permissions cluster; click dots for reference IDs to cross-check on borough planning registers.",
          "Use Ask the data: \"Compare Lambeth approval rate to housing stock change\" for a borough-level narrative.",
          "Pair with GLA Planning London Datahub completion data for ground-truth build-out (external — not in Foundations).",
        ],
        deskCase: "friction",
        chatPrompt: "Compare Lambeth approval rate to housing stock change — is there a completion gap?",
        mapLinks: [
          {
            label: "Stock change vs approvals (2D)",
            metric: "housing_stock_pct_change",
            view: "2d",
            table: "A",
            problem: "completion-gap",
            requiresLayer: "housing_in_london",
          },
          {
            label: "Approval rate choropleth",
            metric: "approval_rate",
            view: "2d",
            table: "A",
          },
          {
            label: "Permitted large apps (points)",
            metric: "total_applications",
            status: "Permitted",
            appSize: "Large",
            showPoints: true,
            table: "A",
          },
        ],
        sources: [
          {
            label: "Foundations planning data",
            url: "https://foreman.house-london.uk/",
          },
          {
            label: "GLA Planning London Datahub (completions)",
            url: "https://www.london.gov.uk/programmes-strategies/planning/planning-london-datahub",
          },
          {
            label: "Housing in London (GLA)",
            url: "https://data.london.gov.uk/dataset/housing-london/",
          },
          {
            label: "MHCLG house building statistics",
            url: "https://www.gov.uk/government/collections/house-building-statistics",
          },
        ],
      },
    ],
  },
  {
    id: "B",
    title: "NPPF shock",
    theme: "Policy change → measurable shift",
    summary:
      "August NPPF revisions reshaped presumptions, design codes, and small-site expectations — testable via before/after borough metrics.",
    accent: "#fbbf24",
    questions: [
      {
        id: "b-nppf",
        prompt: "National Planning Policy Framework changes in August — what moved?",
        solution:
          "The 2024 NPPF update (published December 2024, with August consultation lineage) tightened housing delivery tests, elevated design codes, and adjusted the presumption in favour of sustainable development. In Foundations you cannot A/B test pre/post August in one click (dataset is 2022–25 pooled), but you can proxy policy friction via approval rates, decision delays, and deadline bunching — boroughs where officers rush decisions at the statutory clock often reflect KPI pressure amplified by policy churn.",
        approach: [
          "Map deadline-day share (2D) — red boroughs = highest deadline bunching; switch to 3D to see raised blocks.",
          "Compare small-site approval rate outer vs inner using the small-sites metric — NPPF small-site emphasis shows up in submission mix, not necessarily refusals.",
          "Filter Rejected applications on the map and click clusters to read descriptions — qualitative signal of design-code or policy conflicts.",
          "Open the Deadline Rush evidence desk case for a pre-built card on statutory bunching.",
        ],
        deskCase: "deadline",
        chatPrompt: "Why does Bexley decide so many applications on the statutory deadline?",
        mapLinks: [
          {
            label: "Deadline bunching (2D)",
            metric: "deadline_day_share",
            view: "2d",
            table: "B",
            problem: "nppf-deadline",
          },
          {
            label: "Small-site approval rate",
            metric: "small_site_approval_rate",
            view: "2d",
            table: "B",
          },
          {
            label: "Rejected apps — see why",
            metric: "approval_rate",
            status: "Rejected",
            showPoints: true,
            table: "B",
          },
        ],
        sources: [
          {
            label: "National Planning Policy Framework (GOV.UK)",
            url: "https://www.gov.uk/government/publications/national-planning-policy-framework--2",
          },
          {
            label: "Planning reform overview (DLUHC)",
            url: "https://www.gov.uk/government/collections/planning-reform",
          },
          {
            label: "MHCLG planning statistics",
            url: "https://www.gov.uk/government/collections/planning-statistics",
          },
          {
            label: "House London #0 — deadline bunching brief",
            url: "https://foreman.house-london.uk/",
          },
        ],
      },
    ],
  },
  {
    id: "C",
    title: "Consultation intensity",
    theme: "Documents, delay, full applications",
    summary:
      "Full applications carry more documents and longer clocks — variation reflects consultation load, not random noise.",
    accent: "#a78bfa",
    questions: [
      {
        id: "c-docs",
        prompt:
          "Planning permission and document count (consultation intensity) under the full application type — why does time taken and number of documents vary?",
        solution:
          "Foundations exposes n_documents (files on the portal tab) and days_to_decision per application. Full (Large) applications trigger statutory consultation, design review, transport/highways rounds, and s106 negotiation — each iteration adds documents and calendar time. Borough culture, committee vs delegated routes, and ward politics add variance. Document count is a proxy for consultation intensity, not a perfect workload measure (nulls when portals omit the field).",
        approach: [
          "Colour the map by avg documents per app — compare boroughs side by side in 2D.",
          "Layer avg decision days to see friction hotspots; click a borough for both stats.",
          "Filter App size → Large and show points; hover dots for status/size, click for full description.",
          "Ask the data why Bexley has high document counts for an MCP-backed borough comparison.",
        ],
        deskCase: "friction",
        chatPrompt: "Why does Bexley have high document counts compared to other boroughs?",
        mapLinks: [
          {
            label: "Documents per app (2D)",
            metric: "avg_document_count",
            view: "2d",
            table: "C",
            problem: "doc-intensity",
          },
          {
            label: "Decision delay (2D)",
            metric: "avg_decision_delay_days",
            view: "2d",
            table: "C",
          },
          {
            label: "Large apps with points",
            metric: "avg_document_count",
            appSize: "Large",
            showPoints: true,
            table: "C",
          },
        ],
        sources: [
          {
            label: "Foundations — n_documents field",
            url: "https://foreman.house-london.uk/",
          },
          {
            label: "Planning Performance Framework (timeliness KPIs)",
            url: "https://www.gov.uk/government/collections/planning-statistics",
          },
          {
            label: "RTPI — planning process explainer",
            url: "https://www.rtpi.org.uk/",
          },
        ],
      },
    ],
  },
  {
    id: "D",
    title: "Stops & costs",
    theme: "TA, viability, process attrition",
    summary:
      "Where schemes die, what temporary accommodation costs reveal, and land value vs build cost asymmetry.",
    accent: "#38bdf8",
    questions: [
      {
        id: "d-ta",
        prompt: "Temporary accommodation — improving from TA Watch?",
        solution:
          "TA pressure correlates with boroughs that approve slowly, complete slowly, or lose social units. Foundations does not ingest TA Watch directly, but IMD deprivation, housing stock change, and approval rates proxy where housing stress concentrates. Cross-reference GLA TA statistics with boroughs showing low stock growth and high repeat-application burden (same sites re-applied while families sit in TA).",
        approach: [
          "Map IMD decile + Housing in London stock change — stressed boroughs often cluster.",
          "Use postcode lookup on the map for a TA-heavy ward centroid; constraints + IMD popup.",
          "Repeat-application share flags officer time on same plots instead of net-new supply.",
        ],
        deskCase: "repeat",
        chatPrompt: "Which boroughs combine high IMD deprivation with low housing stock growth?",
        mapLinks: [
          {
            label: "Deprivation (IMD decile)",
            metric: "avg_imd_decile",
            view: "2d",
            table: "D",
            problem: "ta-pressure",
          },
          {
            label: "Stock change choropleth",
            metric: "housing_stock_pct_change",
            view: "2d",
            table: "D",
          },
          {
            label: "Repeat site burden (2D)",
            metric: "repeat_application_share",
            view: "2d",
            table: "D",
          },
        ],
        sources: [
          {
            label: "GLA — temporary accommodation statistics",
            url: "https://data.london.gov.uk/",
          },
          {
            label: "London Councils — homelessness & TA",
            url: "https://www.londoncouncils.gov.uk/",
          },
          {
            label: "English Indices of Deprivation 2025",
            url: "https://deprivation.communities.gov.uk/",
          },
        ],
      },
      {
        id: "d-pokemon",
        prompt: "Pokémon Go for real estate costs vs material cost",
        solution:
          "Land values and residual appraisals react faster than brick-and-mortar indices — \"Pokémon Go\" captures gamified land speculation: permissions and land options move on sentiment, while construction costs follow BCIS/ONS builders' indices on a lag. WhereToBuild housing gap/tightness (when loaded) vs approval rate shows boroughs where policy permits but economics don't pencil out.",
        approach: [
          "Map WhereToBuild housing gap (WTB badge must be live) against approval rate.",
          "Filter Permitted + Medium/Large points in high-gap boroughs — permissions without obvious delivery.",
          "2D view for clearer borough-to-borough comparison of tightness.",
        ],
        deskCase: "friction",
        chatPrompt: "Where does WhereToBuild housing gap diverge most from approval rate?",
        mapLinks: [
          {
            label: "Housing gap (WhereToBuild)",
            metric: "avg_housing_gap",
            view: "2d",
            table: "D",
            problem: "land-vs-material",
            requiresLayer: "wheretobuild",
          },
          {
            label: "Housing tightness",
            metric: "avg_housing_tightness",
            view: "2d",
            table: "D",
            requiresLayer: "wheretobuild",
          },
        ],
        sources: [
          {
            label: "Warwick WhereToBuild",
            url: "https://wheretobuild.warwick.ac.uk/",
          },
          {
            label: "ONS construction output price indices",
            url: "https://www.ons.gov.uk/economy/inflationandpriceindices",
          },
          {
            label: "BCIS — build cost information",
            url: "https://www.bcis.co.uk/",
          },
        ],
      },
      {
        id: "d-stops",
        prompt: "At which point in the approval process do most projects get stopped?",
        solution:
          "Foundations status field captures final outcome — not granular stage (validation, consultation, committee, s106, appeal). Attrition shows up as Withdrawn vs Rejected vs Pending. Rejected = officer/committee no; Withdrawn = applicant pull (often viability or scheme redesign). Pending backlog = pre-decision queue. Map Rejected and Withdrawn points separately to see geographic stop patterns.",
        approach: [
          "Toggle Status → Rejected, show points — click clusters for descriptions mentioning design, heritage, height.",
          "Switch to Withdrawn — often pre-committee viability exits.",
          "Borough-level approval rate ranks where stops concentrate.",
        ],
        deskCase: "friction",
        chatPrompt: "Compare Rejected vs Withdrawn applications — where do projects stop in London?",
        mapLinks: [
          {
            label: "Rejected applications map",
            metric: "approval_rate",
            status: "Rejected",
            showPoints: true,
            view: "2d",
            table: "D",
            problem: "process-stops",
          },
          {
            label: "Withdrawn applications",
            metric: "approval_rate",
            status: "Withdrawn",
            showPoints: true,
            view: "2d",
            table: "D",
          },
          {
            label: "Pending backlog",
            metric: "avg_decision_delay_days",
            status: "Pending",
            showPoints: true,
            table: "D",
          },
        ],
        sources: [
          {
            label: "Foundations application statuses",
            url: "https://foreman.house-london.uk/",
          },
          {
            label: "Planning Inspectorate — appeals data",
            url: "https://www.gov.uk/government/organisations/planning-inspectorate",
          },
        ],
      },
    ],
  },
  {
    id: "E",
    title: "Price & approvability",
    theme: "Elasticity, wards, developer behaviour",
    summary:
      "How price signals interact with where homes get approved — and what predicts yes vs no.",
    accent: "#6ee7a0",
    questions: [
      {
        id: "e-pricing",
        prompt: "How does pricing impact optimal housing allocation?",
        solution:
          "Optimal allocation (where need is highest vs where profit is highest) diverges when price elasticity differs by ward. Census household counts + IMD + housing stock change approximate demand-side need; approval rate and repeat-application share approximate supply-side friction. WhereToBuild gap layers demand pressure; Foundations approval layers policy responsiveness.",
        approach: [
          "Split view: map population (Census) vs approval rate — mismatch = misallocation signal.",
          "Postcode lookup in high-IMD, low-approval areas for constraint stack.",
          "Open Borough Friction on the evidence desk for delay and document baselines.",
        ],
        deskCase: "friction",
        chatPrompt: "How does pricing pressure affect where London approves housing?",
        mapLinks: [
          {
            label: "Population demand (Census)",
            metric: "population",
            view: "2d",
            table: "E",
            problem: "pricing-allocation",
            requiresLayer: "census2021",
          },
          {
            label: "Approval rate",
            metric: "approval_rate",
            view: "2d",
            table: "E",
          },
          {
            label: "Housing gap overlay",
            metric: "avg_housing_gap",
            view: "2d",
            table: "E",
            requiresLayer: "wheretobuild",
          },
        ],
        sources: [
          {
            label: "Nomis Census 2021",
            url: "https://www.nomisweb.co.uk/sources/census_2021",
          },
          {
            label: "GLA housing need assessments",
            url: "https://www.london.gov.uk/programmes-strategies/housing-and-land",
          },
        ],
      },
      {
        id: "e-elasticity",
        prompt:
          "How can we predict the elasticity between developers and local wards?",
        solution:
          "Treat each borough/ward as a market: submissions = supply response, approval rate = clearance price for permission. Repeat-application share measures developer persistence (inelastic incumbents re-applying same site). Small-site outer share tests London Plan elasticity. Econometric next step: regress log(approvals) on lagged prices, IMD, and transit — Foundations gives application counts; external Land Registry gives prices.",
        approach: [
          "Map repeat-application share — high = developers keep bidding same coordinates.",
          "Compare outer vs inner small-site approval (small_site_approval_rate metric).",
          "Export borough stats via map popups; feed into R/Python panel model.",
        ],
        deskCase: "repeat",
        chatPrompt: "How elastic are developers across London wards — who keeps re-applying same sites?",
        mapLinks: [
          {
            label: "Repeat applications (2D)",
            metric: "repeat_application_share",
            view: "2d",
            table: "E",
            problem: "developer-elasticity",
          },
          {
            label: "Small-site approval",
            metric: "small_site_approval_rate",
            view: "2d",
            table: "E",
          },
        ],
        sources: [
          {
            label: "HM Land Registry price paid data",
            url: "https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads",
          },
          {
            label: "Warwick WhereToBuild methodology",
            url: "https://wheretobuild.warwick.ac.uk/",
          },
        ],
      },
      {
        id: "e-correlates",
        prompt: "Correlates of approvability",
        solution:
          "Approvability correlates in Foundations data: app_size (Small > Medium > Large raw rates), borough fixed effects, consultation intensity (n_documents), deadline bunching (rushed decisions), and deprivation (IMD). Causation is mixed — affluent inner boroughs see different application mix than outer. Use multivariate regression with borough dummies; map univariate correlates first.",
        approach: [
          "Cycle metrics on map: approval rate, delay, documents, IMD — note co-movement.",
          "Filter Small + Permitted vs Large + Rejected points in same borough.",
          "Ask the data to compare Lambeth deprivation to its approval rate.",
        ],
        deskCase: "friction",
        chatPrompt: "Compare Lambeth deprivation to its approval rate — what correlates with approvability?",
        mapLinks: [
          {
            label: "Approval rate baseline",
            metric: "approval_rate",
            view: "2d",
            table: "E",
            problem: "approvability",
          },
          {
            label: "IMD vs outcomes",
            metric: "avg_imd_decile",
            view: "2d",
            table: "E",
          },
          {
            label: "Document intensity",
            metric: "avg_document_count",
            view: "2d",
            table: "E",
          },
        ],
        sources: [
          {
            label: "Foundations API & parquet",
            url: "https://foreman.house-london.uk/",
          },
          {
            label: "LSE / GLA housing economics papers",
            url: "https://www.london.gov.uk/programmes-strategies/housing-and-land/housing-research",
          },
        ],
      },
    ],
  },
  {
    id: "F",
    title: "Sustainability factor",
    theme: "Confident Planner & green signals",
    summary:
      "How much do sustainability credentials shift approval odds — and where on the map?",
    accent: "#34d399",
    questions: [
      {
        id: "f-sustainability",
        prompt:
          "How significant a factor is sustainability in housing approvals? (Building on Confident Planner)",
        solution:
          "Sustainability rarely appears as a standalone boolean in portal data — it is embedded in description text (net zero, BREEAM, heat pumps, urban greening) and constraint layers ( flood zone, conservation, TPO). Confident Planner-style confidence scores would NLP-classify descriptions; with Foundations alone, proxy via constraint search at postcode + Rejected vs Permitted keyword rates in descriptions on clicked points.",
        approach: [
          "Postcode lookup — MCP returns conservation, green belt, flood constraints; more constraints = harder sustainability bar.",
          "Show Permitted points in 2D, click descriptions mentioning energy/green.",
          "Compare approval rate in boroughs with high vs low stock change (retrofit vs greenfield dynamic).",
        ],
        deskCase: "friction",
        chatPrompt: "How significant is sustainability in London housing approvals?",
        mapLinks: [
          {
            label: "Approval rate (explore green lit areas)",
            metric: "approval_rate",
            view: "2d",
            showPoints: true,
            table: "F",
            problem: "sustainability",
          },
          {
            label: "Postcode — SE1 example constraints",
            metric: "avg_imd_decile",
            postcode: "SE1 7PB",
            view: "2d",
            table: "F",
          },
          {
            label: "Rejected — friction signal",
            metric: "approval_rate",
            status: "Rejected",
            showPoints: true,
            table: "F",
          },
        ],
        sources: [
          {
            label: "Planning Data API (constraints)",
            url: "https://www.planning.data.gov.uk/",
          },
          {
            label: "Future Homes Standard (GOV.UK)",
            url: "https://www.gov.uk/government/collections/future-homes-and-buildings-standards",
          },
          {
            label: "BREEAM UK new construction",
            url: "https://breeam.com/",
          },
        ],
      },
    ],
  },
  {
    id: "G",
    title: "Where to build & wellbeing",
    theme: "Problem DB, econometrics, happiness map",
    summary:
      "Spatial prioritisation for policymakers — and a postcode-level wellbeing lens.",
    accent: "#fb7185",
    questions: [
      {
        id: "g-where",
        prompt: "Problem DB — Where should London actually build?",
        solution:
          "Combine demand (WhereToBuild gap/tightness, Census household growth), constraint surface (Planning Data API), and policy friction (approval delay, repeat burden). Optimal build zones = high gap + moderate approval friction + low flood/greenbelt — not simply \"outer London greenfield\". HouseData Engine map layers let you visually intersect these; econometric version is a multi-criteria index with weights tuned by policymakers.",
        approach: [
          "Load WTB badge → map housing gap (2D) — red boroughs = highest demand pressure.",
          "Toggle 2D, add stock change layer mentally vs gap — underserved growth corridors.",
          "Use Problem links to cross-filter IMD (avoid deepening deprivation concentration).",
        ],
        deskCase: "pitch",
        chatPrompt: "Where should London actually build — combine gap, constraints, and friction?",
        mapLinks: [
          {
            label: "WhereToBuild gap (2D)",
            metric: "avg_housing_gap",
            view: "2d",
            table: "G",
            problem: "where-to-build",
            requiresLayer: "wheretobuild",
          },
          {
            label: "Households (Census demand)",
            metric: "households",
            view: "2d",
            table: "G",
            requiresLayer: "census2021",
          },
          {
            label: "Combined friction view",
            metric: "avg_decision_delay_days",
            view: "2d",
            table: "G",
          },
        ],
        sources: [
          {
            label: "Warwick WhereToBuild",
            url: "https://wheretobuild.warwick.ac.uk/",
          },
          {
            label: "London Plan spatial strategy",
            url: "https://www.london.gov.uk/programmes-strategies/planning/london-plan",
          },
          {
            label: "Brownfield register (Planning Data)",
            url: "https://www.planning.data.gov.uk/dataset/brownfield-land",
          },
        ],
      },
      {
        id: "g-econometric",
        prompt: "Econometric for policy maker audience",
        solution:
          "Package borough panel data: outcomes (approval_rate, delay, repeat_share) ~ predictors (IMD, gap, stock_change, population). Fixed effects for borough; cluster SE at LAD level. HouseData Engine is the descriptive front-end; export popup metrics to CSV for R/Stata. Lead with one map slide, one regression table — policymakers trust maps, analysts trust tables.",
        approach: [
          "Screenshot 2D choropleth for gap + approval side-by-side.",
          "Export a pitch from the evidence desk with a headline stat from repeat or deadline cases.",
          "MCP pulls fresh numbers — cite tool names in regression appendix.",
        ],
        deskCase: "pitch",
        chatPrompt: "Give me borough panel data for a policymaker econometric brief.",
        mapLinks: [
          {
            label: "Policy maker dashboard (2D multi-metric start)",
            metric: "avg_housing_gap",
            view: "2d",
            table: "G",
            problem: "econometric",
            requiresLayer: "wheretobuild",
          },
          {
            label: "Approval + points for case studies",
            metric: "approval_rate",
            showPoints: true,
            view: "2d",
            table: "G",
          },
        ],
        sources: [
          {
            label: "GLA City Data Strategy",
            url: "https://www.london.gov.uk/programmes-strategies/mayors-priorities-city-hall/london-data-strategy",
          },
          {
            label: "ONS Open Geography portal",
            url: "https://geoportal.statistics.gov.uk/",
          },
        ],
      },
      {
        id: "g-happiness",
        prompt:
          "Happiness meter / colouring on map — are people likely to be happy or miserable in a specific postcode?",
        solution:
          "True subjective wellbeing (ONS Annual Population Survey) is not in Foundations, but IMD 2025 + constraint load + approval friction proxy lived experience: deprivation, environmental constraints, and planning churn. Postcode lookup returns IMD decile via MCP — map boroughs by IMD for macro view, postcode for micro. Higher decile = more deprivation = \"misery risk\" in a hackathon happiness meter. Layer green Permitted dots in low-IMD boroughs for contrast.",
        approach: [
          "Colour map by IMD decile (invert: red = worse deprivation).",
          "Enter your postcode in map sidebar → fly-to + IMD in constraints popup.",
          "2D mode clearest for wellbeing choropleth; share link with postcode param.",
        ],
        deskCase: "friction",
        chatPrompt: "Are people likely to be happy or miserable at postcode E1 6AN based on IMD and planning friction?",
        mapLinks: [
          {
            label: "Happiness meter (IMD choropleth)",
            metric: "avg_imd_decile",
            view: "2d",
            table: "G",
            problem: "happiness-meter",
          },
          {
            label: "Try a postcode (E1 6AN)",
            metric: "avg_imd_decile",
            postcode: "E1 6AN",
            view: "2d",
            table: "G",
          },
          {
            label: "Green / permitted pockets",
            metric: "avg_imd_decile",
            status: "Permitted",
            showPoints: true,
            view: "2d",
            table: "G",
          },
        ],
        sources: [
          {
            label: "English Indices of Deprivation 2025",
            url: "https://deprivation.communities.gov.uk/",
          },
          {
            label: "ONS personal well-being estimates",
            url: "https://www.ons.gov.uk/peoplepopulationandcommunity/wellbeing",
          },
          {
            label: "MHCLG — IMD guidance for policymakers",
            url: "https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019",
          },
        ],
      },
    ],
  },
];

for (const table of PROBLEM_TABLES) {
  for (const question of table.questions) {
    question.mapLinks = question.mapLinks.map(enrichMapLink);
  }
}

export function getProblemTable(id: ProblemTableId): ProblemTable | undefined {
  return PROBLEM_TABLES.find((t) => t.id === id);
}

export function getProblemQuestion(tableId: ProblemTableId, questionId: string) {
  const table = getProblemTable(tableId);
  return table?.questions.find((q) => q.id === questionId);
}

/** Pre-built map URL for a table's primary exploration link */
export function primaryMapLinkForTable(id: ProblemTableId): string {
  const table = getProblemTable(id);
  const first = table?.questions[0]?.mapLinks[0];
  return first ? buildMapUrl(first) : buildMapUrl({ table: id });
}

export type ProblemMapContext = {
  table: ProblemTable;
  question: ProblemQuestion;
  mapRelation: string;
  matchingLink?: MapLinkConfig;
};

export function resolveProblemMapContext(
  tableId: ProblemTableId,
  problemSlug?: string,
  metric?: string,
): ProblemMapContext | null {
  const table = getProblemTable(tableId);
  if (!table) return null;

  const question =
    (problemSlug
      ? table.questions.find(
          (q) =>
            q.mapLinks.some((l) => l.problem === problemSlug) ||
            q.id === problemSlug ||
            q.id.includes(problemSlug),
        )
      : null) ?? table.questions[0];

  if (!question) return null;

  const matchingLink =
    (problemSlug ? question.mapLinks.find((l) => l.problem === problemSlug) : null) ??
    (metric ? question.mapLinks.find((l) => l.metric === metric) : null) ??
    question.mapLinks[0];

  return {
    table,
    question,
    mapRelation: matchingLink?.mapRelation ?? question.approach[0] ?? table.summary,
    matchingLink,
  };
}
