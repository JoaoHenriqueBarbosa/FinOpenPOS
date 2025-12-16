"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import GroupsTab from "./GroupsTab";
import StandingsTab from "./StandingsTab";
import PlayoffsTab from "./PlayoffsTab";
import PlayoffsViewTab from "./PlayoffsViewTab";
import type { TournamentDTO } from "@/models/dto/tournament";

export default function TournamentDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [tournament, setTournament] = useState<TournamentDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("teams");

  useEffect(() => {
    if (!id || Number.isNaN(id)) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/tournaments/${id}`);
        if (!res.ok) throw new Error("Failed to fetch tournament");
        const data = await res.json();
        setTournament(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (!id || Number.isNaN(id)) {
    return <div>Invalid tournament id</div>;
  }

  if (loading || !tournament) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="h-10 w-10 animate-spin" />
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
                <TabsTrigger value="teams">Equipos</TabsTrigger>
                <TabsTrigger value="groups">Fase de grupos</TabsTrigger>
                <TabsTrigger value="playoffs">Playoffs</TabsTrigger>
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
              </TabsList>
            </div>
          </div>

          {/* Solo renderizar el tab activo para evitar cargas innecesarias */}
          {activeTab === "teams" && (
            <TabsContent value="teams" className="pt-4">
              <TeamsTab tournament={tournament} />
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
        </Tabs>
      </CardContent>
    </Card>
  );
}
