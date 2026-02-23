"use client";

import { useMemo, useState, Fragment } from "react";
import { Score, Sport, Region, SportEvent } from "@/types";
import { GYEONGGI_REGION_ID } from "@/lib/constants";
import {
  CalendarDays,
  Trophy,
  Medal,
  ChevronDown,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { formatOneDecimal } from "@/lib/number-format";

interface DailyResultsClientProps {
  scores: Score[];
  sports: Sport[];
  regions: Region[];
  sportEvents: SportEvent[];
}

export function DailyResultsClient({
  scores,
  sports,
  regions,
  sportEvents,
}: DailyResultsClientProps) {
  // Collect all unique dates from scores
  const availableDates = useMemo(() => {
    const dateSet = new Set<string>();
    scores.forEach((s) => {
      if (s.match_date) dateSet.add(s.match_date);
    });
    return Array.from(dateSet).sort((a, b) => b.localeCompare(a)); // newest first
  }, [scores]);

  const [selectedDate, setSelectedDate] = useState<string>(
    availableDates[0] || ""
  );
  const [expandedSports, setExpandedSports] = useState<Set<string>>(new Set());

  const toggleSport = (id: string) => {
    const next = new Set(expandedSports);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedSports(next);
  };

  // Filter scores by selected date
  const dayScores = useMemo(() => {
    if (!selectedDate) return [];
    return scores.filter((s) => s.match_date === selectedDate);
  }, [scores, selectedDate]);

  // Summary stats for the day
  const summary = useMemo(() => {
    const gg = dayScores.filter((s) => s.region_id === GYEONGGI_REGION_ID);
    return {
      totalEntries: dayScores.length,
      sportsCount: new Set(dayScores.map((s) => s.sport_id)).size,
      ggGold: gg.reduce((sum, s) => sum + (s.gold || 0), 0),
      ggSilver: gg.reduce((sum, s) => sum + (s.silver || 0), 0),
      ggBronze: gg.reduce((sum, s) => sum + (s.bronze || 0), 0),
      ggTotal: gg.reduce((sum, s) => sum + (s.total_score || 0), 0),
    };
  }, [dayScores]);

  // Group by sport → division → events with region results
  const sportGroups = useMemo(() => {
    const map: Record<
      string,
      {
        sportId: string;
        sportName: string;
        divisions: Record<
          string,
          {
            division: string;
            results: Array<{
              score: Score;
              regionName: string;
              eventName: string;
            }>;
          }
        >;
        ggTotalScore: number;
        ggGold: number;
        ggSilver: number;
        ggBronze: number;
      }
    > = {};

    dayScores.forEach((s) => {
      const sport = sports.find((sp) => sp.id === s.sport_id);
      if (!map[s.sport_id]) {
        map[s.sport_id] = {
          sportId: s.sport_id,
          sportName: sport?.name || s.sport_id,
          divisions: {},
          ggTotalScore: 0,
          ggGold: 0,
          ggSilver: 0,
          ggBronze: 0,
        };
      }

      const entry = map[s.sport_id];
      if (s.region_id === GYEONGGI_REGION_ID) {
        entry.ggTotalScore += s.total_score || 0;
        entry.ggGold += s.gold || 0;
        entry.ggSilver += s.silver || 0;
        entry.ggBronze += s.bronze || 0;
      }

      if (!entry.divisions[s.division]) {
        entry.divisions[s.division] = { division: s.division, results: [] };
      }

      const region = regions.find((r) => r.id === s.region_id);
      const se = s.sport_event_id
        ? sportEvents.find((e) => e.id === s.sport_event_id)
        : undefined;

      entry.divisions[s.division].results.push({
        score: s,
        regionName: region?.name || s.region_id,
        eventName: se?.event_name || (s.sport_event_id?.split("-").pop() ?? "-"),
      });
    });

    return Object.values(map).sort((a, b) => b.ggTotalScore - a.ggTotalScore);
  }, [dayScores, sports, regions, sportEvents]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-");
    return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
  };

  const hasData = availableDates.length > 0;

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="glass-card p-6 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text">일자별 결과</h1>
            <p className="text-muted-foreground mt-1">
              경기일자별 성적 결과를 확인하세요
            </p>
          </div>
          {hasData ? (
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-primary" />
              <select
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setExpandedSports(new Set());
                }}
                className="glass rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {formatDate(d)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>

      {!hasData ? (
        <div className="glass-card p-12 text-center animate-fade-in-up">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            일자별 데이터가 없습니다
          </h2>
          <p className="text-sm text-muted-foreground">
            성적 입력 시 경기일자(match_date)를 설정하면 이 페이지에서 일자별 결과를 확인할 수 있습니다.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="stat-card-blue p-5 rounded-xl">
              <div className="flex items-center gap-2 text-sm font-medium opacity-80 mb-1">
                <CalendarDays className="h-4 w-4" />
                당일 경기 종목
              </div>
              <div className="text-2xl font-bold">{summary.sportsCount}개 종목</div>
              <div className="text-xs text-muted-foreground mt-1">
                총 {summary.totalEntries}건 기록
              </div>
            </div>
            <div className="stat-card-green p-5 rounded-xl">
              <div className="flex items-center gap-2 text-sm font-medium opacity-80 mb-1">
                <BarChart3 className="h-4 w-4" />
                경기도 당일 득점
              </div>
              <div className="text-2xl font-bold">
                {formatOneDecimal(summary.ggTotal)}점
              </div>
            </div>
            <div className="stat-card-amber p-5 rounded-xl">
              <div className="flex items-center gap-2 text-sm font-medium opacity-80 mb-1">
                <Trophy className="h-4 w-4" />
                경기도 메달
              </div>
              <div className="text-2xl font-bold">
                <span className="medal-gold">{formatOneDecimal(summary.ggGold)}</span>
                {" / "}
                <span className="medal-silver">{formatOneDecimal(summary.ggSilver)}</span>
                {" / "}
                <span className="medal-bronze">{formatOneDecimal(summary.ggBronze)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">금 / 은 / 동</div>
            </div>
            <div className="stat-card-purple p-5 rounded-xl">
              <div className="flex items-center gap-2 text-sm font-medium opacity-80 mb-1">
                <Medal className="h-4 w-4" />
                경기도 메달 합계
              </div>
              <div className="text-2xl font-bold">
                {formatOneDecimal(summary.ggGold + summary.ggSilver + summary.ggBronze)}개
              </div>
            </div>
          </div>

          {/* Results table */}
          <div
            className="glass-card p-6 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {formatDate(selectedDate)} 경기 결과
            </h2>

            {sportGroups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                선택한 날짜에 기록된 결과가 없습니다.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-3 font-semibold min-w-[200px]">
                        종목 / 종별
                      </th>
                      <th className="text-left p-3 font-semibold min-w-[100px]">
                        세부종목
                      </th>
                      <th className="text-left p-3 font-semibold min-w-[80px]">
                        시도
                      </th>
                      <th className="text-right p-3 font-semibold">순위</th>
                      <th className="text-right p-3 font-semibold">득점</th>
                      <th className="text-right p-3 font-semibold">총점</th>
                      <th className="text-center p-3 font-semibold">금</th>
                      <th className="text-center p-3 font-semibold">은</th>
                      <th className="text-center p-3 font-semibold">동</th>
                      <th className="text-left p-3 font-semibold">신기록</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sportGroups.map((group) => {
                      const isExpanded = expandedSports.has(group.sportId);
                      const divisionCount = Object.keys(group.divisions).length;
                      const allResults = Object.values(group.divisions).flatMap(
                        (d) => d.results
                      );
                      const resultCount = allResults.length;

                      return (
                        <Fragment key={group.sportId}>
                          {/* Sport header row */}
                          <tr
                            className="border-b border-border/40 bg-accent/20 hover:bg-accent/30 cursor-pointer transition-colors"
                            onClick={() => toggleSport(group.sportId)}
                          >
                            <td className="p-3 font-semibold" colSpan={2}>
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-primary" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                {group.sportName}
                                <span className="text-xs text-muted-foreground">
                                  ({divisionCount}개 종별, {resultCount}건)
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              경기도
                            </td>
                            <td className="p-3" />
                            <td className="p-3 text-right font-semibold">
                              {group.ggTotalScore > 0
                                ? formatOneDecimal(group.ggTotalScore)
                                : "-"}
                            </td>
                            <td className="p-3" />
                            <td className="p-3 text-center medal-gold font-semibold">
                              {group.ggGold ? formatOneDecimal(group.ggGold) : "-"}
                            </td>
                            <td className="p-3 text-center medal-silver font-semibold">
                              {group.ggSilver ? formatOneDecimal(group.ggSilver) : "-"}
                            </td>
                            <td className="p-3 text-center medal-bronze font-semibold">
                              {group.ggBronze ? formatOneDecimal(group.ggBronze) : "-"}
                            </td>
                            <td className="p-3" />
                          </tr>

                          {/* Expanded: show division > results */}
                          {isExpanded &&
                            Object.values(group.divisions).map((div) => (
                              <Fragment
                                key={`${group.sportId}-${div.division}`}
                              >
                                {/* Division sub-header */}
                                <tr className="border-b border-border/20 bg-accent/5">
                                  <td
                                    className="p-2 pl-10"
                                    colSpan={10}
                                  >
                                    <span className="px-1.5 py-0.5 rounded text-xs bg-secondary font-medium">
                                      {div.division}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {div.results.length}건
                                    </span>
                                  </td>
                                </tr>

                                {/* Individual results sorted: Gyeonggi first, then by rank */}
                                {div.results
                                  .sort((a, b) => {
                                    // Gyeonggi first
                                    if (
                                      a.score.region_id ===
                                        GYEONGGI_REGION_ID &&
                                      b.score.region_id !==
                                        GYEONGGI_REGION_ID
                                    )
                                      return -1;
                                    if (
                                      a.score.region_id !==
                                        GYEONGGI_REGION_ID &&
                                      b.score.region_id ===
                                        GYEONGGI_REGION_ID
                                    )
                                      return 1;
                                    // Then by rank
                                    const ra = parseInt(a.score.rank || "99");
                                    const rb = parseInt(b.score.rank || "99");
                                    return ra - rb;
                                  })
                                  .map((r) => {
                                    const isGG =
                                      r.score.region_id ===
                                      GYEONGGI_REGION_ID;
                                    return (
                                      <tr
                                        key={r.score.id}
                                        className={`border-b border-border/10 hover:bg-accent/5 transition-colors ${
                                          isGG ? "bg-primary/5" : ""
                                        }`}
                                      >
                                        <td className="p-2 pl-14 text-xs text-muted-foreground" />
                                        <td className="p-2 text-xs">
                                          {r.eventName}
                                        </td>
                                        <td
                                          className={`p-2 text-xs ${
                                            isGG
                                              ? "font-bold text-primary"
                                              : ""
                                          }`}
                                        >
                                          {r.regionName}
                                        </td>
                                        <td className="p-2 text-right text-xs">
                                          {r.score.rank ? (
                                            <RankBadge
                                              rank={r.score.rank}
                                            />
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                        <td className="p-2 text-right text-xs">
                                          {r.score.actual_score != null
                                            ? formatOneDecimal(r.score.actual_score)
                                            : "-"}
                                        </td>
                                        <td className="p-2 text-right text-xs font-medium">
                                          {r.score.total_score != null
                                            ? formatOneDecimal(r.score.total_score)
                                            : "-"}
                                        </td>
                                        <td className="p-2 text-center text-xs">
                                          {(r.score.gold ?? 0) > 0 && (
                                            <span className="medal-gold font-bold">
                                              {formatOneDecimal(r.score.gold)}
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2 text-center text-xs">
                                          {(r.score.silver ?? 0) > 0 && (
                                            <span className="medal-silver font-bold">
                                              {formatOneDecimal(r.score.silver)}
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2 text-center text-xs">
                                          {(r.score.bronze ?? 0) > 0 && (
                                            <span className="medal-bronze font-bold">
                                              {formatOneDecimal(r.score.bronze)}
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2 text-xs">
                                          {r.score.record_type &&
                                            r.score.record_type !== "해당없음" && (
                                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-600">
                                                {r.score.record_type}
                                              </span>
                                            )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </Fragment>
                            ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* Rank badge component */
function RankBadge({ rank }: { rank: string }) {
  const num = parseInt(rank);
  if (num === 1)
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400/20 text-yellow-700">
        1위
      </span>
    );
  if (num === 2)
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-300/30 text-gray-600">
        2위
      </span>
    );
  if (num === 3)
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-600/15 text-amber-700">
        3위
      </span>
    );
  if (!isNaN(num))
    return <span className="text-muted-foreground">{num}위</span>;
  // Non-numeric rank (round_of_4 etc.)
  const labelMap: Record<string, string> = {
    round_of_4: "4강",
    round_of_8: "8강",
    round_of_16: "16강",
  };
  return (
    <span className="text-muted-foreground">
      {labelMap[rank] || rank}
    </span>
  );
}
