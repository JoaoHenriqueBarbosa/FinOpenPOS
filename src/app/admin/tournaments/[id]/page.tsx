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
import { Loader2Icon } from "lucide-react";
import TeamsTab from "./TeamsTab";
import GroupsTab from "./GroupsTab";
import PlayoffsTab from "./PlayoffsTab";

type Tournament = {
  id: number;
  name: string;
  category: string | null;
  status: string;
};

export default function TournamentDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

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
        <Tabs defaultValue="teams">
          <TabsList>
            <TabsTrigger value="teams">Equipos</TabsTrigger>
            <TabsTrigger value="groups">Fase de grupos</TabsTrigger>
            <TabsTrigger value="playoffs">Playoffs</TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="pt-4">
            <TeamsTab tournament={tournament} />
          </TabsContent>

          <TabsContent value="groups" className="pt-4">
            <GroupsTab tournament={tournament} />
          </TabsContent>

          <TabsContent value="playoffs" className="pt-4">
            <PlayoffsTab tournament={tournament} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
