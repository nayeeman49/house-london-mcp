import { NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/api-guard";
import { callMcpTool } from "@/lib/mcp-client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const blocked = guardApiRequest(request, "map", 120);
    if (blocked) return blocked;

    const { searchParams } = new URL(request.url);
    const gridMeters = Number(searchParams.get("gridMeters") ?? "25");
    const borough = searchParams.get("borough") || undefined;
    const appSize = searchParams.get("appSize") || undefined;
    const status = searchParams.get("status") || undefined;
    const showPoints = searchParams.get("showPoints") === "true";
    const limit = Math.min(Number(searchParams.get("limit") ?? "400"), 2000);
    const postcode = searchParams.get("postcode")?.trim();

    const metricsResult = await callMcpTool("get_london_borough_map_metrics", {
      grid_meters: gridMeters,
    });

    if (!metricsResult.ok) {
      return NextResponse.json(
        { ok: false, error: metricsResult.error },
        { status: 502 },
      );
    }

    let applications: unknown[] = [];
    if (showPoints) {
      const pointsResult = await callMcpTool("get_geocoded_applications", {
        borough_name: borough,
        app_size: appSize || undefined,
        status: status || undefined,
        limit,
      });
      if (pointsResult.ok && pointsResult.result) {
        applications =
          (pointsResult.result.applications as unknown[]) ?? [];
      }
    }

    let postcodeLookup = null;
    let planitApplications: unknown[] = [];
    const planit = searchParams.get("planit") === "true";

    if (postcode) {
      const lookups = [
        callMcpTool("search_planning_constraints", { postcode }),
        callMcpTool("get_deprivation_by_postcode", { postcode }),
      ];
      if (planit) {
        lookups.push(
          callMcpTool("search_uk_planit_applications", {
            postcode,
            radius_meters: Number(searchParams.get("planitRadius") ?? "500"),
          }),
        );
      }

      const results = await Promise.all(lookups);
      const [constraintsResult, deprivationResult, planitResult] = results;

      if (planit && planitResult?.ok && planitResult.result) {
        planitApplications = Array.isArray(planitResult.result)
          ? planitResult.result
          : [];
      }

      if (constraintsResult.ok) {
        postcodeLookup = {
          ...(constraintsResult.result as Record<string, unknown>),
        };
      }

      if (deprivationResult.ok && deprivationResult.result && postcodeLookup) {
        const dep = deprivationResult.result as Record<string, unknown>;
        postcodeLookup = {
          ...postcodeLookup,
          imd: {
            imd_decile: dep.imd_decile as number | undefined,
            imd_score: dep.imd_score as number | undefined,
            lsoa_name: dep.lsoa_name as string | undefined,
          },
        };
      } else if (deprivationResult.ok && deprivationResult.result) {
        const dep = deprivationResult.result as Record<string, unknown>;
        postcodeLookup = {
          postcode: dep.postcode,
          latitude: (dep.postcode_lookup as { latitude?: number })?.latitude,
          longitude: (dep.postcode_lookup as { longitude?: number })?.longitude,
          borough_hint: dep.borough as string,
          constraints_found: [],
          imd: {
            imd_decile: dep.imd_decile as number | undefined,
            imd_score: dep.imd_score as number | undefined,
            lsoa_name: dep.lsoa_name as string | undefined,
          },
        };
      }
    }

    return NextResponse.json({
      ok: true,
      transport: metricsResult.transport,
      boroughs: metricsResult.result?.boroughs ?? [],
      data_layers: metricsResult.result?.data_layers ?? {},
      grid_meters_approx: metricsResult.result?.grid_meters_approx,
      applications,
      postcodeLookup,
      planitApplications,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Map data failed",
      },
      { status: 500 },
    );
  }
}
