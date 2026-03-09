import { redirect } from "next/navigation";

export default function Home() {
  if (process.env.LANDING_URL) {
    redirect(process.env.LANDING_URL);
  }
  redirect("/login");
}
