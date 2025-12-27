"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Loader2Icon, EditIcon, EyeIcon } from "lucide-react";
import TeamsTab from "./TeamsTab";
import ScheduleReviewTab from "./ScheduleReviewTab";
import GroupsTab from "./GroupsTab";
import StandingsTab from "./StandingsTab";
import PlayoffsTab from "./PlayoffsTab";
import PlayoffsViewTab from "./PlayoffsViewTab";
import ShareGroupScheduleTab from "./ShareGroupScheduleTab";
import type { TournamentDTO } from "@/models/dto/tournament";
import { tournamentsService } from "@/services";

async function fetchTournament(id: number): Promise<TournamentDTO> {
  return tournamentsService.getById(id);
}

export default function TournamentDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [activeTab, setActiveTab] = useState<string>("teams");

  const {
    data: tournament,
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ["tournament", id],
    queryFn: () => fetchTournament(id),
    enabled: !!id && !Number.isNaN(id),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  if (!id || Number.isNaN(id)) {
    return <div>Invalid tournament id</div>;
  }

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (isError || !tournament) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <div>Error al cargar el torneo</div>
      </div>
    );
  }

  return (
    <Card className="p-4 flex flex-col gap-4">
      <CardHeader className="p-0">
        <CardTitle>
          {tournament.name}{" "}
          <span className="text-xs text-muted-foreground">
            {tournament.category ?? "Sin categoría"} • {tournament.status}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="space-y-3">
            {/* Sección de edición */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-1">
                <EditIcon className="h-3 w-3" />
                <span>Edición</span>
              </div>
              <TabsList className="w-full justify-start">
                <TabsTrigger 
                  value="teams"
                  disabled={tournament.status !== "draft"}
                >
                  Inscripción
                </TabsTrigger>
                <TabsTrigger 
                  value="schedule-review" 
                  disabled={tournament.status !== "schedule_review"}
                >
                  Revisión de horarios
                </TabsTrigger>
                <TabsTrigger 
                  value="groups" 
                  disabled={tournament.status !== "in_progress"}
                >
                  Fase de grupos
                </TabsTrigger>
                <TabsTrigger 
                  value="playoffs" 
                  disabled={tournament.status !== "in_progress"}
                >
                  Playoffs
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Sección de vista */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-1">
                <EyeIcon className="h-3 w-3" />
                <span>Vista</span>
              </div>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="standings">Tabla de posiciones</TabsTrigger>
                <TabsTrigger value="playoffs-view">Vista de playoffs</TabsTrigger>
                <TabsTrigger value="share-schedule">Compartir horarios</TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Solo renderizar el tab activo para evitar cargas innecesarias */}
          {activeTab === "teams" && (
            <TabsContent value="teams" className="pt-4">
              <TeamsTab tournament={tournament} />
            </TabsContent>
          )}

          {activeTab === "schedule-review" && (
            <TabsContent value="schedule-review" className="pt-4">
              <ScheduleReviewTab tournament={tournament} />
            </TabsContent>
          )}

          {activeTab === "groups" && (
            <TabsContent value="groups" className="pt-4">
              <GroupsTab tournament={tournament} />
            </TabsContent>
          )}

          {activeTab === "standings" && (
            <TabsContent value="standings" className="pt-4">
              <StandingsTab tournament={tournament} />
            </TabsContent>
          )}

          {activeTab === "playoffs" && (
            <TabsContent value="playoffs" className="pt-4">
              <PlayoffsTab tournament={tournament} />
            </TabsContent>
          )}

          {activeTab === "playoffs-view" && (
            <TabsContent value="playoffs-view" className="pt-4">
              <PlayoffsViewTab tournament={tournament} />
            </TabsContent>
          )}

          {activeTab === "share-schedule" && (
            <TabsContent value="share-schedule" className="pt-4">
              <ShareGroupScheduleTab tournament={tournament} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
