import Link from "next/link";

import { StatusScreen } from "@/components/shell/status-screen";
import { buttonVariants } from "@/components/ui/button";

/** notFound() inside owner pages (an unknown repo ID, say) keeps the shell around it. */
export default function OwnerNotFound() {
  return (
    <StatusScreen
      code="404"
      title="Not found"
      actions={
        <Link href="/repositories" className={buttonVariants()}>
          Back to Repositories
        </Link>
      }
    >
      This repository isn&apos;t connected, or the link is wrong.
    </StatusScreen>
  );
}
