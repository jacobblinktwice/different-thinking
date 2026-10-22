import { redirect } from "next/navigation";

/* The glitch lab now lives in the brand guidelines (public/guidelines): everyone can
   edit and export there, and admins unlock version history, Save, Push live and the
   full per-effect editor with the same LAB_KEY this page used. Old links land there. */
export default function Lab() {
  redirect("/guidelines");
}
