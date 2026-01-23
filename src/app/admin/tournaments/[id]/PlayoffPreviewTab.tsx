 "use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2Icon } from "lucide-react";
import { TournamentBracketV2 } from "@/components/tournament-bracket-v2";
import type { TournamentDTO } from "@/models/dto/tournament";

type PreviewMatch = {
  id: number;
  round: string;
  bracket_pos: number;
  team1_id: number | null;
  team2_id: number | null;
  source_team1: string | null;
  source_team2: string | null;
  match_date: string | null;
  start_time: string | null;
};

type PreviewResponse = {
  matches: PreviewMatch[];
  slotsNeeded: number;
  slotsAvailable: number;
  placeholdersUsed: boolean;
};

const fetchPreview = async (tournamentId: number) => {
  const response = await fetch(`/api/tournaments/${tournamentId}/playoff-preview`, {
    method: "POST",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to generate preview");
  }
  return response.json() as Promise<PreviewResponse>;
};

const roundOrder: Record<string, number> = {
  "16avos": 1,
  "octavos": 2,
  "cuartos": 3,
  "semifinal": 4,
  "final": 5,
};

function getRoundLabel(round: string) {
const labels: Record<string, string> = {
  "16avos": "16avos",
  "octavos": "Octavos",
  "cuartos": "Cuartos",
  "semifinal": "Semifinal",
  "final": "Final",
};
  return labels[round] || round;
}

export default function PlayoffPreviewTab({ tournament }: { tournament: Pick<TournamentDTO, "id"> }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tournament-playoff-preview", tournament.id],
    queryFn: () => fetchPreview(tournament.id),
    staleTime: 1000 * 30,
  });

  if (isLoading) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <Loader2Icon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-none shadow-none p-0">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Playoffs Preview</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : "No se pudo generar la vista previa de playoffs."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rounds = Array.from(new Set(data.matches.map((m) => m.round))).sort(
    (a, b) => (roundOrder[a] || 99) - (roundOrder[b] || 99)
  );

  const matchesByRound: Record<string, PreviewMatch[]> = {};
  data.matches.forEach((match) => {
    matchesByRound[match.round] = matchesByRound[match.round] || [];
    matchesByRound[match.round].push(match);
  });

  const bracketRounds = rounds.map((round, roundIdx) => ({
    title: getRoundLabel(round),
    seeds: matchesByRound[round].map((match) => {
      const seedId = match.id ?? roundIdx * 1000 + (match.bracket_pos || 0);
      const team1Name = match.team1_id ? match.source_team1 || `Equipo ${match.team1_id}` : match.source_team1 || "—";
      const team2Name = match.team2_id ? match.source_team2 || `Equipo ${match.team2_id}` : match.source_team2 || "—";
      const placeholderPattern = /^\d+[A-Z]$/;
      return {
        id: seedId,
        teams: [
          {
            name: team1Name,
            id: match.team1_id || null,
            isPlaceholder: !match.team1_id && !!match.source_team1,
          },
          {
            name: team2Name,
            id: match.team2_id || null,
            isPlaceholder: !match.team2_id && !!match.source_team2,
          },
        ],
        bracketPos: match.bracket_pos,
        matchDate: match.match_date,
        startTime: match.start_time,
      };
    }),
  }));

  return (
    <Card className="border-none shadow-none p-0">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Playoffs Preview</CardTitle>
        <CardDescription>
          Bracket preliminar generado con los equipos clasificados por grupo. Las etiquetas 1A/2B aparecen si la fase de grupos aún no finalizó.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-4 space-y-6">
        <TournamentBracketV2
          rounds={bracketRounds.map((round) => round.title)}
          matchesByRound={bracketRounds.reduce((acc, round, idx) => {
          acc[round.title] = round.seeds.map((seed) => ({
              id: seed.id,
              round: rounds[idx],
              bracketPos: seed.bracketPos ?? 0,
              team1: seed.teams[0].id ? { id: seed.teams[0].id, name: seed.teams[0].name } : null,
              team2: seed.teams[1].id ? { id: seed.teams[1].id, name: seed.teams[1].name } : null,
              sourceTeam1: seed.teams[0].name,
              sourceTeam2: seed.teams[1].name,
              matchDate: seed.matchDate || null,
              startTime: seed.startTime || null,
              isFinished: false,
            isPlaceholder1: seed.teams[0].isPlaceholder ?? false,
            isPlaceholder2: seed.teams[1].isPlaceholder ?? false,
            }));
            return acc;
          }, {} as Record<string, any[]>)}
        />
        <div className="text-sm text-muted-foreground">
          {data.placeholdersUsed ? (
            <p>Algunos equipos se muestran como 1A/2B porque la fase de grupos aún no concluyó.</p>
          ) : (
            <p>Todos los equipos ya están asignados.</p>
          )}
          <p>
            Slots necesarios: {data.slotsNeeded} / disponibles: {data.slotsAvailable || "sin configuración"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
