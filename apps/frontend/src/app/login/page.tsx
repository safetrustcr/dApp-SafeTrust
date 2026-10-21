import Login from "@/components/auth/Login";
import { safeNextPath } from "@/lib/routes";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  return <Login nextPath={safeNextPath(searchParams?.next)} />;
}
