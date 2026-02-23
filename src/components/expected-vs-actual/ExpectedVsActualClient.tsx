"use client";

import { useMemo, useState, Fragment } from "react";
import { Sport, Score, Region, SportEvent } from "@/types";
import { GYEONGGI_REGION_ID } from "@/lib/constants";
import {
  Target,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { formatOneDecimal } from "@/lib/number-format";

interface ExpectedVsActualClientProps {
  scores: Score[];
  sports: Sport[];
  regions: Region[];
  sportEvents: SportEvent[];
}

export function ExpectedVsActualClient({
  scores,
  sports,
  regions,
  sportEvents,
}: ExpectedVsActualClientProps) {
  const [selectedRegionId, setSelectedRegionId] = useState<string>(GYEONGGI_REGION_ID);
  const [expandedSports, setExpandedSports] = useState<Set<string>>(new Set());
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());

  const isAllMode = selectedRegionId === "ALL";

  const toggleSport = (id: string) => {
    const next = new Set(expandedSports);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedSports(next);
  };

  const toggleDivision = (key: string) => {
    const next = new Set(expandedDivisions);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedDivisions(next);
  };

  // Region ranking by actual total (for column ordering in 전체 mode)
  const regionRanking = useMemo(() => {
    return regions
      .map((r) => {
        const rs = scores.filter((s) => s.region_id === r.id);
        return {
          ...r,
          actualTotal: rs.reduce((sum, s) => sum + (s.total_score || 0), 0),
          expectedTotal: rs.reduce((sum, s) => sum + (s.expected_total_score || s.expected_score || 0), 0),
          gold: rs.reduce((sum, s) => sum + (s.gold || 0), 0),
          silver: rs.reduce((sum, s) => sum + (s.silver || 0), 0),
          bronze: rs.reduce((sum, s) => sum + (s.bronze || 0), 0),
        };
      })
      .sort((a, b) => b.actualTotal - a.actualTotal);
  }, [scores, regions]);

  // Top regions to display as columns in comparison mode
  const displayRegions = regionRanking.slice(0, 8);

  // Summary stats for the selected view
  const summaryStats = useMemo(() => {
    const src = isAllMode ? scores : scores.filter((s) => s.region_id === selectedRegionId);
    const expectedTotal = src.reduce((sum, s) => sum + (s.expected_total_score || s.expected_score || 0), 0);
    const actualTotal = src.reduce((sum, s) => sum + (s.total_score || 0), 0);
    const gold = src.reduce((sum, s) => sum + (s.gold || 0), 0);
    const silver = src.reduce((sum, s) => sum + (s.silver || 0), 0);
    const bronze = src.reduce((sum, s) => sum + (s.bronze || 0), 0);
    const achievementRate = expectedTotal > 0 ? ((actualTotal / expectedTotal) * 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0.0";
    return { expectedTotal, actualTotal, gold, silver, bronze, achievementRate };
  }, [scores, selectedRegionId, isAllMode]);

  // ── 전체 비교 모드: sport > division hierarchy with per-region data ──
  const comparisonData = useMemo(() => {
    if (!isAllMode) return [];

    const sportMap: Record<
      string,
      {
        sportId: string;
        sportName: string;
        regionData: Record<string, { expected: number; actual: number }>;
        divisions: Array<{
          division: string;
          regionData: Record<string, { expected: number; actual: number }>;
        }>;
      }
    > = {};

    scores.forEach((s) => {
      const sport = sports.find((sp) => sp.id === s.sport_id);
      if (!sportMap[s.sport_id]) {
        sportMap[s.sport_id] = {
          sportId: s.sport_id,
          sportName: sport?.name || s.sport_id,
          regionData: {},
          divisions: [],
        };
      }

      const entry = sportMap[s.sport_id];
      const exp = s.expected_total_score || s.expected_score || 0;
      const act = s.total_score || 0;

      // Sport-level region data
      if (!entry.regionData[s.region_id]) {
        entry.regionData[s.region_id] = { expected: 0, actual: 0 };
      }
      entry.regionData[s.region_id].expected += exp;
      entry.regionData[s.region_id].actual += act;

      // Division-level region data
      let div = entry.divisions.find((d) => d.division === s.division);
      if (!div) {
        div = { division: s.division, regionData: {} };
        entry.divisions.push(div);
      }
      if (!div.regionData[s.region_id]) {
        div.regionData[s.region_id] = { expected: 0, actual: 0 };
      }
      div.regionData[s.region_id].expected += exp;
      div.regionData[s.region_id].actual += act;
    });

    return Object.values(sportMap).sort((a, b) => {
      const aTotal = Object.values(a.regionData).reduce((sum, d) => sum + d.actual, 0);
      const bTotal = Object.values(b.regionData).reduce((sum, d) => sum + d.actual, 0);
      return bTotal - aTotal;
    });
  }, [scores, sports, isAllMode]);

  // ── 특정 시도 모드: detailed sport > division > event hierarchy ──
  const detailHierarchy = useMemo(() => {
    if (isAllMode) return [];

    const regionScores = scores.filter((s) => s.region_id === selectedRegionId);

    const sportMap: Record<
      string,
      {
        sportId: string;
        sportName: string;
        expectedTotal: number;
        actualTotal: number;
        gold: number;
        silver: number;
        bronze: number;
        divisions: Record<
          string,
          {
            division: string;
            expectedTotal: number;
            actualTotal: number;
            gold: number;
            silver: number;
            bronze: number;
            events: Array<{
              eventId: string;
              eventName: string;
              expectedTotal: number;
              actualTotal: number;
              gold: number;
              silver: number;
              bronze: number;
            }>;
          }
        >;
      }
    > = {};

    regionScores.forEach((s) => {
      const sport = sports.find((sp) => sp.id === s.sport_id);
      if (!sportMap[s.sport_id]) {
        sportMap[s.sport_id] = {
          sportId: s.sport_id,
          sportName: sport?.name || s.sport_id,
          expectedTotal: 0,
          actualTotal: 0,
          gold: 0,
          silver: 0,
          bronze: 0,
          divisions: {},
        };
      }

      const entry = sportMap[s.sport_id];
      const exp = s.expected_total_score || s.expected_score || 0;
      const act = s.total_score || 0;
      entry.expectedTotal += exp;
      entry.actualTotal += act;
      entry.gold += s.gold || 0;
      entry.silver += s.silver || 0;
      entry.bronze += s.bronze || 0;

      if (!entry.divisions[s.division]) {
        entry.divisions[s.division] = {
          division: s.division,
          expectedTotal: 0,
          actualTotal: 0,
          gold: 0,
          silver: 0,
          bronze: 0,
          events: [],
        };
      }

      const div = entry.divisions[s.division];
      div.expectedTotal += exp;
      div.actualTotal += act;
      div.gold += s.gold || 0;
      div.silver += s.silver || 0;
      div.bronze += s.bronze || 0;

      // Aggregate events (fix duplicate key)
      if (s.sport_event_id) {
        const se = sportEvents.find((e) => e.id === s.sport_event_id);
        const existing = div.events.find((e) => e.eventId === s.sport_event_id);
        if (existing) {
          existing.expectedTotal += exp;
          existing.actualTotal += act;
          existing.gold += s.gold || 0;
          existing.silver += s.silver || 0;
          existing.bronze += s.bronze || 0;
        } else {
          div.events.push({
            eventId: s.sport_event_id,
            eventName: se?.event_name || s.sport_event_id.split("-").pop() || s.sport_event_id,
            expectedTotal: exp,
            actualTotal: act,
            gold: s.gold || 0,
            silver: s.silver || 0,
            bronze: s.bronze || 0,
          });
        }
      }
    });

    return Object.values(sportMap).sort((a, b) => b.actualTotal - a.actualTotal);
  }, [scores, selectedRegionId, sports, sportEvents, isAllMode]);

  const pct = (actual: number, expected: number) =>
    expected > 0 ? formatOneDecimal((actual / expected) * 100) : "-";

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="glass-card p-6 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text">예상 대비 실적</h1>
            <p className="text-muted-foreground mt-1">
              시도별 예상 점수와 실제 점수를 비교하고 달성률을 확인하세요
            </p>
          </div>
          <select
            value={selectedRegionId}
            onChange={(e) => {
              setSelectedRegionId(e.target.value);
              setExpandedSports(new Set());
              setExpandedDivisions(new Set());
            }}
            className="glass rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="ALL">전체 시도 비교</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary stat cards */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="stat-card-blue p-5 rounded-xl">
          <div className="flex items-center gap-2 text-sm font-medium opacity-80 mb-1">
            <Target className="h-4 w-4" />
            예상 총점
          </div>
          <div className="text-2xl font-bold">{formatOneDecimal(summaryStats.expectedTotal)}</div>
        </div>
        <div className="stat-card-green p-5 rounded-xl">
          <div className="flex items-center gap-2 text-sm font-medium opacity-80 mb-1">
            <BarChart3 className="h-4 w-4" />
            실제 총점
          </div>
          <div className="text-2xl font-bold">{formatOneDecimal(summaryStats.actualTotal)}</div>
        </div>
        <div className="stat-card-purple p-5 rounded-xl">
          <div className="flex items-center gap-2 text-sm font-medium opacity-80 mb-1">
            <TrendingUp className="h-4 w-4" />
            달성률
          </div>
          <div className="text-2xl font-bold">{formatOneDecimal(Number(summaryStats.achievementRate))}%</div>
        </div>
        <div className="stat-card-amber p-5 rounded-xl">
          <div className="flex items-center gap-2 text-sm font-medium opacity-80 mb-1">
            메달 (금/은/동)
          </div>
          <div className="text-2xl font-bold">
            <span className="medal-gold">{formatOneDecimal(summaryStats.gold)}</span>
            {" / "}
            <span className="medal-silver">{formatOneDecimal(summaryStats.silver)}</span>
            {" / "}
            <span className="medal-bronze">{formatOneDecimal(summaryStats.bronze)}</span>
          </div>
        </div>
      </div>

      {/* Main table */}
      <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        {isAllMode ? (
          <AllRegionComparisonTable
            comparisonData={comparisonData}
            displayRegions={displayRegions}
            expandedSports={expandedSports}
            toggleSport={toggleSport}
            pct={pct}
          />
        ) : (
          <RegionDetailTable
            regionName={regions.find((r) => r.id === selectedRegionId)?.name || ""}
            detailHierarchy={detailHierarchy}
            expandedSports={expandedSports}
            expandedDivisions={expandedDivisions}
            toggleSport={toggleSport}
            toggleDivision={toggleDivision}
            summaryStats={summaryStats}
            pct={pct}
          />
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  전체 시도 비교 테이블                                              */
/* ────────────────────────────────────────────────────────────────── */

interface ComparisonSport {
  sportId: string;
  sportName: string;
  regionData: Record<string, { expected: number; actual: number }>;
  divisions: Array<{
    division: string;
    regionData: Record<string, { expected: number; actual: number }>;
  }>;
}

interface DisplayRegion {
  id: string;
  name: string;
  actualTotal: number;
  expectedTotal: number;
}

function AllRegionComparisonTable({
  comparisonData,
  displayRegions,
  expandedSports,
  toggleSport,
  pct,
}: {
  comparisonData: ComparisonSport[];
  displayRegions: DisplayRegion[];
  expandedSports: Set<string>;
  toggleSport: (id: string) => void;
  pct: (a: number, e: number) => string;
}) {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        시도별 예상 대비 실적 비교
      </h2>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-3 font-semibold sticky left-0 glass z-10 min-w-[160px]">
                종목
              </th>
              <th className="text-left p-3 font-semibold min-w-[56px]">종별</th>
              {displayRegions.map((r) => (
                <th
                  key={r.id}
                  className={`text-center p-3 font-semibold min-w-[90px] ${
                    r.id === GYEONGGI_REGION_ID ? "bg-primary/5 rounded-t-lg" : ""
                  }`}
                >
                  <div>{r.name.replace("특별", "").replace("광역", "").replace("자치", "").slice(0, 2)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((sport) => {
              const isExpanded = expandedSports.has(sport.sportId);
              return (
                <Fragment key={sport.sportId}>
                  {/* Sport header row */}
                  <tr
                    className="border-b border-border/40 bg-accent/20 hover:bg-accent/30 cursor-pointer transition-colors"
                    onClick={() => toggleSport(sport.sportId)}
                  >
                    <td className="p-3 font-semibold sticky left-0 glass z-10">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        {sport.sportName}
                        <span className="text-xs text-muted-foreground">
                          ({sport.divisions.length}개 종별)
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">전체</td>
                    {displayRegions.map((r) => {
                      const rd = sport.regionData[r.id];
                      return (
                        <td
                          key={r.id}
                          className={`p-2 text-center ${
                            r.id === GYEONGGI_REGION_ID ? "bg-primary/5" : ""
                          }`}
                        >
                          {rd && (rd.actual > 0 || rd.expected > 0) ? (
                            <CompactCell
                              expected={rd.expected}
                              actual={rd.actual}
                              rate={pct(rd.actual, rd.expected)}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Division rows */}
                  {isExpanded &&
                    sport.divisions.map((div) => (
                      <tr
                        key={`${sport.sportId}-${div.division}`}
                        className="border-b border-border/20 hover:bg-accent/10 transition-colors"
                      >
                        <td className="p-2 pl-10 sticky left-0 glass z-10" />
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 rounded text-xs bg-secondary font-medium">
                            {div.division}
                          </span>
                        </td>
                        {displayRegions.map((r) => {
                          const rd = div.regionData[r.id];
                          return (
                            <td
                              key={r.id}
                              className={`p-2 text-center ${
                                r.id === GYEONGGI_REGION_ID ? "bg-primary/5" : ""
                              }`}
                            >
                              {rd && (rd.actual > 0 || rd.expected > 0) ? (
                                <CompactCell
                                  expected={rd.expected}
                                  actual={rd.actual}
                                  rate={pct(rd.actual, rd.expected)}
                                  small
                                />
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        * 상위 8개 시도가 표시됩니다. 종목을 클릭하면 종별 상세를 볼 수 있습니다.
      </p>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  특정 시도 상세 테이블                                              */
/* ────────────────────────────────────────────────────────────────── */

interface DetailSport {
  sportId: string;
  sportName: string;
  expectedTotal: number;
  actualTotal: number;
  gold: number;
  silver: number;
  bronze: number;
  divisions: Record<
    string,
    {
      division: string;
      expectedTotal: number;
      actualTotal: number;
      gold: number;
      silver: number;
      bronze: number;
      events: Array<{
        eventId: string;
        eventName: string;
        expectedTotal: number;
        actualTotal: number;
        gold: number;
        silver: number;
        bronze: number;
      }>;
    }
  >;
}

function RegionDetailTable({
  regionName,
  detailHierarchy,
  expandedSports,
  expandedDivisions,
  toggleSport,
  toggleDivision,
  summaryStats,
  pct,
}: {
  regionName: string;
  detailHierarchy: DetailSport[];
  expandedSports: Set<string>;
  expandedDivisions: Set<string>;
  toggleSport: (id: string) => void;
  toggleDivision: (key: string) => void;
  summaryStats: {
    expectedTotal: number;
    actualTotal: number;
    achievementRate: string;
    gold: number;
    silver: number;
    bronze: number;
  };
  pct: (a: number, e: number) => string;
}) {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        {regionName} — 종목별 예상 대비 실적
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-3 font-semibold min-w-[200px]">종목 / 종별 / 세부종목</th>
              <th className="text-right p-3 font-semibold">예상총점</th>
              <th className="text-right p-3 font-semibold">실제총점</th>
              <th className="text-right p-3 font-semibold">달성률</th>
              <th className="text-center p-3 font-semibold">금</th>
              <th className="text-center p-3 font-semibold">은</th>
              <th className="text-center p-3 font-semibold">동</th>
            </tr>
          </thead>
          <tbody>
            {detailHierarchy.map((sport) => {
              const isExpanded = expandedSports.has(sport.sportId);
              const divisions = Object.values(sport.divisions);

              return (
                <Fragment key={sport.sportId}>
                  {/* Sport row */}
                  <tr
                    className="border-b border-border/40 bg-accent/20 hover:bg-accent/30 cursor-pointer transition-colors"
                    onClick={() => toggleSport(sport.sportId)}
                  >
                    <td className="p-3 font-semibold">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        {sport.sportName}
                        <span className="text-xs text-muted-foreground">
                          ({divisions.length}개 종별)
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold text-primary">
                      {formatOneDecimal(sport.expectedTotal)}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {formatOneDecimal(sport.actualTotal)}
                    </td>
                    <td className="p-3 text-right">
                      <AchievementBadge value={pct(sport.actualTotal, sport.expectedTotal)} />
                    </td>
                    <td className="p-3 text-center medal-gold font-semibold">
                      {sport.gold || "-"}
                    </td>
                    <td className="p-3 text-center medal-silver font-semibold">
                      {sport.silver || "-"}
                    </td>
                    <td className="p-3 text-center medal-bronze font-semibold">
                      {sport.bronze || "-"}
                    </td>
                  </tr>

                  {/* Division rows */}
                  {isExpanded &&
                    divisions.map((div) => {
                      const divKey = `${sport.sportId}-${div.division}`;
                      const isDivExpanded = expandedDivisions.has(divKey);

                      return (
                        <Fragment key={divKey}>
                          <tr
                            className="border-b border-border/20 hover:bg-accent/10 cursor-pointer bg-accent/5 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDivision(divKey);
                            }}
                          >
                            <td className="p-2 pl-10">
                              <div className="flex items-center gap-2">
                                {isDivExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className="px-1.5 py-0.5 rounded text-xs bg-secondary font-medium">
                                  {div.division}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({div.events.length}개 세부종목)
                                </span>
                              </div>
                            </td>
                            <td className="p-2 text-right text-primary font-medium">
                              {formatOneDecimal(div.expectedTotal)}
                            </td>
                            <td className="p-2 text-right font-medium">
                              {formatOneDecimal(div.actualTotal)}
                            </td>
                            <td className="p-2 text-right">
                              <AchievementBadge value={pct(div.actualTotal, div.expectedTotal)} />
                            </td>
                            <td className="p-2 text-center">
                              {div.gold > 0 && <span className="medal-gold font-bold">{div.gold}</span>}
                            </td>
                            <td className="p-2 text-center">
                              {div.silver > 0 && <span className="medal-silver font-bold">{div.silver}</span>}
                            </td>
                            <td className="p-2 text-center">
                              {div.bronze > 0 && <span className="medal-bronze font-bold">{div.bronze}</span>}
                            </td>
                          </tr>

                          {/* Event rows */}
                          {isDivExpanded &&
                            div.events.map((ev) => (
                              <tr
                                key={ev.eventId}
                                className="border-b border-border/10 hover:bg-accent/5 transition-colors"
                              >
                                <td className="p-2 pl-16 text-xs text-muted-foreground">
                                  └ {ev.eventName}
                                </td>
                                <td className="p-2 text-right text-xs text-primary">
                                  {ev.expectedTotal > 0 ? formatOneDecimal(ev.expectedTotal) : "-"}
                                </td>
                                <td className="p-2 text-right text-xs">
                                  {ev.actualTotal > 0 ? formatOneDecimal(ev.actualTotal) : "-"}
                                </td>
                                <td className="p-2 text-right">
                                  <AchievementBadge
                                    value={pct(ev.actualTotal, ev.expectedTotal)}
                                    size="sm"
                                  />
                                </td>
                                <td className="p-2 text-center text-xs">
                                  {ev.gold > 0 && <span className="medal-gold">{ev.gold}</span>}
                                </td>
                                <td className="p-2 text-center text-xs">
                                  {ev.silver > 0 && <span className="medal-silver">{ev.silver}</span>}
                                </td>
                                <td className="p-2 text-center text-xs">
                                  {ev.bronze > 0 && <span className="medal-bronze">{ev.bronze}</span>}
                                </td>
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-primary/10 font-bold border-t-2 border-primary/20">
              <td className="p-3">전체 합계</td>
              <td className="p-3 text-right text-primary">
                {formatOneDecimal(summaryStats.expectedTotal)}
              </td>
              <td className="p-3 text-right">{formatOneDecimal(summaryStats.actualTotal)}</td>
              <td className="p-3 text-right">
                <AchievementBadge value={summaryStats.achievementRate} />
              </td>
              <td className="p-3 text-center medal-gold">{summaryStats.gold}</td>
              <td className="p-3 text-center medal-silver">{summaryStats.silver}</td>
              <td className="p-3 text-center medal-bronze">{summaryStats.bronze}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  공통 셀/뱃지 컴포넌트                                             */
/* ────────────────────────────────────────────────────────────────── */

/** Compact cell for the comparison table: actual / expected (rate%) */
function CompactCell({
  expected,
  actual,
  rate,
  small,
}: {
  expected: number;
  actual: number;
  rate: string;
  small?: boolean;
}) {
  const num = parseFloat(rate);
  const isValid = !isNaN(num);
  const rateColor = isValid
    ? num >= 100
      ? "text-green-600"
      : num >= 70
        ? "text-yellow-600"
        : "text-red-500"
    : "text-muted-foreground";

  return (
    <div className={small ? "leading-tight" : ""}>
      <div className={`font-semibold ${small ? "text-xs" : "text-sm"}`}>
        {formatOneDecimal(actual)}
      </div>
      <div className="text-[10px] text-muted-foreground">
        예상 {formatOneDecimal(expected)}
      </div>
      {isValid && (
        <div className={`text-[10px] font-medium ${rateColor}`}>{rate}%</div>
      )}
    </div>
  );
}

/** Achievement rate badge */
function AchievementBadge({
  value,
  size = "md",
}: {
  value: string;
  size?: "sm" | "md";
}) {
  const num = parseFloat(value);
  const isValid = !isNaN(num);
  const colorClass = isValid
    ? num >= 100
      ? "bg-green-500/15 text-green-700"
      : num >= 70
        ? "bg-yellow-500/15 text-yellow-700"
        : "bg-red-500/15 text-red-600"
    : "bg-secondary text-muted-foreground";

  const sizeClass =
    size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";

  return (
    <span className={`${sizeClass} rounded-full font-medium ${colorClass} inline-block`}>
      {isValid ? `${value}%` : "-"}
    </span>
  );
}
