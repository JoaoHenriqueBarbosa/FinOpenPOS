export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePlayoffs, type PlayoffMatch } from "@/lib/tournament-playoffs";
import type { ScheduleConfig, ScheduleDay } from "@/models/dto/tournament";
import type { TournamentMatch } from "@/models/db/tournament";

type RouteParams = { params: { id: string } };

type MatchRow = Pick<
  TournamentMatch,
  | "id"
  | "tournament_group_id"
  | "team1_id"
  | "team2_id"
  | "team1_sets"
  | "team2_sets"
  | "team1_games_total"
  | "team2_games_total"
  | "status"
>;

type PlayoffPreviewMatch = PlayoffMatch & {
  match_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  court_id?: number | null;
};

type PreviewResponse = {
  matches: PlayoffPreviewMatch[];
  slotsNeeded: number;
  slotsAvailable: number;
  placeholdersUsed: boolean;
};

function generateTimeSlots(
  days: ScheduleDay[],
  matchDuration: number,
  numCourts: number
): Array<{ date: string; startTime: string; endTime: string }> {
  const slots: Array<{ date: string; startTime: string; endTime: string }> = [];

  days.forEach((day) => {
    const [startH, startM] = day.startTime.split(":").map(Number);
    const [endH, endM] = day.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let currentMinutes = startMinutes;
    while (currentMinutes + matchDuration <= endMinutes) {
      const slotStartH = Math.floor(currentMinutes / 60);
      const slotStartM = currentMinutes % 60;
      const slotEndMinutes = currentMinutes + matchDuration;
      const slotEndH = Math.floor(slotEndMinutes / 60);
      const slotEndM = slotEndMinutes % 60;

      for (let i = 0; i < numCourts; i++) {
        slots.push({
          date: day.date,
          startTime: `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`,
          endTime: `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`,
        });
      }

      currentMinutes += matchDuration;
    }
  });

  return slots;
}

function buildStandings(matches: MatchRow[]): Map<number, Map<number, any>> {
  type Stand = {
    team_id: number;
    matches_played: number;
    wins: number;
    losses: number;
    sets_won: number;
    sets_lost: number;
    games_won: number;
    games_lost: number;
  };

  const standingsMap = new Map<number, Map<number, Stand>>();
  const initStand = (teamId: number): Stand => ({
    team_id: teamId,
    matches_played: 0,
    wins: 0,
    losses: 0,
    sets_won: 0,
    sets_lost: 0,
    games_won: 0,
    games_lost: 0,
  });

  matches.forEach((m) => {
    if (m.status !== "finished") return;
    const gid = m.tournament_group_id;
    if (!gid) return;
    if (!standingsMap.has(gid)) {
      standingsMap.set(gid, new Map());
    }
    const map = standingsMap.get(gid)!;

    if (m.team1_id && !map.has(m.team1_id)) {
      map.set(m.team1_id, initStand(m.team1_id));
    }
    if (m.team2_id && !map.has(m.team2_id)) {
      map.set(m.team2_id, initStand(m.team2_id));
    }

    if (!m.team1_id || !m.team2_id) return;
    const s1 = map.get(m.team1_id)!;
    const s2 = map.get(m.team2_id)!;

    s1.matches_played += 1;
    s2.matches_played += 1;

    const t1sets = m.team1_sets ?? 0;
    const t2sets = m.team2_sets ?? 0;
    const t1games = m.team1_games_total ?? 0;
    const t2games = m.team2_games_total ?? 0;

    s1.sets_won += t1sets;
    s1.sets_lost += t2sets;
    s2.sets_won += t2sets;
    s2.sets_lost += t1sets;

    s1.games_won += t1games;
    s1.games_lost += t2games;
    s2.games_won += t2games;
    s2.games_lost += t1games;

    if (t1sets > t2sets) {
      s1.wins += 1;
      s2.losses += 1;
    } else if (t2sets > t1sets) {
      s2.wins += 1;
      s1.losses += 1;
    }
  });

  return standingsMap;
}

function computeQualifiedTeams(
  groups: Array<{ id: number; group_order: number | null }>,
  groupTeams: Array<{ tournament_group_id: number; team_id: number }>,
  standingsMap: Map<number, Map<number, any>>
) {
  type QualifiedTeam = { team_id: number; from_group_id: number; pos: number };
  const qualified: QualifiedTeam[] = [];
  const letterMap = new Map<number, string>();

  groups.forEach((group, index) => {
    const letter = group.group_order
      ? String.fromCharCode(64 + group.group_order)
      : String.fromCharCode(65 + index);
    letterMap.set(group.id, letter);

    const groupTeamIds = groupTeams
      .filter((gt) => gt.tournament_group_id === group.id)
      .map((gt) => gt.team_id);

    const stats = groupTeamIds.map((tid) => {
      const map = standingsMap.get(group.id);
      return map?.get(tid) ?? {
        team_id: tid,
        matches_played: 0,
        wins: 0,
        losses: 0,
        sets_won: 0,
        sets_lost: 0,
        games_won: 0,
        games_lost: 0,
      };
    });

    stats.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const aSetDiff = a.sets_won - a.sets_lost;
      const bSetDiff = b.sets_won - b.sets_lost;
      if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
      const aGameDiff = a.games_won - a.games_lost;
      const bGameDiff = b.games_won - b.games_lost;
      return bGameDiff - aGameDiff;
    });

    const size = stats.length;
    let qualifiersCount = size === 4 ? 3 : 2;

    stats.slice(0, qualifiersCount).forEach((s, idx) => {
      qualified.push({
        team_id: s.team_id,
        from_group_id: group.id,
        pos: idx + 1,
      });
    });
  });

  const placeholderMap = new Map<number, string>();
  qualified.forEach((qt) => {
    const letter = letterMap.get(qt.from_group_id) ?? "A";
    placeholderMap.set(qt.team_id, `${qt.pos}${letter}`);
  });

  return { qualified, placeholderMap };
}

function applyPlaceholders(
  matches: PlayoffPreviewMatch[],
  placeholderMap: Map<number, string>,
  disableTeams: boolean
) {
  if (!disableTeams) return null;

  const roundOrder: Record<string, number> = {
    "16avos": 1,
    "octavos": 2,
    "cuartos": 3,
    "semifinal": 4,
    "final": 5,
  };

  const minRoundValue = matches.reduce((minValue, match) => {
    const value = roundOrder[match.round] ?? 999;
    return Math.min(minValue, value);
  }, Infinity);

  matches
    .filter((match) => (roundOrder[match.round] ?? 999) === minRoundValue)
    .forEach((match) => {
      if (match.team1_id) {
        match.source_team1 = placeholderMap.get(match.team1_id) ?? match.source_team1;
        match.team1_id = null;
      }
      if (match.team2_id) {
        match.source_team2 = placeholderMap.get(match.team2_id) ?? match.source_team2;
        match.team2_id = null;
      }
    });

  return minRoundValue;
}

function assignTimeSlots(
  matches: PlayoffPreviewMatch[],
  scheduleConfig?: ScheduleConfig
): { slotsNeeded: number; slotsAvailable: number } {
  if (!scheduleConfig || scheduleConfig.days.length === 0 || scheduleConfig.courtIds.length === 0) {
    return { slotsNeeded: 0, slotsAvailable: 0 };
  }

  const timeSlots = generateTimeSlots(
    scheduleConfig.days,
    scheduleConfig.matchDuration,
    scheduleConfig.courtIds.length
  );

  const matchIndices = matches.map((_, index) => index);
  matchIndices.sort((a, b) => {
    const roundOrder: Record<string, number> = {
      "16avos": 1,
      "octavos": 2,
      "cuartos": 3,
      "semifinal": 4,
      "final": 5,
    };
    const matchA = matches[a];
    const matchB = matches[b];
    const aOrder = roundOrder[matchA.round] ?? 999;
    const bOrder = roundOrder[matchB.round] ?? 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (matchA.bracket_pos ?? 0) - (matchB.bracket_pos ?? 0);
  });

  let slotIndex = 0;
  let slotsNeeded = 0;

  matchIndices.forEach((originalIndex) => {
    const match = matches[originalIndex];
    const needsSchedule =
      (match.team1_id && match.team2_id) ||
      Boolean(match.source_team1) ||
      Boolean(match.source_team2);
    if (!needsSchedule) return;
    slotsNeeded += 1;
    if (slotIndex >= timeSlots.length) {
      throw new Error(`No hay suficientes slots disponibles. Se necesitan al menos ${slotsNeeded} slots.`);
    }
    const slot = timeSlots[slotIndex];
    match.match_date = slot.date;
    match.start_time = slot.startTime;
    match.end_time = slot.endTime;
    const courtIndex = slotIndex % scheduleConfig.courtIds.length;
    match.court_id = scheduleConfig.courtIds[courtIndex];
    slotIndex += 1;
  });

  return { slotsNeeded, slotsAvailable: timeSlots.length };
}

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournamentId = Number(params.id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const scheduleConfig: ScheduleConfig | undefined = body.days
    ? {
        days: body.days,
        matchDuration: body.matchDuration || 60,
        courtIds: body.courtIds || [],
      }
    : undefined;

  const { data: groups, error: groupsError } = await supabase
    .from("tournament_groups")
    .select("id, group_order")
    .eq("tournament_id", tournamentId)
    .order("group_order", { ascending: true });

  if (groupsError || !groups || groups.length === 0) {
    return NextResponse.json({ error: "No groups found" }, { status: 400 });
  }

  const groupIds = groups.map((g) => g.id);

  const { data: groupTeams, error: groupTeamsError } = await supabase
    .from("tournament_group_teams")
    .select("tournament_group_id, team_id")
    .in("tournament_group_id", groupIds);

  if (groupTeamsError || !groupTeams) {
    console.error("Error fetching group teams:", groupTeamsError);
    return NextResponse.json({ error: "Failed to fetch group teams" }, { status: 500 });
  }

  const { data: matches, error: matchesError } = await supabase
    .from("tournament_matches")
    .select(
      "id, tournament_group_id, team1_id, team2_id, team1_sets, team2_sets, team1_games_total, team2_games_total, status"
    )
    .eq("tournament_id", tournamentId)
    .eq("phase", "group");

  if (matchesError || !matches) {
    console.error("Error fetching matches:", matchesError);
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }

  const standingsMap = buildStandings(matches as MatchRow[]);
  const { qualified, placeholderMap } = computeQualifiedTeams(groups, groupTeams, standingsMap);

  if (qualified.length < 2) {
    return NextResponse.json({ error: "Not enough qualified teams for playoffs" }, { status: 400 });
  }

  const groupOrderMap = new Map<number, number>();
  groups.forEach((group) => {
    groupOrderMap.set(group.id, group.group_order ?? 999);
  });

  const allMatches = generatePlayoffs(qualified, groupOrderMap);
  const allMatchesWithSchedule = allMatches.map((match) => ({
    ...match,
    match_date: null,
    start_time: null,
    end_time: null,
    court_id: null,
  })) as PlayoffPreviewMatch[];

  const allGroupMatchesFinished = matches.every((m) => m.status === "finished");
  const minRoundValue = applyPlaceholders(allMatchesWithSchedule, placeholderMap, !allGroupMatchesFinished);

  if (minRoundValue !== null) {
    const roundOrder: Record<string, number> = {
      "16avos": 1,
      "octavos": 2,
      "cuartos": 3,
      "semifinal": 4,
      "final": 5,
    };
    allMatchesWithSchedule.forEach((match) => {
      const value = roundOrder[match.round] ?? 999;
      if (value > minRoundValue) {
        match.team1_id = null;
        match.source_team1 = null;
      }
      if (value > minRoundValue) {
        match.team2_id = null;
        match.source_team2 = null;
      }
    });
  }

  let slotsNeeded = 0;
  let slotsAvailable = 0;
  try {
    const slotInfo = assignTimeSlots(allMatchesWithSchedule, scheduleConfig);
    slotsNeeded = slotInfo.slotsNeeded;
    slotsAvailable = slotInfo.slotsAvailable;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error assigning slots" }, { status: 400 });
  }

  const response: PreviewResponse = {
    matches: allMatchesWithSchedule,
    slotsNeeded,
    slotsAvailable,
    placeholdersUsed: !allGroupMatchesFinished,
  };

  return NextResponse.json(response);
}
