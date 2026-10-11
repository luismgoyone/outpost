import Link from "next/link";

import { StatusScreen } from "@/components/shell/status-screen";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Not found · Outpost" };

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="Page not found"
      actions={
        <Link href="/my-work" className={buttonVariants()}>
          Go to My Work
        </Link>
      }
    >
      Nothing lives at this address. It may have moved, or the repository was disconnected.
    </StatusScreen>
  );
}
